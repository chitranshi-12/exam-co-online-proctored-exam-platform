/**
 * IndexedDB storage for student offline violation queue and state caching.
 * Synchronizes automatically when the connection returns.
 */

export interface QueuedViolation {
  id: string;
  attemptId: string;
  examId: string;
  type: string;
  occurredAt: string;
  details?: string;
  screenshotDataUrl?: string;
  webcamDataUrl?: string;
  synced: boolean;
}

const DB_NAME = 'exam_co_student_db';
const STORE_NAME = 'offline_violations';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function queueOfflineViolation(violation: QueuedViolation): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(violation);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Could not queue violation in IndexedDB, fallback to memory:', err);
  }
}

export async function getPendingOfflineViolations(): Promise<QueuedViolation[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const results = (req.result as QueuedViolation[]) || [];
        resolve(results.filter((item) => !item.synced));
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function markOfflineViolationsSynced(ids: string[]): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    for (const id of ids) {
      store.delete(id);
    }
  } catch (err) {
    console.warn('Failed to delete synced items from IndexedDB:', err);
  }
}
