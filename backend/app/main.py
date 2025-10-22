from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.logging import configure_logging
from app.db.session import init_db
from app.tasks.scheduler import Scheduler

settings = get_settings()
configure_logging(settings.debug)

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    debug=settings.debug,
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router, prefix="/api/v1")

scheduler = Scheduler()


@app.on_event("startup")
async def on_startup() -> None:
    init_db()
    await scheduler.start()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await scheduler.stop()

