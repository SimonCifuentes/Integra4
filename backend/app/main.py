from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router

app = FastAPI(title="SportHubTemuco API")
from fastapi import FastAPI

app = FastAPI(
    title="SportHubTemuco API",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)


# Orígenes que realmente usas en dev web con Expo/Metro
ALLOWED_ORIGINS = [
    "http://localhost:8081",   # Expo Web (Metro)
    "http://127.0.0.1:8081",
    "http://localhost:19006",  # (por si usas el viejo dev server web)
    "http://127.0.0.1:19006",
    "http://api-h1d7oi-a881cc-168-232-167-73.traefik.me"
    # agrega otros que veas en consola si cambia el puerto
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173","http://localhost:8000","http://localhost:8081" ],
    allow_credentials=True,
    allow_methods=["*"],   # GET, POST, OPTIONS, etc.
    allow_headers=["*"],   # content-type, authorization, etc.
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/", tags=["_meta"])
def root():
    return {"ok": True, "docs": "/docs", "api": "/api/v1"}
