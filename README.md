# OmniConnect — random 1:1 video chat platform

A production-hardened full-stack repository for an Omegle/Monkey-style random video chat application.

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend:** Express + Socket.io (matchmaking + WebRTC signaling relay)
- **State Store:** Redis (waiting pool, matchmaking queue, active rooms, report counts, and bans)
- **Security:** Cloudflare Turnstile CAPTCHA + per-IP queue rate-limiting + SHA-256 IP/device-fingerprint bans
- **Video/audio:** WebRTC peer-to-peer (browser-to-browser with optional TURN server credentials relay)

---

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- Redis server running locally (default: `redis://localhost:6379`)

### Running Locally (Bare Metal)

**1. Start Redis**
Make sure your local Redis server is running:
```bash
redis-server
```

**2. Start Backend**
```bash
cd server
cp .env.example .env
npm install
npm run dev        # http://localhost:4000
```

**3. Start Frontend**
```bash
cd client
cp .env.local.example .env.local
npm install
npm run dev         # http://localhost:3000
```

Open `http://localhost:3000` (or `3001` if port `3000` is busy) in two browser windows to test matchmaking.

---

## Running with Docker Compose (Production Setup)

Refer to [DEPLOYMENT.md](file:///Users/cashley/Downloads/omniconnect/DEPLOYMENT.md) for full instructions, including setting up SSL certificates for Nginx.

To spin up all services including Nginx TLS proxy and Redis:
```bash
docker compose up -d --build
```
Access the application at `https://localhost`.

---

## Wiring up TURN and CAPTCHA

1. **TURN Servers:** Set `TURN_URLS`, `TURN_USERNAME`, and `TURN_CREDENTIAL` in `server/.env`.
2. **CAPTCHA:** Add Turnstile keys in `server/.env` (`TURNSTILE_SECRET_KEY`) and `client/.env.local` (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`). By default, it uses Cloudflare's invisible testing keys which bypass challenges automatically.
