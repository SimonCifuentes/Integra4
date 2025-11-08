#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Genera backend/docs/CONTRATO_Y_EJEMPLOS.md automáticamente escaneando los routers.
Uso:
    python backend/scripts/generar_contrato.py
"""
import os, re, json, ast, datetime, pathlib
from collections import defaultdict

BASE = os.path.dirname(os.path.dirname(__file__))  # backend/
APP_DIR = os.path.join(BASE, "app")
DOCS_DIR = os.path.join(BASE, "docs")
os.makedirs(DOCS_DIR, exist_ok=True)

def extract_router_info(txt: str):
    m = re.search(r"router\s*=\s*APIRouter\((.*?)\)", txt, re.S)
    prefix, tags = None, []
    if m:
        args = m.group(1)
        m2 = re.search(r"prefix\s*=\s*['\"]([^'\"]+)['\"]", args)
        if m2:
            prefix = m2.group(1)
        m3 = re.search(r"tags\s*=\s*\[([^\]]+)\]", args)
        if m3:
            tags_str = m3.group(1)
            tags = [t.strip(" '\"\n") for t in tags_str.split(",") if t.strip()]
    return {"prefix": prefix, "tags": tags}

def extract_endpoints(pyfile: str):
    txt = open(pyfile, "r", encoding="utf-8").read()
    endpoints = []
    for m in re.finditer(r"@router\.(get|post|put|patch|delete)\(\s*([^\)]*)\)", txt, re.S):
        method = m.group(1).upper()
        args = m.group(2)
        pm = re.search(r"(['\"])(.*?)\1", args, re.S)
        rel_path = pm.group(2) if pm else ""
        sm = re.search(r"summary\s*=\s*['\"]([^'\"]+)['\"]", args)
        dm = re.search(r"description\s*=\s*['\"]([^'\"]+)['\"]", args)
        rm = re.search(r"response_model\s*=\s*([A-Za-z_][\w\.]*)", args)
        after = txt[m.end():]
        fm = re.search(r"def\s+([A-Za-z_]\w*)\s*\(", after)
        func = fm.group(1) if fm else ""
        endpoints.append({
            "method": method,
            "rel_path": rel_path,
            "summary": sm.group(1) if sm else "",
            "description": dm.group(1) if dm else "",
            "response_model": rm.group(1) if rm else "",
            "func": func,
        })
    info = extract_router_info(txt)
    for ep in endpoints:
        ep["prefix"] = info["prefix"]
        ep["tags"] = info["tags"]
        ep["file"] = pyfile
    return endpoints

def get_func_params_with_types(pyfile: str):
    try:
        tree = ast.parse(open(pyfile, "r", encoding="utf-8").read())
    except Exception:
        return {}
    mapping = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            params = []
            for arg in node.args.args:
                ann = arg.annotation
                ann_name = None
                if isinstance(ann, ast.Name):
                    ann_name = ann.id
                elif isinstance(ann, ast.Attribute):
                    ann_name = ann.attr
                elif isinstance(ann, ast.Subscript):
                    val = ann.value
                    if isinstance(val, ast.Name):
                        ann_name = val.id
                    elif isinstance(val, ast.Attribute):
                        ann_name = val.attr
                params.append({"name": arg.arg, "annotation": ann_name})
            mapping[node.name] = params
    return mapping

# Recolectar routers
router_files = []
for r, d, fs in os.walk(APP_DIR):
    for f in fs:
        if f.endswith(".py") and "router.py" in f:
            router_files.append(os.path.join(r, f))

all_eps = []
func_params = {}
for rf in router_files:
    all_eps += extract_endpoints(rf)
    func_params[rf] = get_func_params_with_types(rf)

for ep in all_eps:
    ep["params"] = func_params.get(ep["file"], {}).get(ep["func"], [])

def full_path(ep):
    rel = ep["rel_path"]
    prefix = ep["prefix"] or ""
    full = "/api/v1" + prefix + (("/" + rel.lstrip("/")) if rel else "")
    return re.sub(r"//+", "/", full)

grouped = defaultdict(list)
for ep in all_eps:
    tag = ep["tags"][0] if ep["tags"] else pathlib.Path(ep["file"]).parts[-2]
    grouped[tag].append(ep)

EXAMPLE_BODIES = {
    "UserCreate": {"email": "ana@example.com", "password": "Passw0rd!", "nombre": "Ana", "apellido": "Pérez"},
    "UserLogin": {"email": "ana@example.com", "password": "Passw0rd!"},
    "UserUpdate": {"nombre": "Ana María", "telefono": "+56991234567"},
    "RefreshIn": {"refresh_token": "<REFRESH_TOKEN>"},
    "LogoutIn": {"refresh_token": "<REFRESH_TOKEN>"},
    "VerifyEmailIn": {"token": "<EMAIL_TOKEN>"},
    "ResendVerificationIn": {"email": "ana@example.com"},
    "ForgotPasswordIn": {"email": "ana@example.com"},
    "ResetPasswordIn": {"token": "<RESET_TOKEN>", "new_password": "Nuev0Pass!"},
    "ChangePasswordIn": {"old_password": "Passw0rd!", "new_password": "Nuev0Pass!"},
    "PushTokenIn": {"token": "<PUSH_TOKEN>", "plataforma": "expo"},
    "ReservaCreateIn": {"id_cancha": 12, "fecha_reserva": "2025-11-10", "hora_inicio": "18:00", "hora_fin": "19:30"},
    "QuoteIn": {"id_cancha": 12, "fecha": "2025-11-10", "hora_inicio": "18:00", "hora_fin": "19:30"},
    "CanchaCreateIn": {"id_complejo": 3, "deporte": "futbol", "techada": True, "iluminacion": True, "precio_por_hora": 20000},
    "CanchaUpdateIn": {"precio_por_hora": 22000, "iluminacion": True},
    "ComplejoCreateIn": {"nombre": "Complejo Ñielol", "direccion": "Av. Alemania 123, Temuco", "latitud": -38.735, "longitud": -72.590, "telefono": "+56987654321"},
    "ComplejoUpdateIn": {"telefono": "+56911112222", "descripcion": "Canchas techadas y estacionamiento"}
}

lines = []
lines.append("# Contrato y ejemplos – API SportHubTemuco")
lines.append("")
lines.append(f"_Generado automáticamente el {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}_")
lines.append("")
lines.append("**Base URL local:** `http://localhost:8000`  \n**Base de la API:** `/api/v1`")
lines.append("")
lines.append("## Autenticación")
lines.append("- La mayoría de los endpoints requieren **Bearer Token** en el header `Authorization: Bearer <access_token>`.")
lines.append("- Flujo típico: `POST /api/v1/auth/register` → `POST /api/v1/auth/login` → usar `access_token` en siguientes requests.")
lines.append("")
lines.append("### Ejemplo login")
lines.append("```bash")
lines.append("curl -X POST 'http://localhost:8000/api/v1/auth/login' \\")
lines.append("  -H 'Content-Type: application/json' \\")
lines.append("  -d '{\"email\":\"ana@example.com\",\"password\":\"Passw0rd!\"}'")
lines.append("```")
lines.append("")
lines.append("---")
lines.append("")

for tag in sorted(grouped.keys()):
    lines.append(f"## {tag}")
    lines.append("")
    for ep in sorted(grouped[tag], key=lambda x: (full_path(x), x['method'])):
        fp = full_path(ep)
        lines.append(f"### `{ep['method']} {fp}`")
        if ep["summary"]:
            lines.append(f"**Descripción breve:** {ep['summary']}")
        if ep["description"]:
            lines.append(f"\n{ep['description']}")
        path_params = re.findall(r"\{([a-zA-Z_]\w*)\}", fp)
        if path_params:
            lines.append("**Path params:** " + ", ".join(f"`{p}`" for p in path_params))
        body_model = None
        for prm in ep["params"]:
            ann = prm.get("annotation")
            if ann and ann not in ("Session", "Usuario", "Request", "Response", "int", "str", "bool", "float"):
                if prm["name"] not in path_params:
                    body_model = ann
                    break
        if body_model:
            lines.append(f"**Body model (estimado):** `{body_model}`")
        if ep["response_model"]:
            lines.append(f"**Response model (estimado):** `{ep['response_model']}`")
        lines.append("")
        lines.append("**Ejemplo:**")
        curl = [
            f"curl -X {ep['method']} 'http://localhost:8000{fp}' \\",
            "  -H 'Accept: application/json'"
        ]
        needs_auth = not fp.startswith("/api/v1/auth") and not fp.startswith("/api/v1/_meta") and not fp.endswith("/healthz")
        if needs_auth:
            curl.append("  -H 'Authorization: Bearer <ACCESS_TOKEN>'")
        if ep["method"] in ("POST", "PUT", "PATCH"):
            curl.append("  -H 'Content-Type: application/json'")
            example = EXAMPLE_BODIES.get(body_model, {"...": "rellenar con campos válidos"})
            curl.append(f"  -d '{json.dumps(example, ensure_ascii=False)}'")
        lines.append("```bash")
        lines.extend(curl)
        lines.append("```")
        lines.append("")
    lines.append("---")
    lines.append("")

out_md = os.path.join(DOCS_DIR, "CONTRATO_Y_EJEMPLOS.md")
open(out_md, "w", encoding="utf-8").write("\n".join(lines))
print(f"Listo. Archivo generado en: {out_md}")
