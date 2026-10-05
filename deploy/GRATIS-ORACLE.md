# Desplegar gratis en Oracle Cloud (Always Free)

Oracle Cloud regala para siempre una máquina virtual pequeña que está encendida 24/7 y tiene disco propio. Es justo lo que necesita el sniper. Tiempo aproximado: 20–30 minutos.

Necesitarás:
- Una tarjeta para verificar la cuenta. **No se cobra** mientras uses recursos «Always Free»; la cuenta empieza con 300 $ de prueba y después pasa sola al nivel gratuito.
- Un subdominio gratis de **DuckDNS** para tener HTTPS (imprescindible para el iPhone).

> ⚠️ Las IPs de Oracle son de centro de datos y Vinted puede limitarlas (lo verás como «Limitado» en los monitores). Si pasa mucho, sube el intervalo a 60–90 s desde Ajustes.

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
4. **Networking**: deja que cree la red (VCN) y marca **Assign a public IPv4 address**.
5. **Add SSH keys**: pulsa **Generate a key pair for me** y **descarga la clave privada** (`.key`). La necesitas para entrar.
6. **Create**. En un par de minutos estará en *Running*. Apunta la **Public IP address**.

## 3. Abrir los puertos 80 y 443 en Oracle

1. En la página de la instancia, pulsa el enlace de la **Subnet** → **Security Lists** → *Default Security List*.
2. **Add Ingress Rules** y añade dos reglas:
   - Source CIDR `0.0.0.0/0`, IP Protocol TCP, Destination Port **80**
   - Source CIDR `0.0.0.0/0`, IP Protocol TCP, Destination Port **443**

(El cortafuegos interno de Ubuntu lo abre el script automáticamente.)

## 4. Subdominio gratis con DuckDNS

1. Entra en <https://www.duckdns.org> (con Google o GitHub).
2. Crea un subdominio, por ejemplo `misniper` → `misniper.duckdns.org`.
3. En **current ip** pon la **IP pública** de tu instancia y pulsa **update ip**.

## 5. Instalar el sniper (un solo comando)

Conéctate por SSH a la máquina:

- **Mac / Linux** (Terminal):
  ```bash
  chmod 400 ~/Downloads/ssh-key-*.key
  ssh -i ~/Downloads/ssh-key-*.key ubuntu@TU_IP
  ```
- **Windows**: abre *PowerShell* y usa el mismo comando `ssh -i RUTA\a\la\clave.key ubuntu@TU_IP`.
- **Desde el navegador**: en la instancia de Oracle también tienes *Cloud Shell → SSH*.

Una vez dentro, ejecuta (cambia el dominio y la contraseña):

```bash
curl -fsSL https://raw.githubusercontent.com/pertx1/vintedsniper/claude/charming-mayer-9520k7/deploy/setup-vps.sh -o setup.sh
sudo bash setup.sh misniper.duckdns.org UnaContraseñaLarga
```

El script instala Node 22 y Caddy (que saca el certificado HTTPS solo), descarga la app, genera las claves VAPID y el `.env`, y la deja como servicio que arranca sola. Al final verás **✅ Listo**.

> **Si el repositorio es privado**, GitHub no dejará descargarlo así. Crea un token en GitHub (*Settings → Developer settings → Fine-grained tokens*, con permiso de lectura de *Contents* sobre este repo) y:
> ```bash
> curl -fsSL -H "Authorization: token TU_TOKEN" https://raw.githubusercontent.com/pertx1/vintedsniper/claude/charming-mayer-9520k7/deploy/setup-vps.sh -o setup.sh
> sudo REPO_URL=https://TU_TOKEN@github.com/pertx1/vintedsniper.git bash setup.sh misniper.duckdns.org UnaContraseñaLarga
> ```

## 6. Usarlo en el iPhone

1. Abre `https://misniper.duckdns.org` en **Safari** e inicia sesión.
2. **Compartir → Añadir a pantalla de inicio**.
3. Abre la app desde el icono, inicia sesión de nuevo, ve a **Ajustes → Activar notificaciones** y luego **Enviar notificación de prueba**.

## Mantenimiento

| Qué | Comando (por SSH) |
|---|---|
| Ver el log en directo | `journalctl -u vinted-sniper -f` |
| Reiniciar | `sudo systemctl restart vinted-sniper` |
| Actualizar a la última versión | `sudo bash /opt/vintedsniper/deploy/update.sh` |
| Cambiar contraseña u otros ajustes | `sudo nano /opt/vintedsniper/.env` y reiniciar |
| Copia de seguridad de la base de datos | `sudo cp /opt/vintedsniper/data/sniper.db ~/sniper-backup.db` |

## Si algo falla

- **La web no carga**: comprueba las reglas de ingreso del paso 3 y que DuckDNS tiene la IP correcta (`ping misniper.duckdns.org`).
- **Error de certificado**: mira `journalctl -u caddy -n 50`. Casi siempre son los puertos 80/443 cerrados o la IP mal puesta en DuckDNS.
- **«out of capacity» al crear la máquina con Ampere**: usa la forma *VM.Standard.E2.1.Micro* o inténtalo más tarde.
- **Oracle avisa de que reclamará la instancia por inactividad**: pasa con máquinas casi sin uso de CPU; si te llega el aviso, convertir la cuenta a *Pay As You Go* lo evita y, sin salir de los recursos Always Free, sigue sin coste.
