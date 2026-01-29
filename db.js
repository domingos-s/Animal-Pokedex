const DB_NAME = "animal_dex_db";
const DB_VERSION = 1;
const STORE = "captures";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("by_createdAt", "createdAt");
        store.createIndex("by_name", "name");
        store.createIndex("by_type", "type");
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, mode = "readonly") {
  return db.transaction(STORE, mode).objectStore(STORE);
}

export async function addCapture(capture) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = tx(db, "readwrite");
    const req = store.add(capture);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllCaptures() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = tx(db, "readonly");
    const req = store.getAll();
    req.onsuccess = () => {
      const list = req.result || [];
      // newest first
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function deleteCapture(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const store = tx(db, "readwrite");
    const req = store.delete(id);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}
