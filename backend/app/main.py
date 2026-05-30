from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
import structlog

from app.config import get_settings
from app.db.session import engine
from app.models.attendance import Base
# Import models so SQLAlchemy registers their tables on Base.metadata
from app.models import admin as _admin_model  # noqa: F401
from app.models import worker as _worker_model  # noqa: F401
from app.models import punch_event as _punch_event_model  # noqa: F401
from app.routes import auth, attendance, admin, workers, worker_auth, punch_events
from app.security.middleware import (
    BodySizeLimitMiddleware,
    install_rate_limiter,
)

# In production we render JSON for log aggregation; dev keeps the pretty
# ConsoleRenderer for terminal readability.
_settings_at_import = get_settings()
_renderer = (
    structlog.processors.JSONRenderer()
    if _settings_at_import.is_production()
    else structlog.dev.ConsoleRenderer()
)
structlog.configure(
    processors=[
        structlog.stdlib.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        _renderer,
    ],
)
log = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info("starting", version="0.1.0", env=_settings_at_import.ENV)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()
    log.info("shutdown")


app = FastAPI(
    title="NHAI Face Auth API",
    version="0.1.0",
    lifespan=lifespan,
)

settings = get_settings()

# --- CORS ---
# In dev `["*"]` is fine; in prod the startup validator already refused to boot
# with `*`. Disallow credentials so even an accidental `*` can't leak cookies.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type", "X-Integrity-Token"],
)

# --- DoS protection: cap body size ---
app.add_middleware(BodySizeLimitMiddleware, max_bytes=settings.MAX_REQUEST_BODY_BYTES)

# --- Rate limiting on auth endpoints ---
install_rate_limiter(app)

# --- Prometheus /metrics — gated behind METRICS_BEARER_TOKEN ---
# If the env var is unset, no /metrics endpoint is exposed at all.
if settings.METRICS_BEARER_TOKEN:
    inst = Instrumentator()
    inst.instrument(app)

    # Custom token-gated exposure (the default `.expose()` is public).
    @app.get("/metrics", include_in_schema=False)
    async def metrics(request: Request):
        auth_header = request.headers.get("Authorization", "")
        expected = f"Bearer {settings.METRICS_BEARER_TOKEN}"
        if auth_header != expected:
            return Response(status_code=status.HTTP_404_NOT_FOUND)
        from prometheus_client import REGISTRY, generate_latest, CONTENT_TYPE_LATEST
        return Response(generate_latest(REGISTRY), media_type=CONTENT_TYPE_LATEST)


# --- Routers ---
# Legacy device-token endpoint is now gated; it 410's unless DEVICE_TOKEN_ENABLED.
app.include_router(auth.router)
app.include_router(attendance.router)
app.include_router(admin.router)
app.include_router(workers.router)
app.include_router(worker_auth.router)
app.include_router(punch_events.router)


@app.get("/api/v1/healthz")
async def healthz():
    return {"status": "ok", "service": "nhai-face-auth"}
