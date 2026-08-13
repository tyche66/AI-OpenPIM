import os
import sys
from os.path import abspath, dirname

from sqlalchemy import engine_from_config, pool

from alembic import context

sys.path.insert(0, dirname(dirname(abspath(__file__))))


def _ensure_ci_defaults() -> None:
    """Provide safe defaults for non-database settings when running under CI.

    ``app.core.config.Settings`` requires ``JWT_SECRET``, ``REDIS_URL``, and the
    ``MINIO_*`` triplet in addition to ``DATABASE_URL``. Local developers source
    a populated ``.env`` before invoking ``alembic``, but CI migration jobs and
    other isolated contexts (e.g. the empty-PG upgrade check) only inject
    ``DATABASE_URL``. Without these defaults the import of ``settings`` raises
    ``pydantic_core._pydantic_core.ValidationError`` and the migration never
    starts. The values are placeholders that are never exercised by migrations
    themselves (which only touch ``DATABASE_URL``).
    """
    ci_defaults = {
        "JWT_SECRET": "alembic-ci-placeholder-secret",
        "REDIS_URL": "redis://localhost:6379/0",
        "MINIO_ENDPOINT": "localhost:9000",
        "MINIO_ACCESS_KEY": "alembic-ci",
        "MINIO_SECRET_KEY": "alembic-ci",
    }
    for key, value in ci_defaults.items():
        os.environ.setdefault(key, value)


_ensure_ci_defaults()

from app.core.config import settings
from app.core.database import Base

target_metadata = Base.metadata


def _to_sync_url(url: str) -> str:
    """Alembic runs migrations synchronously; force the sync psycopg2 driver.

    ``requirements.txt`` pins psycopg2 (SQLAlchemy's default postgresql driver),
    so both ``+asyncpg`` and ``+psycopg`` are normalised to the plain
    ``postgresql://`` (psycopg2) scheme. Using an async driver here raises
    ``MissingGreenlet`` because there is no event loop for Alembic to await on.
    """
    return (
        url.replace("postgresql+asyncpg://", "postgresql://")
        .replace("postgresql+psycopg://", "postgresql://")
    )


def _resolve_url() -> str:
    """Resolve the DSN Alembic migrates against.

    Priority:
      1. ``ALEMBIC_OVERRIDE_URL`` (env var) — used by the test harness to target
         the isolated ``ai_pim_test`` database regardless of the app config.
      2. ``settings.DATABASE_URL`` — keeps ``alembic upgrade head`` consistent
         with the deployed runtime configuration.
      3. ``alembic.ini``'s hardcoded ``sqlalchemy.url`` — final fallback.

    All sources are coerced to the synchronous psycopg2 form so migrations work
    both locally and in container/server deployments without manual edits.
    """
    override = os.environ.get("ALEMBIC_OVERRIDE_URL")
    if override:
        sync_url = _to_sync_url(override)
        context.config.set_main_option("sqlalchemy.url", sync_url)
        return sync_url
    url = getattr(settings, "DATABASE_URL", "") or ""
    if url:
        sync_url = _to_sync_url(url)
        context.config.set_main_option("sqlalchemy.url", sync_url)
        return sync_url
    return context.config.get_main_option("sqlalchemy.url")


def run_migrations_offline():
    url = _resolve_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    _resolve_url()
    connectable = engine_from_config(
        context.config.get_section(context.config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
