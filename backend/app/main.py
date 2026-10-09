import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.health import router as health_router
from app.api.analysis import router as analysis_router
from app.api.vision_api import router as vision_router


app = FastAPI(
    title="CropSense AI API",
    description="Backend API for CropSense AI",
    version="1.0.0",
)

# Extra allowed origins can be added via env, comma separated:
#   CORS_ORIGINS=https://cropsensse-ai.lovable.app
extra_origins = [o.strip() for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "https://cropsensse-ai-berojgar-coder.vercel.app/",
        *extra_origins,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api")
app.include_router(analysis_router, prefix="/api")
app.include_router(vision_router, prefix="/api")  # NEW: POST /api/vision/analyze


@app.get("/")
def root():
    return {"message": "Welcome to CropSense AI API", "status": "running"}