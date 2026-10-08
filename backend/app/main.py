from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.analysis import router as analysis_router


app = FastAPI(
    title="CropSense AI API",
    description="Backend API for CropSense AI",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(
    health_router,
    prefix="/api",
)

app.include_router(
    analysis_router,
    prefix="/api",
)


@app.get("/")
def root():
    return {
        "message": "Welcome to CropSense AI API",
        "status": "running",
    }