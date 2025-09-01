from __future__ import annotations
import json, re, os, time
from pathlib import Path
from typing import Any, Dict, Optional

# Índice local (JSON) para registrar uploads (id -> metadata)
# Esto evita depender de una tabla nueva en DB.
DEFAULT_BASE_DIR = Path(os.getenv("MEDIA_STORAGE_DIR", "storage")).resolve()
INDEX_PATH = DEFAULT_BASE_DIR / "media_index.json"
UPLOADS_DIR = DEFAULT_BASE_DIR / "uploads"

def ensure_dirs() -> None:
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
    if not INDEX_PATH.exists():
        INDEX_PATH.parent.mkdir(parents=True, exist_ok=True)
        INDEX_PATH.write_text("{}", encoding="utf-8")

def _read_index() -> Dict[str, Any]:
    ensure_dirs()
    try:
        return json.loads(INDEX_PATH.read_text(encoding="utf-8") or "{}")
    except Exception:
        return {}

def _write_index(data: Dict[str, Any]) -> None:
    ensure_dirs()
    tmp = INDEX_PATH.with_suffix(".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    tmp.replace(INDEX_PATH)

def sanitize_filename(name: str) -> str:
    # Quita directorios y deja chars seguros
    name = name.split("/")[-1].split("\\")[-1]
    name = re.sub(r"[^a-zA-Z0-9_.-]", "_", name)
    return name[:150] or "file"

def add_record(media_id: str, meta: Dict[str, Any]) -> None:
    idx = _read_index()
    idx[media_id] = {**meta, "updated_at": int(time.time())}
    _write_index(idx)

def get_record(media_id: str) -> Optional[Dict[str, Any]]:
    return _read_index().get(media_id)

def del_record(media_id: str) -> None:
    idx = _read_index()
    if media_id in idx:
        idx.pop(media_id)
        _write_index(idx)
