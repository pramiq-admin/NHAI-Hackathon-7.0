"""Alembic environment.

The app uses asyncpg at runtime (FastAPI + SQLAlchemy async); alembic
migrations are sync-only, so we rewrite the DATABASE_URL driver from
`+asyncpg` → `+psycopg2` before handing it to `engine_from_config`.
"""
import os
import sys
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from alembic import context

# this is the Alembic Config object, which provides access to the values
# within the .ini file in use.
config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Make `app.*` imports resolvable from anywhere we run alembic
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))


# Load DATABASE_URL from .env (deploy.sh exports it; for ad-hoc runs we also
# fall back to reading the file directly so `alembic upgrade head` works even
# without a parent shell that sourced .env).
def _load_dotenv_if_present() -> None:
    env_path = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),  # backend/
        ".env",
    )
    if not os.path.exists(env_path):
        return
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            # Don't overwrite values already in env (CI / explicit overrides win)
            os.environ.setdefault(k.strip(), v.strip())


_load_dotenv_if_present()


def _compose_db_url_from_parts() -> str | None:
    """If DATABASE_URL isn't set, build one from POSTGRES_* parts. Mirrors the
    same convenience the app's `config.py` exposes — saves users from having
    to maintain two copies of the same password."""
    user = os.environ.get("POSTGRES_USER")
    password = os.environ.get("POSTGRES_PASSWORD")
    db = os.environ.get("POSTGRES_DB")
    host = os.environ.get("POSTGRES_HOST", "localhost")
    port = os.environ.get("POSTGRES_PORT", "5432")
    if not (user and password and db):
        return None
    from urllib.parse import quote_plus
    # URL-encode password — `!`, `@`, `:`, `/` in a generated secret would
    # otherwise corrupt the URL.
    return (
        f"postgresql+asyncpg://{quote_plus(user)}:{quote_plus(password)}"
        f"@{host}:{port}/{quote_plus(db)}"
    )


# Read URL from env (explicit), or compose from POSTGRES_* parts, or fall back
# to whatever alembic.ini had (blank by default).
db_url = (
    os.environ.get("DATABASE_URL")
    or _compose_db_url_from_parts()
    or config.get_main_option("sqlalchemy.url")
    or ""
)
if not db_url:
    raise RuntimeError(
        "DATABASE_URL is unset and POSTGRES_USER/PASSWORD/DB are not all set "
        "either. Configure backend/.env."
    )

# Alembic uses sync SQLAlchemy. The app's asyncpg URL needs to be rewritten.
if "+asyncpg" in db_url:
    db_url = db_url.replace("+asyncpg", "+psycopg2")
# Bare `postgresql://` already defaults to psycopg2, so leave that alone.

config.set_main_option("sqlalchemy.url", db_url)


from app.models.attendance import Base  # noqa: E402
# Side-effect imports so Base.metadata sees admin/worker/punch_event tables
from app.models import admin as _admin  # noqa: E402,F401
from app.models import worker as _worker  # noqa: E402,F401
from app.models import punch_event as _punch_event  # noqa: E402,F401

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(
            connection=connection, target_metadata=target_metadata
        )
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
