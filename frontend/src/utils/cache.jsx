// IndexedDB + in-memory cache layer for EVA Speak
const DB_NAME = 'eva-speak-cache';
const DB_VERSION = 1;
const STORE_NAME = 'responses';
const MEM_CACHE = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function cacheGet(key) {
  // Check memory first
  const memEntry = MEM_CACHE.get(key);
  if (memEntry && Date.now() < memEntry.expiresAt) {
    return memEntry.data;
  }
  MEM_CACHE.delete(key);

  // Check IndexedDB
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        const entry = request.result;
        if (entry && Date.now() < entry.expiresAt) {
          MEM_CACHE.set(key, entry);
          resolve(entry.data);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function cacheSet(key, data, ttl = DEFAULT_TTL) {
  const entry = { key, data, expiresAt: Date.now() + ttl, createdAt: Date.now() };
  MEM_CACHE.set(key, entry);

  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(entry);
  } catch {
    // IndexedDB failure is non-critical
  }
}

export async function cacheDelete(key) {
  MEM_CACHE.delete(key);
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(key);
  } catch {
    // Non-critical
  }
}

export async function cacheClear() {
  MEM_CACHE.clear();
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
  } catch {
    // Non-critical
  }
}
