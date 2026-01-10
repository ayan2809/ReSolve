import sys
import os

# Add the python_packages directory to Python path for Lambda
# This must be done BEFORE any other imports
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'python_packages'))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import problems, reviews, stats, profile
from scheduler import start_scheduler, shutdown_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield
    shutdown_scheduler()

from mangum import Mangum

# Disable redirect_slashes to prevent 307 redirect loops in Lambda
app = FastAPI(title="ReSolve", lifespan=lifespan, redirect_slashes=False)
handler = Mangum(app)

# CORS Configuration
origins = [
    "http://localhost:5173", # Vite default
    "http://localhost:3000",
    "*" # Open for public access (friends)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(problems.router)
app.include_router(reviews.router)
app.include_router(stats.router)
app.include_router(profile.router)

@app.get("/")
def read_root():
    return {"message": "ReSolve API is running"}
