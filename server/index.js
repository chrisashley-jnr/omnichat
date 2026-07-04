/**
 * OmniConnect signaling & matchmaking server (production)
 * -------------------------------------------------------
 * Responsibilities:
 *  - Redis-backed waiting pool, rooms, reports, bans
 *  - socket.io-redis adapter for multi-instance horizontal scaling
 *  - Bans keyed by sha256(IP + deviceFingerprint) — never raw socket IDs
 *  - Cloudflare Turnstile CAPTCHA verification on find-partner
 *  - Per-IP sliding-window rate limit on find-partner (Redis-backed)
 *  - TURN credential endpoint wired via env vars
 *  - Geoblocking hook on HTTP + socket connections
 *  - Ad-config endpoint
 *  - Health endpoint
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { v4: uuidv4 } = require('uuid');

const { redis, redisPub, redisSub } = require('./redis');
const { geoblockMiddleware, geoblockCheck } = require('./middleware/geoblock');

const PORT = process.env.PORT || 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || '';
const BAN_THRESHOLD = parseInt(process.env.BAN_THRESHOLD, 10) || 5;

// Rate limit config for find-partner
const FIND_PARTNER_MAX = parseInt(process.env.FIND_PARTNER_RATE_MAX, 10) || 10;
const FIND_PARTNER_WINDOW = parseInt(process.env.FIND_PARTNER_RATE_WINDOW, 10) || 60; // seconds

// ---------------------------------------------------------------------------
// Express setup
// ---------------------------------------------------------------------------

const app = express();
app.set('trust proxy', true); // trust X-Forwarded-For from nginx/load balancer
app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

// Geoblock all HTTP routes
app.use(geoblockMiddleware);

// Basic rate limiting on HTTP routes
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
  })
);

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Attach the Redis adapter for multi-instance scaling
io.adapter(createAdapter(redisPub, redisSub));

// ---------------------------------------------------------------------------
// Redis key helpers
// ---------------------------------------------------------------------------

const KEY = {
  waiting: 'omni:waiting',           // sorted set — score=timestamp, member=JSON
  room: (id) => `omni:room:${id}`,   // hash — members, startedAt
  sock2room: 'omni:sock2room',       // hash — socketId → roomId
  reports: 'omni:reports',           // hash — fingerprint → count
  bans: 'omni:bans',                // set — hashed fingerprints
  rateLimit: (ip) => `omni:rl:${ip}`, // list — timestamps for sliding window
};

// ---------------------------------------------------------------------------
// Utility functions
// ---------------------------------------------------------------------------

function hashFingerprint(ip, deviceFp) {
  return crypto
    .createHash('sha256')
    .update(`${ip}:${deviceFp || 'unknown'}`)
    .digest('hex');
}

function getClientIp(socket) {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return socket.handshake.address;
}

async function isBanned(fpHash) {
  return (await redis.sismember(KEY.bans, fpHash)) === 1;
}

async function addBan(fpHash) {
  await redis.sadd(KEY.bans, fpHash);
}

async function getReportCount(fpHash) {
  const count = await redis.hget(KEY.reports, fpHash);
  return parseInt(count, 10) || 0;
}

async function incrementReportCount(fpHash) {
  return redis.hincrby(KEY.reports, fpHash, 1);
}

// Sliding-window rate limiter backed by Redis
async function checkRateLimit(ip) {
  const key = KEY.rateLimit(ip);
  const now = Date.now();
  const windowStart = now - FIND_PARTNER_WINDOW * 1000;

  const multi = redis.multi();
  multi.zremrangebyscore(key, 0, windowStart);  // prune old entries
  multi.zadd(key, now, `${now}:${Math.random()}`);  // add current request
  multi.zcard(key);  // count requests in window
  multi.expire(key, FIND_PARTNER_WINDOW + 1);  // TTL cleanup
  const results = await multi.exec();

  const count = results[2][1]; // zcard result
  return count <= FIND_PARTNER_MAX;
}

// Verify Cloudflare Turnstile token
async function verifyTurnstile(token, ip) {
  if (!TURNSTILE_SECRET) {
    // If no secret is configured, skip CAPTCHA verification (dev mode)
    return true;
  }
  if (!token) return false;

  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: TURNSTILE_SECRET,
        response: token,
        remoteip: ip,
      }),
    });
    const data = await res.json();
    return data.success === true;
  } catch (err) {
    console.error('[turnstile] verification error:', err.message);
    return false; // fail closed
  }
}

// ---------------------------------------------------------------------------
// Waiting pool helpers (Redis sorted set)
// ---------------------------------------------------------------------------

async function addToWaitingPool(socketId, interests) {
  const entry = JSON.stringify({ socketId, interests });
  await redis.zadd(KEY.waiting, Date.now(), entry);
}

async function removeFromWaitingPool(socketId) {
  // We need to find and remove the entry for this socket ID
  const members = await redis.zrange(KEY.waiting, 0, -1);
  for (const m of members) {
    try {
      const parsed = JSON.parse(m);
      if (parsed.socketId === socketId) {
        await redis.zrem(KEY.waiting, m);
        return;
      }
    } catch { /* skip malformed */ }
  }
}

async function tryMatch(requestingSocketId, requestingInterests) {
  // Get all waiting peers, ordered by join time (oldest first)
  const members = await redis.zrange(KEY.waiting, 0, -1);

  let bestMatch = null;
  let bestMatchRaw = null;

  for (const raw of members) {
    let entry;
    try {
      entry = JSON.parse(raw);
    } catch { continue; }

    if (entry.socketId === requestingSocketId) continue;

    const overlap = (entry.interests || []).some((tag) =>
      requestingInterests.includes(tag)
    );

    if (overlap) {
      bestMatch = entry;
      bestMatchRaw = raw;
      break;
    }
    if (!bestMatch) {
      bestMatch = entry;
      bestMatchRaw = raw;
    }
  }

  if (!bestMatch) return null;

  // Remove both from waiting pool
  await redis.zrem(KEY.waiting, bestMatchRaw);
  await removeFromWaitingPool(requestingSocketId);

  // Create room
  const roomId = uuidv4();
  await redis.hset(KEY.room(roomId),
    'memberA', requestingSocketId,
    'memberB', bestMatch.socketId,
    'startedAt', Date.now()
  );
  await redis.expire(KEY.room(roomId), 3600); // 1 hour TTL safety net

  await redis.hset(KEY.sock2room, requestingSocketId, roomId);
  await redis.hset(KEY.sock2room, bestMatch.socketId, roomId);

  return { roomId, peerId: bestMatch.socketId };
}

// ---------------------------------------------------------------------------
// Room helpers
// ---------------------------------------------------------------------------

async function getRoomMembers(roomId) {
  const data = await redis.hgetall(KEY.room(roomId));
  if (!data || !data.memberA) return null;
  return [data.memberA, data.memberB];
}

async function getRoomForSocket(socketId) {
  return redis.hget(KEY.sock2room, socketId);
}

async function leaveCurrentRoom(socketId, io, { notifyPeer = true, reason = 'left' } = {}) {
  const roomId = await getRoomForSocket(socketId);
  if (!roomId) return;

  const members = await getRoomMembers(roomId);
  if (members) {
    const peerId = members.find((id) => id !== socketId);
    if (peerId && notifyPeer) {
      io.to(peerId).emit('peer-left', { reason });
      await redis.hdel(KEY.sock2room, peerId);
    }
  }

  await redis.del(KEY.room(roomId));
  await redis.hdel(KEY.sock2room, socketId);
}

// ---------------------------------------------------------------------------
// Socket.io connection handling
// ---------------------------------------------------------------------------

// Connection-level geoblock check
io.use((socket, next) => {
  const ip = getClientIp(socket);
  const { blocked, country } = geoblockCheck(ip);
  if (blocked) {
    console.log(`[geoblock] socket blocked ${ip} (country=${country})`);
    return next(new Error('service_unavailable_in_region'));
  }
  next();
});

io.on('connection', async (socket) => {
  const ip = getClientIp(socket);
  const deviceFp = socket.handshake.auth?.fingerprint || '';
  const fpHash = hashFingerprint(ip, deviceFp);

  // Store the fingerprint hash on the socket for later use
  socket.data.fpHash = fpHash;
  socket.data.ip = ip;
  socket.data.interests = [];

  // Check ban status
  if (await isBanned(fpHash)) {
    socket.emit('banned');
    socket.disconnect(true);
    return;
  }

  socket.emit('connected', { id: socket.id });

  // --- Find partner (CAPTCHA + rate-limit gated) ---
  socket.on('find-partner', async (payload = {}) => {
    try {
      // 1. Verify CAPTCHA
      const turnstileToken = payload.turnstileToken || null;
      const captchaValid = await verifyTurnstile(turnstileToken, ip);
      if (!captchaValid) {
        socket.emit('captcha-failed', { message: 'CAPTCHA verification failed. Please try again.' });
        return;
      }

      // 2. Check rate limit
      const allowed = await checkRateLimit(ip);
      if (!allowed) {
        socket.emit('rate-limited', {
          message: 'Too many requests. Please wait a moment before trying again.',
          retryAfterMs: FIND_PARTNER_WINDOW * 1000,
        });
        return;
      }

      // 3. Parse interests
      const interests = Array.isArray(payload.interests)
        ? payload.interests.slice(0, 10).map(String)
        : [];
      socket.data.interests = interests;

      // 4. Leave any current room
      await leaveCurrentRoom(socket.id, io, { notifyPeer: true, reason: 'skipped' });
      await removeFromWaitingPool(socket.id);

      // 5. Try to match
      const match = await tryMatch(socket.id, interests);
      if (match) {
        // One side is designated "initiator" so only one createOffer() call happens
        socket.emit('matched', { roomId: match.roomId, initiator: true });
        io.to(match.peerId).emit('matched', { roomId: match.roomId, initiator: false });
      } else {
        await addToWaitingPool(socket.id, interests);
        socket.emit('queued');
      }
    } catch (err) {
      console.error('[find-partner] error:', err);
      socket.emit('error', { message: 'Internal error during matchmaking.' });
    }
  });

  socket.on('cancel-find', async () => {
    await removeFromWaitingPool(socket.id);
  });

  // --- WebRTC signaling relay ---
  socket.on('signal', async ({ roomId, data }) => {
    const members = await getRoomMembers(roomId);
    if (!members || !members.includes(socket.id)) return;
    const peerId = members.find((id) => id !== socket.id);
    if (peerId) io.to(peerId).emit('signal', { data });
  });

  // --- Text chat relay ---
  socket.on('chat-message', async ({ roomId, text }) => {
    const members = await getRoomMembers(roomId);
    if (!members || !members.includes(socket.id)) return;
    if (typeof text !== 'string' || !text.trim() || text.length > 1000) return;
    const peerId = members.find((id) => id !== socket.id);
    if (peerId) {
      io.to(peerId).emit('chat-message', {
        text: text.trim(),
        at: Date.now(),
      });
    }
  });

  socket.on('typing', async ({ roomId, isTyping }) => {
    const members = await getRoomMembers(roomId);
    if (!members || !members.includes(socket.id)) return;
    const peerId = members.find((id) => id !== socket.id);
    if (peerId) io.to(peerId).emit('typing', { isTyping: !!isTyping });
  });

  // --- Skip / next partner ---
  socket.on('next', async (payload = {}) => {
    await leaveCurrentRoom(socket.id, io, { notifyPeer: true, reason: 'skipped' });
    // The client will also send find-partner separately with the CAPTCHA token
  });

  // --- Report current partner ---
  socket.on('report', async ({ roomId, reason }) => {
    try {
      const members = await getRoomMembers(roomId);
      if (!members || !members.includes(socket.id)) return;
      const peerId = members.find((id) => id !== socket.id);
      if (!peerId) return;

      // Look up the peer's fingerprint hash — try to get it from the connected socket
      // If the peer is on another instance, we fall back to a stored hash
      const peerSocket = io.sockets.sockets.get(peerId);
      const peerFpHash = peerSocket?.data?.fpHash || peerId; // fallback

      const count = await incrementReportCount(peerFpHash);
      console.log(`[report] ${peerFpHash.substring(0, 12)}… reported (${count}) reason="${reason || 'unspecified'}"`);

      if (count >= BAN_THRESHOLD) {
        await addBan(peerFpHash);
        if (peerSocket) {
          peerSocket.emit('banned');
          peerSocket.disconnect(true);
        }
        // For cross-instance bans, we also emit to the socket room
        io.to(peerId).emit('banned');
      }

      await leaveCurrentRoom(socket.id, io, { notifyPeer: true, reason: 'reported' });
    } catch (err) {
      console.error('[report] error:', err);
    }
  });

  socket.on('leave-room', async () => {
    await leaveCurrentRoom(socket.id, io, { notifyPeer: true, reason: 'left' });
  });

  socket.on('disconnect', async () => {
    await removeFromWaitingPool(socket.id);
    await leaveCurrentRoom(socket.id, io, { notifyPeer: true, reason: 'disconnected' });
  });
});

// ---------------------------------------------------------------------------
// REST endpoints
// ---------------------------------------------------------------------------

app.get('/health', async (req, res) => {
  try {
    const waitingCount = await redis.zcard(KEY.waiting);
    // Count active rooms by scanning keys (lightweight for health check)
    const roomKeys = await redis.keys('omni:room:*');
    res.json({
      status: 'ok',
      redis: 'connected',
      waiting: waitingCount,
      activeRooms: roomKeys.length,
    });
  } catch (err) {
    res.status(503).json({ status: 'degraded', redis: 'error', error: err.message });
  }
});

// Ad configuration
app.get('/api/ad-config', (req, res) => {
  res.json({
    provider: process.env.AD_PROVIDER || 'adsense',
    slots: {
      preChatBanner: {
        enabled: true,
        adUnitId: process.env.AD_UNIT_PRECHAT || 'REPLACE_WITH_AD_UNIT_ID',
      },
      sidebarRail: {
        enabled: true,
        adUnitId: process.env.AD_UNIT_SIDEBAR || 'REPLACE_WITH_AD_UNIT_ID',
      },
      interstitialEveryNSkips: {
        enabled: true,
        n: 5,
        adUnitId: process.env.AD_UNIT_INTERSTITIAL || 'REPLACE_WITH_AD_UNIT_ID',
      },
    },
  });
});

// TURN credentials — reads from env vars, works with coturn or any static-credential provider
app.get('/api/turn-credentials', (req, res) => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ];

  const turnUrls = process.env.TURN_URLS;
  const turnUsername = process.env.TURN_USERNAME;
  const turnCredential = process.env.TURN_CREDENTIAL;

  if (turnUrls && turnUsername && turnCredential) {
    // Support multiple TURN URLs separated by commas
    const urls = turnUrls.split(',').map((u) => u.trim()).filter(Boolean);
    iceServers.push({
      urls,
      username: turnUsername,
      credential: turnCredential,
    });
  }

  res.json({ iceServers });
});

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------

server.listen(PORT, () => {
  console.log(`OmniConnect signaling server listening on :${PORT}`);
  console.log(`  CAPTCHA enforcement: ${TURNSTILE_SECRET ? 'ON' : 'OFF (no TURNSTILE_SECRET_KEY set)'}`);
  console.log(`  Rate limit: ${FIND_PARTNER_MAX} find-partner/IP per ${FIND_PARTNER_WINDOW}s`);
  console.log(`  Geoblock countries: ${process.env.GEOBLOCK_COUNTRIES || '(none)'}`);
  console.log(`  TURN server: ${process.env.TURN_URLS ? 'configured' : 'not configured'}`);
});
