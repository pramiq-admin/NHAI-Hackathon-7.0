"""HTTP middleware: body-size cap + global rate limiter wiring.

Body size cap rejects any request whose Content-Length exceeds
`MAX_REQUEST_BODY_BYTES` BEFORE we read the stream. This shuts down the
"upload 50 MB of forged events and let the loop chew on them" DoS vector.

Rate limiter uses slowapi (`Limiter` keyed by client IP). Decorate sensitive
endpoints (login / signup) with `@limiter.limit("...")`.
"""
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address


# Module-level limiter so route files can `from app.security.middleware import limiter`.
#
# `headers_enabled=False` because slowapi's header injection requires every
# decorated endpoint to take a `response: Response` parameter so it can write
# X-RateLimit-* headers. We get away without them — the 429 status code is
# the meaningful signal for clients to back off, and the trade-off avoids
# polluting every route signature.
limiter = Limiter(key_func=get_remote_address, headers_enabled=False)


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject requests whose Content-Length header exceeds `max_bytes`.

    Note: we trust the Content-Length header rather than streaming-count so
    we can reject early without buffering. Chunked-transfer requests bypass
    this (no Content-Length); for our API surface that's not an issue, but
    if you ever accept multipart uploads, add a streaming check too.
    """

    def __init__(self, app, max_bytes: int):
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next):
        cl = request.headers.get("content-length")
        if cl is not None:
            try:
                if int(cl) > self.max_bytes:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": f"Request body too large (>{self.max_bytes} bytes)"},
                    )
            except ValueError:
                return JSONResponse(
                    status_code=400, content={"detail": "Invalid Content-Length"}
                )
        return await call_next(request)


def install_rate_limiter(app: FastAPI) -> None:
    """Bind the slowapi Limiter to the app and register its exception handler."""
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
