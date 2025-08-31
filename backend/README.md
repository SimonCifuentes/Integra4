# SportHubTemuco - Backend (FastAPI)

## Ejecutar en local
```bash
python -m venv .venv && source .venv/bin/activate  # (Windows: .venv\Scripts\activate)
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## Variables de entorno
Ver `.env.example`.

## Migraciones
```bash
alembic revision --autogenerate -m "init"
alembic upgrade head
```
