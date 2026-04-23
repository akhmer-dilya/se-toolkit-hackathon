from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.routers import analytics, auth, groups, habits, profile

app = FastAPI(title="Healthy habits API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
@app.get("/")
def root():
    return {"message": "Healthy habits API is running"}


app.include_router(auth.router)
app.include_router(habits.router)
app.include_router(profile.router)
app.include_router(groups.router)
app.include_router(analytics.router)
os.makedirs(settings.uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.uploads_dir), name="uploads")
