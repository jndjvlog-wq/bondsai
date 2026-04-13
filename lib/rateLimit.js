// lib/rateLimit.js — Simple in-memory rate limiter for Next.js API routes

const store = new Map();

/**
 * Rate limit middleware for Next.js API routes.
 * @param {number} windowMs - Time window in milliseconds (default: 60000 = 1 min)
 * @param {number} max - Max requests per window (default: 30)
 */
function rateLimit({ windowMs = 60000, max = 30 } = {}) {
  return function limiter(req, res) {
    const ip =
      req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      'unknown';

    const now = Date.now();
    const key = `${ip}`;

    if (!store.has(key)) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return true; // allowed
    }

    const record = store.get(key);

    if (now > record.resetAt) {
      // Window expired — reset
      store.set(key, { count: 1, resetAt: now + windowMs });
      return true;
    }

    if (record.count >= max) {
      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('Retry-After', Math.ceil((record.resetAt - now) / 1000));
      res.status(429).json({
        error: 'Too many requests. Please wait before searching again.',
        retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000),
      });
      return false; // blocked
    }

    record.count++;
    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', max - record.count);
    return true; // allowed
  };
}

module.exports = rateLimit;
