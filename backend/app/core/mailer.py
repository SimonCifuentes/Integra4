# app/core/mailer.py
import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

# ====== Vars desde .env ======
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")  # ej: sporthubtemuco@gmail.com
SMTP_PASS = os.getenv("SMTP_PASSWORD")  # app password de Gmail
FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", SMTP_USER or "")
FROM_NAME = os.getenv("SMTP_FROM_NAME", "SportHub Temuco")
MAIL_STARTTLS = os.getenv("MAIL_STARTTLS", "True").lower() == "true"

# Flags útiles para desarrollo
MAIL_ENABLED = os.getenv("MAIL_ENABLED", "true").lower() == "true"  # desactiva envío real
MAIL_ECHO = os.getenv("MAIL_ECHO", "false").lower() == "true"      # solo imprime el correo

def _build_message(to: str, subject: str, text_body: str, html_body: str | None = None) -> EmailMessage:
    msg = EmailMessage()
    msg["Subject"] = subject
    # 👇 fuerza From a coincidir con el usuario autenticado (recomendado en Gmail)
    msg["From"] = formataddr((FROM_NAME, SMTP_USER or FROM_EMAIL))
    msg["To"] = to
    msg.set_content(text_body)
    if html_body:
        msg.add_alternative(html_body, subtype="html")
    return msg

def _send(msg: EmailMessage) -> None:
    # Validaciones de config (te evitan 530 silenciosos)
    if not MAIL_ENABLED or MAIL_ECHO:
        print("\n[MAILER:SIMULATED SEND]")
        print("FROM:", msg["From"])
        print("TO  :", msg["To"])
        print("SUBJ:", msg["Subject"])
        print("---- TEXT BODY ----")
        print(msg.get_body(preferencelist=('plain',)).get_content())
        htmlp = msg.get_body(preferencelist=('html',))
        if htmlp:
            print("---- HTML BODY ----")
            print(htmlp.get_content())
        print("[/MAILER]\n")
        return

    if not SMTP_USER or not SMTP_PASS:
        raise RuntimeError("SMTP_USER o SMTP_PASSWORD no están definidos (¿cargaste .env antes de importar mailer?).")

    if not msg["From"]:
        raise RuntimeError("Header From vacío. Revisa SMTP_FROM_EMAIL/SMTP_USER.")

    context = ssl.create_default_context()
    with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=30) as server:
        server.ehlo()
        if MAIL_STARTTLS:
            server.starttls(context=context)
            server.ehlo()
        # 👇 obliga a autenticarse siempre con Gmail
        server.login(SMTP_USER, SMTP_PASS)
        server.send_message(msg)
        print(f"[MAILER] Sent OK to: {msg['To']}")

# ============== APIS públicas que usa tu servicio ==============

def send_email(to: str, subject: str, text_body: str, html_body: str | None = None) -> None:
    """
    Envío genérico por SMTP (útil si luego quieres otras plantillas).
    """
    msg = _build_message(to, subject, text_body, html_body)
    _send(msg)

def send_verification_code(to: str, code: str, minutes: int) -> None:
    subject = "Verifica tu correo – SportHub Temuco"
    text = (
        f"Hola,\n\nTu código de verificación es: {code}\n"
        f"Vence en {minutes} minutos.\n\n"
        "Si no solicitaste esto, ignora este correo.\n\n"
        "Equipo SportHub Temuco"
    )
    html = f"""
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
      <p>Hola,</p>
      <p>Tu código de verificación es: <strong style="font-size:18px">{code}</strong></p>
      <p>Vence en <strong>{minutes}</strong> minutos.</p>
      <p style="color:#666">Si no solicitaste esto, ignora este correo.</p>
      <p>Equipo <strong>SportHub Temuco</strong></p>
    </div>
    """
    send_email(to, subject, text, html)

def send_reset_code(to: str, code: str, minutes: int) -> None:
    subject = "Restablecer contraseña – SportHub Temuco"
    text = (
        f"Hola,\n\nPara restablecer tu contraseña usa este código: {code}\n"
        f"Vence en {minutes} minutos.\n\n"
        "Si no solicitaste esto, ignora este correo.\n\n"
        "Equipo SportHub Temuco"
    )
    html = f"""
    <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5">
      <p>Hola,</p>
      <p>Para restablecer tu contraseña usa este código: <strong style="font-size:18px">{code}</strong></p>
      <p>Vence en <strong>{minutes}</strong> minutos.</p>
      <p style="color:#666">Si no solicitaste esto, ignora este correo.</p>
      <p>Equipo <strong>SportHub Temuco</strong></p>
    </div>
    """
    send_email(to, subject, text, html)
