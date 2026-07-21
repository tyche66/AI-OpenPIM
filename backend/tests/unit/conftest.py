"""Unit test layer configuration (docs/09-测试计划 §1.1).

This conftest is intentionally minimal and MUST NOT import anything from
``app.main`` or ``app.core.database`` — unit tests must run without any
DATABASE_URL / REDIS_URL / MINIO environment variables and in <5s.

If a unit test needs an ``app.*`` symbol, it must import only the leaf module
that contains it (e.g. ``app.core.serializers``, ``app.services.rag_index``,
``app.adapters.none``) and that leaf must NOT transitively import
``app.main`` / ``app.core.database``. If such a transitive dependency is
discovered, fix the import chain in the application, do not pull the whole app
into the unit layer.

Integration fixtures (``client`` / ``integration_setup_db``) live in the
parent ``tests/conftest.py`` and are lazily wired so they never load during
unit collection.
"""

import pytest


@pytest.fixture(autouse=True)
def _reset_observability_metrics():
    """Reset observability metric singletons before (and after) each unit test.

    Metrics are process-wide module-level singletons; integration tests that
    emit HTTP requests accumulate state that would otherwise leak into unit
    tests making their value-based assertions flaky depending on test run
    order. Clearing the singletons keeps each unit test independent.
    """
    from app.observability import metrics

    def _reset_all():
        for single in (
            metrics._http_requests_total,
            metrics._db_pool_in_use,
            metrics._db_pool_available,
            metrics._ai_requests_total,
            metrics._ocr_requests_total,
            metrics._backup_last_success_timestamp,
            metrics._backup_last_failure_timestamp,
            metrics._backup_status,
            metrics._volume_free_bytes,
            metrics._volume_threshold_bytes,
        ):
            single.values.clear()
        hist = metrics._http_request_duration_seconds
        for ub in hist.buckets:
            hist.counts[ub] = 0
        hist.sums = 0.0

    _reset_all()
    yield
    _reset_all()
