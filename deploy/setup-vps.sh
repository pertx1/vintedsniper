#!/usr/bin/env bash
# Instala Vinted Sniper en un servidor Ubuntu/Debian recién creado
# (Oracle Cloud Always Free, Google Cloud e2-micro, cualquier VPS).
#
# Uso:
#   curl -fsSL https://raw.githubusercontent.com/pertx1/vintedsniper/<rama>/deploy/setup-vps.sh -o setup.sh
#   sudo bash setup.sh <tu-subdominio.duckdns.org> <contraseña-de-la-web>
#
# Variables opcionales:
#   REPO_URL  URL del repositorio (si es privado: https://<token>@github.com/pertx1/vintedsniper.git)
#   BRANCH    rama a desplegar
set -euo pipefail

DOMAIN="${1:-}"
PASSWORD="${2:-}"
REPO_URL="${REPO_URL:-https://github.com/pertx1/vintedsniper.git}"
BRANCH="${BRANCH:-claude/charming-mayer-9520k7}"
APP_DIR=/opt/vintedsniper
APP_USER=sniper

if [[ $EUID -ne 0 ]]; then echo "Ejecútalo con sudo"; exit 1; fi
if [[ -z "$DOMAIN" || -z "$PASSWORD" ]]; then
  echo "Uso: sudo bash setup.sh <dominio> <contraseña>"; exit 1
fi

echo "==> Paquetes del sistema"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git ca-certificates gnupg debian-keyring debian-archive-keyring apt-transport-https

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

if ! command -v caddy >/dev/null; then
  echo "==> Caddy (HTTPS automático)"
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  apt-get install -y caddy
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
    echo "⚠️  Sin token o chat ID: la app arrancará sin avisos. Edita $APP_DIR/.env más tarde."
  fi
  echo "==> Generando .env"
  umask 077
  cat > "$APP_DIR/.env" <<ENV
APP_PASSWORD=${PASSWORD}
PORT=3000
HOST=127.0.0.1
TELEGRAM_BOT_TOKEN=${TG_TOKEN}
TELEGRAM_CHAT_ID=${TG_CHAT}
VINTED_DOMAIN=www.vinted.es
POLL_INTERVAL_SECONDS=45
TZ=Europe/Madrid
DB_PATH=${APP_DIR}/data/sniper.db
TRUST_PROXY=true
ENV
  umask 022
  chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
  chmod 600 "$APP_DIR/.env"
else
  echo "==> .env ya existe: se conserva"
  if grep -q '^VAPID_' "$APP_DIR/.env" && ! grep -q '^TELEGRAM_BOT_TOKEN=.' "$APP_DIR/.env"; then
    echo "⚠️  Tu .env es de la versión con Web Push: añade TELEGRAM_BOT_TOKEN y TELEGRAM_CHAT_ID (sudo nano $APP_DIR/.env)"
  fi
fi

echo "==> Servicio systemd"
cat > /etc/systemd/system/vinted-sniper.service <<UNIT
[Unit]
Description=Vinted Sniper
After=network-online.target
Wants=network-online.target

[Service]
User=${APP_USER}
WorkingDirectory=${APP_DIR}
ExecStart=/usr/bin/node src/server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable --now vinted-sniper
systemctl restart vinted-sniper

echo "==> Caddy para ${DOMAIN}"
cat > /etc/caddy/Caddyfile <<CADDY
${DOMAIN} {
	encode gzip
	reverse_proxy 127.0.0.1:3000
}
CADDY
systemctl enable caddy
systemctl reload caddy || systemctl restart caddy

echo "==> Cortafuegos del sistema (puertos 80 y 443)"
# Las imágenes Ubuntu de Oracle traen iptables cerrando todo menos SSH.
if command -v iptables >/dev/null; then
  for port in 80 443; do
    iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null || iptables -I INPUT 1 -p tcp --dport "$port" -j ACCEPT
  done
  command -v netfilter-persistent >/dev/null && netfilter-persistent save || true
fi
if command -v ufw >/dev/null && ufw status | grep -q active; then
  ufw allow 80/tcp && ufw allow 443/tcp
fi

sleep 2
if curl -fsS http://127.0.0.1:3000/api/health >/dev/null; then
  echo
  echo "✅ Listo. Abre https://${DOMAIN} (el certificado puede tardar 1 minuto la primera vez)."
else
  echo "⚠️  La app no responde. Mira el log con: journalctl -u vinted-sniper -n 50"
fi
