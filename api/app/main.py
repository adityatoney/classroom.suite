from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import health, lessons

app = FastAPI(title="ClassroomSuite Parser", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:10813",
        "http://localhost:10814",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(lessons.router, prefix="/api")
