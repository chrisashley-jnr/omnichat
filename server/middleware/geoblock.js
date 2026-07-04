/**
 * Geoblock middleware
 * -------------------
 * Blocks requests originating from countries listed in the GEOBLOCK_COUNTRIES
 * environment variable (comma-separated ISO 3166-1 alpha-2 codes).
 *
 * Ships with an EMPTY list by default — this is purely the mechanism.
 * Populate the list only after obtaining legal guidance on which jurisdictions
 * to block.
 *
 * Uses geoip-lite which bundles a MaxMind GeoLite2-Country database.
 * The database is loaded into memory on first require() — ~60 MB RAM.
 */

const geoip = require('geoip-lite');

const raw = process.env.GEOBLOCK_COUNTRIES || '';
const blockedCountries = new Set(
  raw
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean)
);

function geoblockMiddleware(req, res, next) {
  if (blockedCountries.size === 0) return next();

  // Support proxied connections (X-Forwarded-For) and direct connections
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded ? forwarded.split(',')[0].trim() : req.socket.remoteAddress;

  // Skip localhost/private IPs
  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return next();
  }

  const geo = geoip.lookup(ip);
  if (geo && blockedCountries.has(geo.country)) {
    console.log(`[geoblock] blocked ${ip} (country=${geo.country})`);
    return res.status(403).json({
      error: 'service_unavailable_in_region',
      message: 'This service is not available in your region.',
    });
  }

  next();
}

// Also export a socket.io-compatible check for use in connection middleware
function geoblockCheck(ip) {
  if (blockedCountries.size === 0) return { blocked: false };

  if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    return { blocked: false };
  }

  const geo = geoip.lookup(ip);
  if (geo && blockedCountries.has(geo.country)) {
    return { blocked: true, country: geo.country };
  }
  return { blocked: false };
}

module.exports = { geoblockMiddleware, geoblockCheck };
