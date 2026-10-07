// Server-side response cache using node-cache
import NodeCache from 'node-cache';

const cache = new NodeCache({
  stdTTL: 300, // 5 minutes default
  checkperiod: 60,
  useClones: false,
});

export function cacheMiddleware(ttl = 300) {
  return (req, res, next) => {
    if (req.method !== 'GET') return next();

    const key = `${req.userId || 'anon'}:${req.originalUrl}`;
    const cached = cache.get(key);
    if (cached) {
      return res.json(cached);
    }

    // Override res.json to cache the response
    const originalJson = res.json.bind(res);
    res.json = (data) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        cache.set(key, data, ttl);
      }
      return originalJson(data);
    };

    next();
  };
}

export function invalidateCache(pattern) {
  const keys = cache.keys();
  for (const key of keys) {
    if (key.includes(pattern)) {
      cache.del(key);
    }
  }
}

export { cache };
