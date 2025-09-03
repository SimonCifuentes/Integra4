from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.v1.router import api_router

app = FastAPI(title="SportHubTemuco API")

# Orígenes que realmente usas en dev web con Expo/Metro
ALLOWED_ORIGINS = [
    "http://localhost:8081",   # Expo Web (Metro)
    "http://127.0.0.1:8081",
    "http://localhost:19006",  # (por si usas el viejo dev server web)
    "http://127.0.0.1:19006",
    # agrega otros que veas en consola si cambia el puerto
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],   # GET, POST, OPTIONS, etc.
    allow_headers=["*"],   # content-type, authorization, etc.
)

app.include_router(api_router, prefix="/api/v1")

@app.get("/", tags=["_meta"])
def root():
    return {"ok": True, "docs": "/docs", "api": "/api/v1"}
