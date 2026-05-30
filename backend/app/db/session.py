from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.config import get_settings

engine = create_async_engine(get_settings().DATABASE_URL, echo=False, pool_size=10)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
# Alias for scripts that prefer the "Local" naming convention
AsyncSessionLocal = async_session


async def get_db():
    async with async_session() as session:
        yield session
