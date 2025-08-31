from fastapi import Request
from fastapi.responses import JSONResponse

def init_exception_handlers(app):
    @app.exception_handler(Exception)
    async def _all(request: Request, exc: Exception):
        return JSONResponse({"code":"internal_error","message":str(exc)}, status_code=500)
