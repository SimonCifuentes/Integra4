#!/usr/bin/env bash
set -euo pipefail
cd /app

# Variables con valores por defecto
: "${APP_MODULE:=app.main:app}"
: "${GUNICORN_CONF:=/app/scripts/gunicorn_conf.py}"

echo "[start_gunicorn] Iniciando Gunicorn con ${APP_MODULE}"
exec gunicorn -c "${GUNICORN_CONF}" "${APP_MODULE}"
