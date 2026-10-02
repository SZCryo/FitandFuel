import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.health import router as health_router
from app.routes.history import router as history_router
from app.routes.plan import router as plan_router
from app.routes.profile import router as profile_router
from app.routes.workout import router as workout_router

app = FastAPI(title="LiftFuel API", version="0.1.0")

raw_origins = os.getenv("CORS_ORIGINS", "*")
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]

# Keeping CORS env-driven saved a lot of rebuild noise while testing preview
# URLs. For local demo work the default wildcard is fine; production can tighten
# it by setting CORS_ORIGINS in Vercel.
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(workout_router)
app.include_router(history_router)
app.include_router(profile_router)
app.include_router(plan_router)


# Vercel and quick browser checks hit different roots depending on the project
# settings, so both of these return the same basic "service is alive" payload.
@app.get("/")
def project_root() -> dict[str, str]:
    return {"service": "liftfuel-api", "status": "ok"}


@app.get("/api")
def root() -> dict[str, str]:
    return {"service": "liftfuel-api", "status": "ok"}
