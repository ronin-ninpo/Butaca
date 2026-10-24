import { createStore, get, set, clear, entries, delMany } from 'idb-keyval';

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

interface CacheEntry<T> {
  v: T;
  exp: number;
}

let store: ReturnType<typeof createStore> | null = null;
function idb() {
  if (!store && typeof indexedDB !== 'undefined') {
    try {
      store = createStore('butaca-cache', 'kv');
    } catch {
      store = null;
    }
  }
  return store;
}

const mem = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

/** Devuelve el valor cacheado (memoria → IndexedDB) o lo calcula con fn. Los errores no se cachean. */
export function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = mem.get(key);
  if (hit && hit.exp > now) return Promise.resolve(hit.v as T);
  const pending = inflight.get(key);
  if (pending) return pending as Promise<T>;

  const p = (async () => {
    const s = idb();
    if (s) {
      try {
        const e = (await get(key, s)) as CacheEntry<T> | undefined;
        if (e && e.exp > Date.now()) {
          mem.set(key, e);
          return e.v;
        }
      } catch {
        /* IndexedDB no disponible: seguimos sin caché persistente */
      }
    }
    const v = await fn();
    const entry: CacheEntry<T> = { v, exp: Date.now() + ttl };
    mem.set(key, entry);
    if (s) set(key, entry, s).catch(() => {});
    return v;
  })().finally(() => inflight.delete(key));

  inflight.set(key, p);
  return p;
}

export async function clearCache() {
  mem.clear();
  const s = idb();
  if (s) await clear(s);
}

/** Borra entradas vencidas para que la caché no crezca sin límite. */
export async function pruneCache() {
  const s = idb();
  if (!s) return;
  try {
    const all = await entries<string, CacheEntry<unknown>>(s);
    const now = Date.now();
    const dead = all.filter(([, e]) => !e || e.exp <= now).map(([k]) => k);
    if (dead.length) await delMany(dead, s);
  } catch {
    /* sin importancia */
  }
}

/** Limita la cantidad de promesas corriendo a la vez (para no saturar las APIs). */
export function limiter(max: number) {
  let active = 0;
  const queue: (() => void)[] = [];
  const next = () => {
    if (active >= max) return;
    const run = queue.shift();
    if (run) run();
  };
  return function <T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        active++;
        fn()
          .then(resolve, reject)
          .finally(() => {
            active--;
            next();
          });
      });
      next();
    });
  };
}
