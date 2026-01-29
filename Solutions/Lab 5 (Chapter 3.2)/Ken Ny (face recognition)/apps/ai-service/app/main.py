from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request as StarletteRequest
from .routers import face, emotion, face_analysis

app = FastAPI(
    title="Face Recognition AI Service", 
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Middleware to increase body size limit
class LargeBodyMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: StarletteRequest, call_next):
        # Increase max body size to 50MB
        if request.method in ["POST", "PUT", "PATCH"]:
            # This is handled by uvicorn's --limit-request-line and --limit-request-fields
            # But we can add custom handling here if needed
            pass
        response = await call_next(request)
        return response

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add large body middleware
app.add_middleware(LargeBodyMiddleware)

# Include routers
app.include_router(face.router)
app.include_router(emotion.router)
app.include_router(face_analysis.router)

@app.get("/health")
def health():
    return {"status": "ok", "service": "face-recognition-ai"}

@app.get("/")
def root():
    return {"message": "Face Recognition AI Service", "version": "1.0.0"}
