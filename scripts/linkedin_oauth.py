#!/usr/bin/env python3
"""
linkedin_oauth.py — OAuth 3-legged flow para LinkedIn API.

Abre el navegador para autorizar, captura el callback en localhost:8080,
intercambia el code por access_token y guarda en ~/.claude/.env.

Uso:
  .venv/bin/python3.14 scripts/linkedin_oauth.py
"""

from __future__ import annotations

import http.server
import os
import secrets
import threading
import urllib.parse
import urllib.request
import webbrowser
import json
from pathlib import Path

CLIENT_ID     = "7835ro6xacyijn"
REDIRECT_URI  = "http://localhost:8080/callback"
SCOPE         = "w_member_social openid profile"
ENV_FILE      = Path.home() / ".claude" / ".env"

# ── Servidor local para capturar el callback ───────────────────────────────

callback_result: dict = {}

class CallbackHandler(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        params = dict(urllib.parse.parse_qsl(parsed.query))
        callback_result.update(params)
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.end_headers()
        self.wfile.write(b"<h2>Autorizado. Puedes cerrar esta ventana.</h2>")
        threading.Thread(target=self.server.shutdown).start()

    def log_message(self, *_):
        pass


def _run_server() -> None:
    server = http.server.HTTPServer(("localhost", 8080), CallbackHandler)
    server.serve_forever()


# ── Intercambio de code por token ──────────────────────────────────────────

def _exchange_code(code: str, client_secret: str) -> dict:
    data = urllib.parse.urlencode({
        "grant_type":    "authorization_code",
        "code":          code,
        "redirect_uri":  REDIRECT_URI,
        "client_id":     CLIENT_ID,
        "client_secret": client_secret,
    }).encode()
    req = urllib.request.Request(
        "https://www.linkedin.com/oauth/v2/accessToken",
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        return json.loads(r.read())


def _get_person_urn(access_token: str, client_id: str, client_secret: str) -> str:
    """Usa /v2/userinfo (scope openid profile)."""
    req = urllib.request.Request(
        "https://api.linkedin.com/v2/userinfo",
        headers={
            "Authorization": f"Bearer {access_token}",
            "LinkedIn-Version": "202501",
        },
    )
    with urllib.request.urlopen(req, timeout=15) as r:
        info = json.loads(r.read())
    # sub = "ACoAA..." → urn:li:person:ACoAA...
    sub = info.get("sub", "")
    return f"urn:li:person:{sub}" if sub else ""


# ── Actualizar ~/.claude/.env ──────────────────────────────────────────────

def _update_env(key: str, value: str) -> None:
    text = ENV_FILE.read_text(encoding="utf-8")
    lines = text.splitlines()
    updated = False
    for i, line in enumerate(lines):
        if line.startswith(f"{key}="):
            lines[i] = f"{key}={value}"
            updated = True
            break
    if not updated:
        lines.append(f"{key}={value}")
    ENV_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"  [env] {key} guardado en {ENV_FILE}")


# ── Main ───────────────────────────────────────────────────────────────────

def main() -> None:
    # Leer client_secret desde .env
    env_text = ENV_FILE.read_text(encoding="utf-8")
    client_secret = ""
    for line in env_text.splitlines():
        if line.startswith("LI_CLIENT_SECRET="):
            client_secret = line.split("=", 1)[1].strip()
    if not client_secret:
        print("[error] LI_CLIENT_SECRET no encontrado en ~/.claude/.env")
        return

    state = secrets.token_urlsafe(16)

    auth_url = (
        "https://www.linkedin.com/oauth/v2/authorization"
        f"?response_type=code"
        f"&client_id={CLIENT_ID}"
        f"&redirect_uri={urllib.parse.quote(REDIRECT_URI, safe='')}"
        f"&scope={urllib.parse.quote(SCOPE)}"
        f"&state={state}"
    )

    print("[oauth] Iniciando servidor en localhost:8080...")
    t = threading.Thread(target=_run_server, daemon=True)
    t.start()

    print(f"[oauth] Abriendo navegador para autorización...")
    webbrowser.open(auth_url)

    t.join()  # esperar hasta que el callback llegue

    if "error" in callback_result:
        print(f"[error] {callback_result}")
        return

    if callback_result.get("state") != state:
        print("[error] state mismatch — posible CSRF")
        return

    code = callback_result["code"]
    print("[oauth] Code recibido, intercambiando por token...")

    token_data = _exchange_code(code, client_secret)
    access_token = token_data.get("access_token", "")
    if not access_token:
        print(f"[error] No se recibió access_token: {token_data}")
        return

    expires = token_data.get("expires_in", 0)
    print(f"[oauth] Token obtenido (expira en {expires//86400} días)")

    # Guardar token primero — si falla el URN al menos el token queda
    _update_env("LI_ACCESS_TOKEN", access_token)

    print("[oauth] Obteniendo Person URN...")
    person_urn = _get_person_urn(access_token, CLIENT_ID, client_secret)
    print(f"[oauth] Person URN: {person_urn}")

    _update_env("LI_PERSON_URN", person_urn)

    print("\n[ok] OAuth completado. Credenciales guardadas en ~/.claude/.env")
    print(f"     Person URN : {person_urn}")
    print(f"     Token      : {access_token[:20]}...")


if __name__ == "__main__":
    main()
