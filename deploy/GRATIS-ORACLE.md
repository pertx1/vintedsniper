# Desplegar gratis en Oracle Cloud (Always Free)

Oracle Cloud regala para siempre una máquina virtual pequeña que está encendida 24/7 y tiene disco propio. Es justo lo que necesita el sniper. Tiempo aproximado: 15–20 minutos.

Como todo se maneja desde Telegram y la app no abre ningún puerto, **no hace falta dominio, HTTPS ni abrir puertos**: basta con que la máquina pueda conectarse a internet.

Necesitarás:
- Una tarjeta para verificar la cuenta. **No se cobra** mientras uses recursos «Always Free»; la cuenta empieza con 300 $ de prueba y después pasa sola al nivel gratuito.
- Tu bot de Telegram ya creado: el **token** y tu **chat ID** (ver «Crear el bot de Telegram» en el README).

> ⚠️ Las IPs de Oracle son de centro de datos y Vinted puede limitarlas (lo verás como «limitado» en `/estado`). Si pasa mucho, sube el intervalo con `/intervalo 90`.

---

## 1. Crear la cuenta

1. Ve a <https://www.oracle.com/cloud/free/> y pulsa **Start for free**.
2. Elige como **Home Region** una de Europa, por ejemplo *Spain Central (Madrid)* o *Germany Central (Frankfurt)*. **No se puede cambiar después.**

## 2. Crear la máquina virtual

1. En el menú: **Compute → Instances → Create instance**.
2. **Name**: `sniper`.
3. **Image and shape → Edit**:
   - Image: **Canonical Ubuntu 24.04**.
   - Shape: **Ampere (VM.Standard.A1.Flex)** con 1 OCPU y 6 GB, o **VM.Standard.E2.1.Micro** si Ampere da error de «out of capacity». Las dos son *Always Free eligible*.
4. **Networking**: deja que cree la red (VCN) y marca **Assign a public IPv4 address** (solo para poder entrar por SSH).
5. **Add SSH keys**: pulsa **Generate a key pair for me** y **descarga la clave privada** (`.key`). La necesitas para entrar.
6. **Create**. En un par de minutos estará en *Running*. Apunta la **Public IP address**.

## 3. Instalar el sniper (un solo comando)

Conéctate por SSH a la máquina:

- **Mac / Linux** (Terminal):
  ```bash
  chmod 400 ~/Downloads/ssh-key-*.key
  ssh -i ~/Downloads/ssh-key-*.key ubuntu@TU_IP
  ```
- **Windows**: abre *PowerShell* y usa el mismo comando `ssh -i RUTA\a\la\clave.key ubuntu@TU_IP`.
- **Desde el navegador**: en la instancia de Oracle también tienes *Cloud Shell → SSH*.

Una vez dentro, ejecuta lo siguiente. El script te pedirá el **token del bot** (no se ve al escribirlo, es normal) y tu **chat ID**:

```bash
curl -fsSL https://raw.githubusercontent.com/pertx1/vintedsniper/claude/charming-mayer-9520k7/deploy/setup-vps.sh -o setup.sh
sudo bash setup.sh
```

El script instala Node 22, descarga la app, crea el `.env` con tu token y chat ID (solo legible por la app) y la deja como servicio que arranca sola. Al final verás **✅ Listo**.

> **Si el repositorio es privado**, GitHub no dejará descargarlo así. Crea un token en GitHub (*Settings → Developer settings → Fine-grained tokens*, con permiso de lectura de *Contents* sobre este repo) y:
> ```bash
> curl -fsSL -H "Authorization: token TU_TOKEN" https://raw.githubusercontent.com/pertx1/vintedsniper/claude/charming-mayer-9520k7/deploy/setup-vps.sh -o setup.sh
> sudo REPO_URL=https://TU_TOKEN@github.com/pertx1/vintedsniper.git bash setup.sh
> ```

## 4. Probarlo

1. En Telegram, escribe `/start` a tu bot: te responde con la lista de comandos.
2. `/test`: te llega un aviso de ejemplo con el botón «Ver en Vinted».
3. En la app o la web de Vinted, haz una búsqueda con filtros, copia el enlace y **pégalo en el chat del bot** para crear tu primer monitor.

> ¿Tenías instalada una versión anterior (con web)? Ejecuta otra vez `sudo bash setup.sh`: actualiza la app, conserva tu `.env` y detiene Caddy si solo servía para la web. Las líneas `APP_PASSWORD`, `PORT`, `VAPID_…` del `.env` ya no se usan y puedes borrarlas. Si quieres, quita también las reglas de los puertos 80/443 en Oracle y el subdominio de DuckDNS.

## Mantenimiento

| Qué | Cómo |
|---|---|
| Ver el estado | `/estado` y `/registro` en el bot |
| Ver el log completo | `journalctl -u vinted-sniper -f` (por SSH) |
| Reiniciar | `sudo systemctl restart vinted-sniper` |
| Actualizar a la última versión | `sudo bash /opt/vintedsniper/deploy/update.sh` |
| Cambiar el token o el chat ID | `sudo nano /opt/vintedsniper/.env` y reiniciar |
| Copia de seguridad de la base de datos | `sudo cp /opt/vintedsniper/data/sniper.db ~/sniper-backup.db` |

## Si algo falla

- **El bot no contesta**: mira `journalctl -u vinted-sniper -n 50`. Si dice «Falta TELEGRAM_BOT_TOKEN» o «formato», revisa el `.env`; si dice «401 Unauthorized», el token está mal copiado o revocado.
- **«out of capacity» al crear la máquina con Ampere**: usa la forma *VM.Standard.E2.1.Micro* o inténtalo más tarde.
- **Oracle avisa de que reclamará la instancia por inactividad**: pasa con máquinas casi sin uso de CPU; si te llega el aviso, convertir la cuenta a *Pay As You Go* lo evita y, sin salir de los recursos Always Free, sigue sin coste.
