from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.config import get_settings

# pool_pre_ping: test each pooled connection with a lightweight ping before
#   handing it out, transparently replacing ones the DB/NAT closed while idle.
#   Without this, a backend left running for hours/days hands out dead asyncpg
#   connections → the first request after an idle period 500s, the retry works.
# pool_recycle: proactively recycle connections older than 30 min so they never
#   reach the server-side idle timeout in the first place.
engine = create_async_engine(
    get_settings().DATABASE_URL,
    echo=False,
    pool_size=10,
    pool_pre_ping=True,
    pool_recycle=1800,
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
# Alias for scripts that prefer the "Local" naming convention
AsyncSessionLocal = async_session


async def get_db():
    async with async_session() as session:
        yield session
