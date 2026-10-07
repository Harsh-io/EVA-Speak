// Node-cache / Redis adapter — centralized cache service for backend
// Currently wraps node-cache; can swap to Redis by updating this file only.
import NodeCache from 'node-cache';

const DEFAULT_TTL = 300; // 5 minutes
const cache = new NodeCache({ stdTTL: DEFAULT_TTL, checkperiod: 60, useClones: false });

export const cacheService = {
  /**
   * Get a cached value by key.
   * @param {string} key
   * @returns {any | undefined}
   */
  get(key) {
    return cache.get(key);
  },

  /**
   * Set a value in cache.
   * @param {string} key
   * @param {any}    value
   * @param {number} [ttl]  - TTL in seconds (default: 300)
   */
  set(key, value, ttl = DEFAULT_TTL) {
    cache.set(key, value, ttl);
  },

  /**
   * Delete a key from cache.
   * @param {string} key
   */
  del(key) {
    cache.del(key);
  },

  /**
   * Delete all keys matching a string pattern (substring match).
   * @param {string} pattern
   */
  invalidatePattern(pattern) {
    const keys = cache.keys();
    for (const key of keys) {
      if (key.includes(pattern)) {
        cache.del(key);
      }
    }
  },

  /**
   * Flush all keys.
   */
  flush() {
    cache.flushAll();
  },

  /**
   * Return cache stats.
   */
  stats() {
    return cache.getStats();
  },
};

export default cacheService;
