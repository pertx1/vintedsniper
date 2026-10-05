#!/usr/bin/env bash
# Actualiza la app a la última versión de la rama desplegada.
# Uso: sudo bash /opt/vintedsniper/deploy/update.sh
set -euo pipefail
APP_DIR=/opt/vintedsniper
BRANCH=$(sudo -u sniper -H git -C "$APP_DIR" rev-parse --abbrev-ref HEAD)
sudo -u sniper -H bash -c "cd $APP_DIR && git fetch -q origin $BRANCH && git reset -q --hard origin/$BRANCH && npm ci --omit=dev --no-audit --no-fund"
systemctl restart vinted-sniper
echo "✅ Actualizado a $(sudo -u sniper -H git -C "$APP_DIR" log -1 --format='%h %s')"
