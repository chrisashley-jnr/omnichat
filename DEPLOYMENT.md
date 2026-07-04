# Production Deployment Guide

This guide outlines how to deploy OmniConnect using Docker Compose, configured with Redis state sharing, Cloudflare Turnstile, TURN routing, and an Nginx SSL reverse proxy.

## Prerequisites
- Docker & Docker Compose installed
- A domain name pointing to your server's IP address
- SSL Certificates (Let's Encrypt or self-signed for testing)
- Cloudflare Turnstile site & secret keys (free)

---

## 1. Environment Config Setup

Create a `.env` file in the root project folder containing your production credentials:

```bash
# Cloudflare Turnstile keys
TURNSTILE_SECRET_KEY=1x0000000000000000000000000000000UN
NEXT_PUBLIC_TURNSTILE_SITE_KEY=1x0000000000000000000000000000000AA

# TURN settings
TURN_URLS=turn:turn.yourdomain.com:3478,turns:turn.yourdomain.com:5349
TURN_USERNAME=my-turn-username
TURN_CREDENTIAL=my-secure-turn-password

# Geoblocking (e.g. US,CA,GB)
GEOBLOCK_COUNTRIES=
```

---

## 2. SSL/TLS Certificate Setup

Place your certificate files inside the `./nginx/certs/` folder:
- **Certificate file:** `nginx/certs/server.crt`
- **Private key file:** `nginx/certs/server.key`

### Creating self-signed certificates for testing:
If you just want to run locally with HTTPS, run:
```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/certs/server.key \
  -out nginx/certs/server.crt \
  -subj "/CN=localhost"
```

---

## 3. Running with Docker Compose

Run the following command in the root project directory to start the services in the background:
```bash
docker compose up -d --build
```

This will launch:
1. **Redis** (Port 6379, with AOF persistence turned on)
2. **Server** (Port 4000 internally)
3. **Client** (Port 3000 internally)
4. **Nginx** (Ports 80/443, reverse proxying and handling TLS)

You can check status or inspect logs with:
```bash
docker compose ps
docker compose logs -f
```

---

## 4. Horizontal Scaling

Because the server uses the `@socket.io/redis-adapter`, you can scale the Express signaling server horizontally. Nginx is configured to round-robin request load.

To spin up 3 instances of the backend signaling server:
```bash
docker compose up -d --scale server=3
```

---

## 5. coturn Server Guide (TURN setup)

To self-host a coturn instance on Ubuntu:
1. Install coturn: `sudo apt install coturn`
2. Edit `/etc/turnserver.conf`:
   ```conf
   listening-port=3478
   tls-listening-port=5349
   fingerprint
   lt-cred-mech
   use-auth-secret
   static-auth-secret=your-long-random-secret
   realm=yourdomain.com
   total-quota=100
   bps-capacity=0
   stale-nonce=600
   cert=/etc/letsencrypt/live/yourdomain.com/fullchain.pem
   pkey=/etc/letsencrypt/live/yourdomain.com/privkey.pem
   log-file=/var/log/turnserver.log
   ```
3. Enable and start: `sudo systemctl enable coturn && sudo systemctl start coturn`
