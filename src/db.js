// IndexedDB wrapper for Servfixy offline mode
const DB_NAME = 'servfixy-tech';
const DB_VERSION = 1;

const STORES = {
  JOBS: 'jobs',
  QUEUE: 'offlineQueue',
  AUTH: 'auth',
};

let _db = null;

function openDB() {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORES.JOBS)) {
        db.createObjectStore(STORES.JOBS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORES.QUEUE)) {
        const qs = db.createObjectStore(STORES.QUEUE, { keyPath: 'id', autoIncrement: true });
        qs.createIndex('createdAt', 'createdAt');
      }
      if (!db.objectStoreNames.contains(STORES.AUTH)) {
        db.createObjectStore(STORES.AUTH, { keyPath: 'key' });
      }
    };
    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror = () => reject(req.error);
  });
}

function tx(storeName, mode, fn) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, mode);
      const store = transaction.objectStore(storeName);
      const req = fn(store);
      if (req && typeof req.onsuccess !== 'undefined') {
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } else {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
      }
    });
  });
}

// ── Jobs ──────────────────────────────────────────────────────────────────────

export function cacheJobs(jobs) {
  return openDB().then(db => {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORES.JOBS, 'readwrite');
      const store = transaction.objectStore(STORES.JOBS);
      jobs.forEach(job => store.put(job));
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
  });
}

export function getCachedJobs() {
  return tx(STORES.JOBS, 'readonly', store => store.getAll());
}

export function getCachedJob(id) {
  return tx(STORES.JOBS, 'readonly', store => store.get(id));
}

export function updateCachedJob(job) {
  return tx(STORES.JOBS, 'readwrite', store => store.put(job));
}

// ── Offline Queue ─────────────────────────────────────────────────────────────

export function enqueue(action) {
  // action: { type, payload, url, method }
  return tx(STORES.QUEUE, 'readwrite', store =>
    store.add({ ...action, createdAt: Date.now() })
  );
}

export function getAllQueued() {
  return tx(STORES.QUEUE, 'readonly', store => store.getAll());
}

export function dequeue(id) {
  return tx(STORES.QUEUE, 'readwrite', store => store.delete(id));
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export function saveAuth(user, token) {
  return tx(STORES.AUTH, 'readwrite', store =>
    store.put({ key: 'session', user, token })
  );
}

export function getAuth() {
  return tx(STORES.AUTH, 'readonly', store => store.get('session'));
}

export function clearAuth() {
  return tx(STORES.AUTH, 'readwrite', store => store.delete('session'));
}
