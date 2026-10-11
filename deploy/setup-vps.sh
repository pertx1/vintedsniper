#!/usr/bin/env bash
# Instala Vinted Sniper en un servidor Ubuntu/Debian recién creado
# (Oracle Cloud Always Free, Google Cloud e2-micro, una Raspberry Pi, cualquier VPS).
#
# La app no abre ningún puerto: solo se conecta hacia fuera (Telegram y Vinted),
# así que no hace falta dominio, HTTPS ni tocar el cortafuegos.
#
# Uso:
#   curl -fsSL https://raw.githubusercontent.com/pertx1/vintedsniper/<rama>/deploy/setup-vps.sh -o setup.sh
#   sudo bash setup.sh
#
# El script pide el token del bot (sin mostrarlo) y tu chat ID.
# Variables opcionales:
#   REPO_URL  URL del repositorio (si es privado: https://<token>@github.com/pertx1/vintedsniper.git)
#   BRANCH    rama a desplegar
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/pertx1/vintedsniper.git}"
BRANCH="${BRANCH:-claude/charming-mayer-9520k7}"
APP_DIR=/opt/vintedsniper
APP_USER=sniper

if [[ $EUID -ne 0 ]]; then echo "Ejecútalo con sudo"; exit 1; fi

echo "==> Paquetes del sistema"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git ca-certificates

# Las máquinas de 1 GB se quedan cortas al instalar dependencias: añadimos swap.
if [[ $(free -m | awk '/^Mem:/{print $2}') -lt 1500 && ! -f /swapfile ]]; then
  echo "==> Creando 2 GB de swap"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

if ! command -v node >/dev/null || [[ $(node -p 'process.versions.node.split(".")[0]') -lt 22 ]]; then
  echo "==> Node.js 22"
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

echo "==> Código de la app"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --home-dir /var/lib/$APP_USER --create-home --shell /usr/sbin/nologin "$APP_USER"
if [[ -d "$APP_DIR/.git" ]]; then
  sudo -u "$APP_USER" -H git -C "$APP_DIR" fetch origin "$BRANCH"
  sudo -u "$APP_USER" -H git -C "$APP_DIR" checkout -q "$BRANCH"
  sudo -u "$APP_USER" -H git -C "$APP_DIR" reset -q --hard "origin/$BRANCH"
else
  git clone -b "$BRANCH" "$REPO_URL" "$APP_DIR"
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
sudo -u "$APP_USER" -H bash -c "cd $APP_DIR && npm ci --omit=dev --no-audit --no-fund"

if [[ ! -f "$APP_DIR/.env" ]]; then
  echo "==> Configuración de Telegram"
  # Se piden por teclado (el token sin mostrarse) para que no queden en el historial de la terminal.
  TG_TOKEN="${TELEGRAM_BOT_TOKEN:-}"
  TG_CHAT="${TELEGRAM_CHAT_ID:-}"
  if [[ -z "$TG_TOKEN" && -t 0 ]]; then read -rsp "Token del bot de Telegram (no se verá al escribir): " TG_TOKEN; echo; fi
  if [[ -z "$TG_CHAT" && -t 0 ]]; then read -rp "Tu chat ID de Telegram: " TG_CHAT; fi
  if [[ -z "$TG_TOKEN" || -z "$TG_CHAT" ]]; then
    echo "⚠️  Sin token o chat ID la app no arrancará. Edita $APP_DIR/.env y reinicia: sudo systemctl restart vinted-sniper"
  fi
  echo "==> Generando .env"
  umask 077
  cat > "$APP_DIR/.env" <<ENV
TELEGRAM_BOT_TOKEN=${TG_TOKEN}
TELEGRAM_CHAT_ID=${TG_CHAT}
VINTED_DOMAIN=www.vinted.es
POLL_INTERVAL_SECONDS=45
TZ=Europe/Madrid
DB_PATH=${APP_DIR}/data/sniper.db
ENV
  umask 022
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
else
  echo "==> .env ya existe: se conserva"
  if ! grep -q '^TELEGRAM_BOT_TOKEN=.' "$APP_DIR/.env"; then
    echo "⚠️  Tu .env no tiene TELEGRAM_BOT_TOKEN: añádelo junto a TELEGRAM_CHAT_ID (sudo nano $APP_DIR/.env)"
  fi
fi

echo "==> Servicio systemd"
cat > /etc/systemd/system/vinted-sniper.service <<UNIT
[Unit]
Description=Vinted Sniper (bot de Telegram)
After=network-online.target
Wants=network-online.target

[Service]
User=${APP_USER}
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable vinted-sniper
systemctl restart vinted-sniper

# Versiones anteriores servían una web detrás de Caddy: ya no hace falta.
if systemctl is-active --quiet caddy 2>/dev/null && grep -q 'reverse_proxy 127.0.0.1:3000' /etc/caddy/Caddyfile 2>/dev/null; then
  echo "==> Caddy ya no es necesario (la web se ha eliminado); lo detengo"
  systemctl disable --now caddy || true
fi

sleep 4
if systemctl is-active --quiet vinted-sniper; then
  echo
  echo "✅ Listo. Escribe /start a tu bot en Telegram."
  echo "   Log en directo: journalctl -u vinted-sniper -f"
else
  echo "⚠️  La app no está en marcha. Mira el log: journalctl -u vinted-sniper -n 50"
fi
