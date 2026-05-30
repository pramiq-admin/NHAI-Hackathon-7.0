#!/usr/bin/env bash
###############################################################################
# NHAI backend deploy script.
#
# Idempotent. Re-running is safe — each step skips work it's already done:
#
#   1. Sanity: required tools present (pm2, python3.11+, postgres reachable)
#   2. Pull latest code (only if `--pull` flag passed)
#   3. Create/refresh the Python virtualenv at backend/.venv
#   4. Install backend deps from pyproject.toml
#   5. Run alembic migrations
#   6. (Optional, --seed) run scripts/seed_demo_data.py
#   7. Start or zero-downtime-reload the API under PM2
#   8. Run a /healthz probe and bail if it fails
#   9. Print PM2 status + recent logs
#
# Usage:
#   ./deploy.sh                    # standard deploy (use current code)
#   ./deploy.sh --pull             # also `git pull` before installing
#   ./deploy.sh --env production   # production env (validates secrets)
#   ./deploy.sh --seed             # also run demo seeder
#   ./deploy.sh --reset            # `pm2 delete nhai-api` first, full restart
#   ./deploy.sh --skip-migrations  # skip alembic upgrade head
#
# Exit codes:
#   0 success
#   1 pre-flight failure (missing tool, missing .env, etc.)
#   2 dependency install failed
#   3 alembic migration failed
#   4 PM2 failed to start or reload
#   5 healthcheck failed
###############################################################################
set -Eeuo pipefail

#─── Config ──────────────────────────────────────────────────────────────────#
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
VENV_DIR="$BACKEND_DIR/.venv"
LOG_DIR="$BACKEND_DIR/logs"
PM2_APP_NAME="nhai-api"
ECOSYSTEM="$REPO_ROOT/ecosystem.config.js"
HEALTHCHECK_URL="http://127.0.0.1:8000/api/v1/healthz"
HEALTHCHECK_RETRIES=15
HEALTHCHECK_SLEEP=1
PYTHON_BIN="${PYTHON_BIN:-python3}"

# Flags (defaults)
DO_PULL=0
ENV_NAME="dev"
DO_SEED=0
DO_RESET=0
SKIP_MIGRATIONS=0

#─── Colours ─────────────────────────────────────────────────────────────────#
if [[ -t 1 ]]; then
  RED=$'\033[0;31m'; GRN=$'\033[0;32m'; YLW=$'\033[1;33m'; BLU=$'\033[0;34m'; RST=$'\033[0m'
else
  RED=""; GRN=""; YLW=""; BLU=""; RST=""
fi
info()  { echo "${BLU}[deploy]${RST} $*"; }
ok()    { echo "${GRN}[ok]${RST}     $*"; }
warn()  { echo "${YLW}[warn]${RST}   $*"; }
fail()  { echo "${RED}[fail]${RST}   $*" >&2; }
die()   { fail "$@"; exit "${2:-1}"; }

#─── Trap ────────────────────────────────────────────────────────────────────#
trap 'fail "deploy aborted at line ${LINENO}"' ERR

#─── Argparse ────────────────────────────────────────────────────────────────#
while [[ $# -gt 0 ]]; do
  case "$1" in
    --pull)             DO_PULL=1; shift ;;
    --env)              ENV_NAME="${2:-dev}"; shift 2 ;;
    --seed)             DO_SEED=1; shift ;;
    --reset)            DO_RESET=1; shift ;;
    --skip-migrations)  SKIP_MIGRATIONS=1; shift ;;
    -h|--help)
      sed -n '/^# Usage:/,/^# Exit codes:/p' "$0" | sed 's/^# \{0,1\}//'
      exit 0
      ;;
    *) die "unknown flag: $1" 1 ;;
  esac
done

info "repo:        $REPO_ROOT"
info "backend:     $BACKEND_DIR"
info "env:         $ENV_NAME"
info "pull:        $DO_PULL  seed: $DO_SEED  reset: $DO_RESET  skip-mig: $SKIP_MIGRATIONS"

#─── 1. Pre-flight ───────────────────────────────────────────────────────────#
info "step 1/9 — pre-flight checks"

command -v pm2 >/dev/null 2>&1 || die "pm2 not installed (npm i -g pm2)" 1
command -v "$PYTHON_BIN" >/dev/null 2>&1 || die "$PYTHON_BIN not found" 1
PY_VER=$("$PYTHON_BIN" -c 'import sys; print(f"{sys.version_info[0]}.{sys.version_info[1]}")')
if ! "$PYTHON_BIN" -c 'import sys; sys.exit(0 if sys.version_info >= (3, 11) else 1)'; then
  die "python >= 3.11 required (got $PY_VER)" 1
fi

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  if [[ "$ENV_NAME" == "production" ]]; then
    die "backend/.env missing — copy from backend/.env.example and fill secrets" 1
  fi
  warn "backend/.env missing — using built-in defaults (dev only)"
fi

# In production, refuse to continue if any placeholder is still in .env.
if [[ "$ENV_NAME" == "production" && -f "$BACKEND_DIR/.env" ]]; then
  if grep -E '^[A-Z_]+=CHANGE_ME' "$BACKEND_DIR/.env" >/dev/null; then
    fail "backend/.env contains CHANGE_ME placeholders:"
    grep -E '^[A-Z_]+=CHANGE_ME' "$BACKEND_DIR/.env" | sed 's/^/        /' >&2
    exit 1
  fi
fi

mkdir -p "$LOG_DIR"
ok "pre-flight passed (python $PY_VER, pm2 $(pm2 -v))"

#─── 2. Pull (optional) ──────────────────────────────────────────────────────#
if [[ "$DO_PULL" -eq 1 ]]; then
  info "step 2/9 — git pull"
  ( cd "$REPO_ROOT" && git pull --ff-only )
  ok "pulled"
else
  info "step 2/9 — skipping git pull (use --pull to enable)"
fi

#─── 3. Virtualenv ───────────────────────────────────────────────────────────#
info "step 3/9 — python virtualenv"
if [[ ! -d "$VENV_DIR" ]]; then
  "$PYTHON_BIN" -m venv "$VENV_DIR"
  ok "created venv at $VENV_DIR"
fi
# shellcheck disable=SC1091
source "$VENV_DIR/bin/activate"
ok "venv active ($(python -V))"

#─── 4. Install deps ─────────────────────────────────────────────────────────#
info "step 4/9 — install backend dependencies"
pip install --quiet --upgrade pip >/dev/null || die "pip upgrade failed" 2
( cd "$BACKEND_DIR" && pip install --quiet -e . ) || die "pip install failed" 2
ok "dependencies installed"

#─── 5. Migrations ───────────────────────────────────────────────────────────#
if [[ "$SKIP_MIGRATIONS" -eq 1 ]]; then
  info "step 5/9 — skipping alembic (per --skip-migrations)"
else
  info "step 5/9 — alembic upgrade head"
  ( cd "$BACKEND_DIR" && alembic upgrade head ) || die "alembic upgrade failed" 3
  ok "migrations up to date"
fi

#─── 6. Seed (optional) ──────────────────────────────────────────────────────#
if [[ "$DO_SEED" -eq 1 ]]; then
  info "step 6/9 — seeding demo data"
  ( cd "$BACKEND_DIR" && python scripts/seed_demo_data.py ) || warn "seed script reported non-zero"
  ok "seed complete"
else
  info "step 6/9 — skipping seed (use --seed to enable)"
fi

#─── 7. PM2 start / reload ───────────────────────────────────────────────────#
info "step 7/9 — PM2 start/reload"
if [[ "$DO_RESET" -eq 1 ]]; then
  if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
    info "  --reset: deleting existing $PM2_APP_NAME process"
    pm2 delete "$PM2_APP_NAME" >/dev/null
  fi
fi

if pm2 describe "$PM2_APP_NAME" >/dev/null 2>&1; then
  # Zero-downtime reload (uvicorn workers picked up new code on next request).
  pm2 reload "$ECOSYSTEM" --only "$PM2_APP_NAME" --update-env \
    --env "$ENV_NAME" || die "pm2 reload failed" 4
  ok "$PM2_APP_NAME reloaded"
else
  pm2 start "$ECOSYSTEM" --only "$PM2_APP_NAME" \
    --env "$ENV_NAME" || die "pm2 start failed" 4
  ok "$PM2_APP_NAME started"
fi

# Persist PM2 process list so it survives a server reboot. `pm2 startup` is
# idempotent — it prints a one-time sudo command if not already set up; we
# don't auto-execute that (needs sudo, varies by init system).
pm2 save >/dev/null
if ! pm2 startup --silent 2>/dev/null | grep -q 'already'; then
  warn "PM2 boot persistence not yet enabled — run \`pm2 startup\` once as root"
fi

#─── 8. Healthcheck ──────────────────────────────────────────────────────────#
info "step 8/9 — healthcheck $HEALTHCHECK_URL"
healthy=0
for i in $(seq 1 "$HEALTHCHECK_RETRIES"); do
  if curl -fsS --max-time 2 "$HEALTHCHECK_URL" >/dev/null 2>&1; then
    healthy=1
    break
  fi
  sleep "$HEALTHCHECK_SLEEP"
done
if [[ "$healthy" -ne 1 ]]; then
  fail "healthcheck failed after ${HEALTHCHECK_RETRIES}s — recent logs:"
  pm2 logs "$PM2_APP_NAME" --lines 30 --nostream || true
  exit 5
fi
ok "healthcheck passed"

#─── 9. Status ───────────────────────────────────────────────────────────────#
info "step 9/9 — status"
pm2 status
echo
info "tail last 10 lines of API log:"
pm2 logs "$PM2_APP_NAME" --lines 10 --nostream || true
echo
ok "deploy complete ✓"
echo
echo "Next:"
echo "  pm2 logs $PM2_APP_NAME           # follow logs"
echo "  pm2 monit                        # live dashboard"
echo "  ./deploy.sh                      # zero-downtime re-deploy"
echo "  ./deploy.sh --env production     # production-mode re-deploy"
