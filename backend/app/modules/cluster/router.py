# backend/app/modules/cluster/router.py
# Módulo 'Cluster (servidor opcional)' para exponer salud e información del proceso/worker.
from fastapi import APIRouter
import os, socket, platform, multiprocessing, time

router = APIRouter(prefix="/cluster", tags=["cluster"])

_started_at = time.time()

@router.get("/health", summary="Healthcheck del nodo/worker")
def health():
    return {"status": "ok"}

@router.get("/info", summary="Información del worker y entorno")
def info():
    return {
        "hostname": socket.gethostname(),
        "pid": os.getpid(),
        "ppid": os.getppid(),
        "cpu_count": multiprocessing.cpu_count(),
        "platform": platform.platform(),
        "python": platform.python_version(),
        "uptime_seconds": round(time.time() - _started_at, 2),
    }
