#!/usr/bin/env bash
###############################################################################
# One-shot helper: sync a locally-installed system PostgreSQL with the
# credentials in backend/.env.
#
# Reads POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB from .env, then:
#   1. Creates the user if it doesn't exist
#   2. Sets/rotates the user's password to match .env
#   3. Creates the database if missing and grants ownership
#   4. Probes a connection with the .env credentials to verify
#
# Requires: sudo access to the `postgres` OS user. The script will prompt
# for sudo password once.
#
# Idempotent — safe to re-run after rotating POSTGRES_PASSWORD in .env.
###############################################################################
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "[fatal] $ENV_FILE not found — copy .env.example first" >&2
    exit 1
fi

# Pull the three values out of .env without `source`-ing the whole file
# (avoids accidentally exporting stray vars).
PG_USER=$(grep -E '^POSTGRES_USER=' "$ENV_FILE" | head -1 | cut -d= -f2-)
PG_PASS=$(grep -E '^POSTGRES_PASSWORD=' "$ENV_FILE" | head -1 | cut -d= -f2-)
PG_DB=$(grep -E '^POSTGRES_DB=' "$ENV_FILE" | head -1 | cut -d= -f2-)

if [[ -z "$PG_USER" || -z "$PG_PASS" || -z "$PG_DB" ]]; then
    echo "[fatal] One of POSTGRES_USER / POSTGRES_PASSWORD / POSTGRES_DB is empty in .env" >&2
    exit 1
fi

if [[ "$PG_PASS" == CHANGE_ME* ]]; then
    echo "[fatal] POSTGRES_PASSWORD is still a CHANGE_ME placeholder — fix .env first" >&2
    exit 1
fi

echo "[setup_local_pg] target user: $PG_USER   db: $PG_DB"
echo "[setup_local_pg] (password not shown)"
echo "[setup_local_pg] sudo prompt may appear once for postgres-superuser access"

# Escape single quotes inside the password for the SQL literal.
# (Doubled '' is the standard PostgreSQL single-quote escape.)
SAFE_PASS="${PG_PASS//\'/\'\'}"

# ----- 1. Ensure role exists with the right password -----
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '$PG_USER') THEN
        CREATE ROLE "$PG_USER" WITH LOGIN PASSWORD '$SAFE_PASS';
        RAISE NOTICE 'Created role %', '$PG_USER';
    ELSE
        ALTER ROLE "$PG_USER" WITH LOGIN PASSWORD '$SAFE_PASS';
        RAISE NOTICE 'Rotated password for role %', '$PG_USER';
    END IF;
END
\$\$;
SQL

# ----- 2. Ensure database exists, owned by that role -----
DB_EXISTS=$(sudo -u postgres psql -tAc \
    "SELECT 1 FROM pg_database WHERE datname='$PG_DB'")
if [[ "$DB_EXISTS" != "1" ]]; then
    sudo -u postgres psql -v ON_ERROR_STOP=1 \
        -c "CREATE DATABASE \"$PG_DB\" OWNER \"$PG_USER\";"
    echo "[setup_local_pg] created database $PG_DB"
else
    sudo -u postgres psql -v ON_ERROR_STOP=1 \
        -c "ALTER DATABASE \"$PG_DB\" OWNER TO \"$PG_USER\";"
    echo "[setup_local_pg] database $PG_DB already exists (owner refreshed)"
fi

# ----- 3. Grant blanket privileges on the public schema so migrations + ORM
#         writes work without later GRANT churn.
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$PG_DB" <<SQL
GRANT ALL PRIVILEGES ON SCHEMA public TO "$PG_USER";
ALTER SCHEMA public OWNER TO "$PG_USER";
SQL

# ----- 4. Smoke-test the credentials as the .env-configured user -----
# psql's PGPASSWORD env keeps the password out of process args (which `ps`
# would expose).
if PGPASSWORD="$PG_PASS" psql -h 127.0.0.1 -U "$PG_USER" -d "$PG_DB" \
        -c "SELECT current_user, current_database();" >/dev/null 2>&1; then
    echo "[setup_local_pg] ✓ login as '$PG_USER' to '$PG_DB' succeeded"
else
    echo "[setup_local_pg] ✗ login probe failed — check pg_hba.conf allows" \
         "md5/scram-sha-256 for 127.0.0.1" >&2
    exit 1
fi

echo
echo "[setup_local_pg] done — re-run ./deploy.sh now"
