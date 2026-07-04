/**
 * Redis client singleton
 * ---------------------
 * Exports three things:
 *  - `redis`    — general-purpose client for reads/writes
 *  - `redisPub` — publish-only client for the socket.io-redis adapter
 *  - `redisSub` — subscribe-only client for the socket.io-redis adapter
 *
 * All three connect to the same Redis instance specified by REDIS_URL.
 */

const Redis = require('ioredis');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,  // required by @socket.io/redis-adapter
  enableReadyCheck: true,
  retryStrategy(times) {
    const delay = Math.min(times * 200, 5000);
    return delay;
  },
});

redis.on('connect', () => console.log('[redis] connected'));
redis.on('error', (err) => console.error('[redis] client error:', err.message));

// The socket.io Redis adapter requires dedicated pub/sub clients
const redisPub = redis.duplicate();
const redisSub = redis.duplicate();

// Attach error handlers to duplicate clients as well
redisPub.on('connect', () => console.log('[redis-pub] connected'));
redisPub.on('error', (err) => console.error('[redis-pub] client error:', err.message));

redisSub.on('connect', () => console.log('[redis-sub] connected'));
redisSub.on('error', (err) => console.error('[redis-sub] client error:', err.message));

module.exports = { redis, redisPub, redisSub };
