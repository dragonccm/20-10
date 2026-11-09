"use client"

/**
 * Tiny IndexedDB key-value store. localStorage caps out around 5MB, which is too small for
 * uploaded files and image-heavy designs; IndexedDB typically allows hundreds of MB.
 */
const DB = "bloom"
const STORE = "kv"

let dbp: Promise<IDBDatabase> | null = null

function open() {
  if (!dbp) {
    dbp = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB, 1)
      req.onupgradeneeded = () => req.result.createObjectStore(STORE)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
    dbp.catch(() => (dbp = null))
  }
  return dbp
}

function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE, mode)
        const req = fn(tx.objectStore(STORE))
        tx.oncomplete = () => resolve(req.result as T)
        tx.onerror = () => reject(tx.error)
        tx.onabort = () => reject(tx.error)
      }),
  )
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    return await run<T | undefined>("readonly", (s) => s.get(key))
  } catch {
    return undefined
  }
}

export async function idbSet(key: string, value: unknown): Promise<boolean> {
  try {
    await run("readwrite", (s) => s.put(value, key))
    return true
  } catch {
    return false
  }
}

export async function idbDel(key: string) {
  try {
    await run("readwrite", (s) => s.delete(key))
  } catch {
    /* ignore */
  }
}
