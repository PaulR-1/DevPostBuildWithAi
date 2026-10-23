const DB_NAME = "focusrot";
const DB_VERSION = 1;
const SETTINGS = "settings";
const SESSIONS = "sessions";

export type PastSession = {
  id?: number;
  finishedAt: number;
  sessionLengthMs: number;
  elapsedMs: number;
  distractions: number;
};

export type SettingKey = "chosenMemeId" | "calibration" | "profile" | "customMemes";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(SETTINGS)) db.createObjectStore(SETTINGS);
      if (!db.objectStoreNames.contains(SESSIONS)) db.createObjectStore(SESSIONS, { keyPath: "id", autoIncrement: true });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function run<T>(store: string, mode: IDBTransactionMode, action: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const request = action(tx.objectStore(store));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error ?? new Error("storage refused the write"));
  });
}

export function getSetting<T>(key: SettingKey): Promise<T | undefined> {
  return run<T | undefined>(SETTINGS, "readonly", (s) => s.get(key));
}

export async function setSetting(key: SettingKey, value: unknown): Promise<void> {
  await run(SETTINGS, "readwrite", (s) => s.put(value, key));
}

export async function deleteSetting(key: SettingKey): Promise<void> {
  await run(SETTINGS, "readwrite", (s) => s.delete(key));
}

export async function addSession(session: PastSession): Promise<void> {
  await run(SESSIONS, "readwrite", (s) => s.add(session));
}

export async function clearSessions(): Promise<void> {
  await run(SESSIONS, "readwrite", (s) => s.clear());
}

/** Newest first. */
export async function listSessions(): Promise<PastSession[]> {
  const all = await run<PastSession[]>(SESSIONS, "readonly", (s) => s.getAll());
  return all.sort((a, b) => b.finishedAt - a.finishedAt);
}
