// useApi hook — cached fetch wrapper with loading/error state management
import { useState, useEffect, useCallback, useRef } from 'react';
import { api, ApiError } from '../utils/api.jsx';
import { cacheGet, cacheSet } from '../utils/cache.jsx';

/**
 * useApi — generic hook for making API requests with loading/error/data state.
 *
 * @param {string}  path       - API endpoint path (e.g. '/api/user/stats')
 * @param {object}  [options]
 * @param {boolean} [options.immediate] - Fetch immediately on mount (default: true)
 * @param {boolean} [options.cache]     - Use IndexedDB caching (default: false)
 * @param {number}  [options.cacheTtl]  - Cache TTL in ms (default: 30000)
 * @param {object}  [options.deps]      - Additional deps that trigger a refetch
 * @returns {{ data, loading, error, refetch }}
 */
export function useApi(path, { immediate = true, cache = false, cacheTtl = 30000, deps = [] } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const fetch_ = useCallback(async () => {
    if (!path) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const cacheKey = `useApi:${path}`;
      if (cache) {
        const cached = await cacheGet(cacheKey);
        if (cached) { setData(cached); setLoading(false); return; }
      }
      const result = await api.get(path, { signal: controller.signal });
      setData(result);
      if (cache) await cacheSet(cacheKey, result, cacheTtl);
    } catch (err) {
      if (err?.name !== 'AbortError') {
        setError(err instanceof ApiError ? err : new Error(err?.message || 'Request failed.'));
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, cache, cacheTtl, ...deps]);

  useEffect(() => {
    if (immediate) fetch_();
    return () => abortRef.current?.abort();
  }, [fetch_, immediate]);

  return { data, loading, error, refetch: fetch_ };
}

/**
 * usePost — hook for making POST requests with loading/error state.
 *
 * @param {string} path - API endpoint path
 * @returns {{ post, data, loading, error, reset }}
 */
export function usePost(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const post = useCallback(async (body, opts = {}) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.post(path, { body, ...opts });
      setData(result);
      return result;
    } catch (err) {
      const apiErr = err instanceof ApiError ? err : new Error(err?.message || 'Request failed.');
      setError(apiErr);
      throw apiErr;
    } finally {
      setLoading(false);
    }
  }, [path]);

  const reset = useCallback(() => { setData(null); setError(null); }, []);

  return { post, data, loading, error, reset };
}
