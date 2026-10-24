import { create } from 'zustand';
import type { Auth, User } from 'firebase/auth';
import type { DocumentSnapshot, Firestore, QuerySnapshot } from 'firebase/firestore';
import { useStore } from './store';
import type { Entry } from './types';
import { META_FIELDS, mergeInitial, remoteEntryAction, fromRemote, syncedSettings, type LocalMeta, type MetaField, type RemoteEntry, type RemoteMeta } from './syncMerge';

/** Proyecto de Firebase de Butaca. No es secreto: la seguridad la dan las reglas de Firestore (firestore.rules). */
const firebaseConfig = {
  apiKey: 'AIzaSyBUNBn6ZvsVHgj07FY7lgCit2Y1Szc2_7A',
  authDomain: 'butaca-27341.firebaseapp.com',
  projectId: 'butaca-27341',
  storageBucket: 'butaca-27341.firebasestorage.app',
  messagingSenderId: '886031040474',
  appId: '1:886031040474:web:bd00e283e893baeae6cae3',
};

export type SyncStatus = 'off' | 'loading' | 'synced' | 'syncing' | 'offline' | 'error';

interface SyncState {
  status: SyncStatus;
  email: string | null;
  uid: string | null;
  error?: string;
  lastSyncAt?: number;
}

export const useSync = create<SyncState>(() => ({ status: 'off', email: null, uid: null }));

const FLAG = 'butaca.sync.on'; // hubo sesión iniciada: cargar Firebase al abrir la app
const META = 'butaca.sync.meta';
const EMULATOR = 'butaca.emulator'; // solo para pruebas locales

const ls = {
  get: (k: string) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* sin almacenamiento */
    }
  },
  del: (k: string) => {
    try {
      localStorage.removeItem(k);
    } catch {
      /* sin almacenamiento */
    }
  },
};

type AuthMod = typeof import('firebase/auth');
type FsMod = typeof import('firebase/firestore');
interface Fb {
  auth: Auth;
  db: Firestore;
  a: AuthMod;
  f: FsMod;
}

let fbPromise: Promise<Fb> | null = null;
let readyWaiters: (() => void)[] = [];

/** Firebase se carga recién cuando hace falta, así la app abre rápido aunque no uses cuenta. */
function loadFirebase(): Promise<Fb> {
  if (!fbPromise) {
    fbPromise = (async () => {
      const [{ initializeApp }, a, f] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
      const emu = ls.get(EMULATOR);
      const app = initializeApp(emu ? { ...firebaseConfig, projectId: 'demo-butaca' } : firebaseConfig);
      const auth = a.initializeAuth(app, { persistence: [a.indexedDBLocalPersistence, a.browserLocalPersistence] });
      auth.languageCode = 'es';
      const db = f.initializeFirestore(app, {
        ignoreUndefinedProperties: true,
        localCache: f.persistentLocalCache({ tabManager: f.persistentMultipleTabManager() }),
      });
      if (emu) {
        a.connectAuthEmulator(auth, `http://${emu}:9099`, { disableWarnings: true });
        f.connectFirestoreEmulator(db, emu, 8080);
      }
      const fb = { auth, db, a, f };
      a.onAuthStateChanged(auth, (user) => onUser(fb, user));
      return fb;
    })();
  }
  return fbPromise;
}

/** Al abrir la app: si había sesión, reconecta la sincronización. */
export function initSync() {
  if (ls.get(FLAG)) {
    useSync.setState({ status: 'loading' });
    loadFirebase().catch((e) => useSync.setState({ status: 'error', error: String(e?.message ?? e) }));
  }
}

/** Espera a que termine la primera sincronización (después de iniciar sesión). */
export function whenReady(): Promise<void> {
  const s = useSync.getState().status;
  if (s === 'synced' || s === 'syncing' || s === 'offline' || s === 'error') return Promise.resolve();
  return new Promise((res) => readyWaiters.push(res));
}
function resolveReady() {
  const w = readyWaiters;
  readyWaiters = [];
  w.forEach((f) => f());
}

// ---------- Cuenta ----------

export async function signUp(email: string, password: string) {
  const fb = await loadFirebase();
  await fb.a.createUserWithEmailAndPassword(fb.auth, email.trim(), password);
}

export async function signIn(email: string, password: string) {
  const fb = await loadFirebase();
  await fb.a.signInWithEmailAndPassword(fb.auth, email.trim(), password);
}

export async function resetPassword(email: string) {
  const fb = await loadFirebase();
  await fb.a.sendPasswordResetEmail(fb.auth, email.trim());
}

/** Cierra la sesión. Con clearLocal también borra listas y claves de este dispositivo (en la nube quedan). */
export async function logout(clearLocal: boolean) {
  const fb = await loadFirebase();
  await flush().catch(() => {});
  stop();
  await fb.a.signOut(fb.auth);
  ls.del(FLAG);
  if (clearLocal) {
    useStore.getState().resetAll();
    useStore.getState().updateSettings({ tmdbKey: '', omdbKey: '' });
    ls.del(META);
  }
  useSync.setState({ status: 'off', email: null, uid: null, error: undefined });
}

export function authErrorMessage(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  const map: Record<string, string> = {
    'auth/invalid-email': 'El email no es válido.',
    'auth/missing-email': 'Escribí tu email.',
    'auth/missing-password': 'Escribí tu contraseña.',
    'auth/user-not-found': 'No hay ninguna cuenta con ese email.',
    'auth/wrong-password': 'La contraseña no es correcta.',
    'auth/invalid-credential': 'Email o contraseña incorrectos.',
    'auth/invalid-login-credentials': 'Email o contraseña incorrectos.',
    'auth/email-already-in-use': 'Ya existe una cuenta con ese email. Probá «Ingresar».',
    'auth/weak-password': 'La contraseña tiene que tener al menos 6 caracteres.',
    'auth/too-many-requests': 'Demasiados intentos. Esperá unos minutos y probá de nuevo.',
    'auth/network-request-failed': 'Sin conexión. Revisá tu internet.',
    'auth/user-disabled': 'Esta cuenta está deshabilitada.',
    'auth/operation-not-allowed': 'El ingreso con email y contraseña no está activado en Firebase.',
    'auth/configuration-not-found': 'Falta activar Authentication en Firebase.',
    'auth/unauthorized-domain': 'Este sitio no está autorizado en Firebase (Dominios autorizados).',
  };
  return map[code] ?? `No se pudo completar (${code || (e as Error)?.message || 'error desconocido'}).`;
}

// ---------- Sincronización ----------

let current: { fb: Fb; uid: string } | null = null;
let unsubs: (() => void)[] = [];
let applying = false;
let meta: LocalMeta | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let inflight = 0;
const pending = { upserts: new Set<string>(), deletes: new Set<string>(), meta: new Set<MetaField>() };

function loadMeta(): LocalMeta | null {
  try {
    const m = JSON.parse(ls.get(META) ?? 'null');
    return m ? { order: 0, favActors: 0, favDirectors: 0, companions: 0, settings: 0, ...m } : null;
  } catch {
    return null;
  }
}
const saveMeta = () => meta && ls.set(META, JSON.stringify(meta));

function applyRemote(patch: Parameters<ReturnType<typeof useStore.getState>['applyRemote']>[0]) {
  applying = true;
  try {
    useStore.getState().applyRemote(patch);
  } finally {
    applying = false;
  }
}

async function onUser(fb: Fb, user: User | null) {
  if (!user) {
    stop();
    ls.del(FLAG);
    useSync.setState({ status: 'off', email: null, uid: null });
    resolveReady();
    return;
  }
  ls.set(FLAG, '1');
  useSync.setState({ status: 'loading', email: user.email, uid: user.uid, error: undefined });
  try {
    await start(fb, user.uid);
  } catch (e) {
    useSync.setState({ status: 'error', error: friendlyError(e) });
  } finally {
    resolveReady();
  }
}

function friendlyError(e: unknown) {
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'permission-denied') return 'Firebase rechazó el acceso: revisá las reglas de Firestore.';
  if (code === 'unavailable') return 'Sin conexión con la nube. Se sincroniza cuando vuelva internet.';
  if (code === 'not-found' || code === 'failed-precondition') return 'Falta crear la base de datos Firestore en Firebase.';
  return (e as Error)?.message ?? String(e);
}

async function start(fb: Fb, uid: string) {
  stop();
  current = { fb, uid };
  const { db, f } = fb;
  const entriesCol = f.collection(db, 'users', uid, 'entries');
  const userDoc = f.doc(db, 'users', uid);

  // Lo que cambies mientras se descarga la nube queda anotado y se sube después.
  unsubs.push(useStore.subscribe(onLocalChange));

  const [qs, ds] = await Promise.all([f.getDocs(entriesCol), f.getDoc(userDoc)]);
  if (current?.uid !== uid) return;
  const remote = qs.docs.map((d) => d.data() as RemoteEntry);
  const rmeta = ds.exists() ? (ds.data() as RemoteMeta) : null;
  const s = useStore.getState();
  const plan = mergeInitial(s, remote, rmeta, loadMeta(), uid);
  meta = plan.meta;
  saveMeta();
  applyRemote(plan.patch);
  plan.upload.forEach((k) => pending.upserts.add(k));
  plan.metaUpload.forEach((m) => pending.meta.add(m));

  unsubs.push(f.onSnapshot(entriesCol, onRemoteEntries, onSnapshotError));
  unsubs.push(f.onSnapshot(userDoc, onRemoteMeta, onSnapshotError));
  const onNet = () => refreshStatus();
  window.addEventListener('online', onNet);
  window.addEventListener('offline', onNet);
  unsubs.push(() => {
    window.removeEventListener('online', onNet);
    window.removeEventListener('offline', onNet);
  });

  useSync.setState({ status: 'synced', lastSyncAt: Date.now() });
  await flush();
}

function stop() {
  clearTimeout(timer);
  unsubs.forEach((u) => u());
  unsubs = [];
  current = null;
  meta = null;
  pending.upserts.clear();
  pending.deletes.clear();
  pending.meta.clear();
}

function onSnapshotError(e: unknown) {
  useSync.setState({ status: 'error', error: friendlyError(e) });
}

function refreshStatus() {
  if (!current) return;
  const busy = inflight > 0 || pending.upserts.size + pending.deletes.size + pending.meta.size > 0;
  if (!navigator.onLine) useSync.setState({ status: busy ? 'offline' : 'synced' });
  else useSync.setState(busy ? { status: 'syncing' } : { status: 'synced', lastSyncAt: Date.now(), error: undefined });
}

type LibState = ReturnType<typeof useStore.getState>;

function onLocalChange(state: LibState, prev: LibState) {
  if (applying || !current) return;
  let dirty = false;
  if (state.entries !== prev.entries) {
    const keys = new Set([...Object.keys(state.entries), ...Object.keys(prev.entries)]);
    for (const k of keys) {
      if (state.entries[k] === prev.entries[k]) continue;
      dirty = true;
      if (state.entries[k]) {
        pending.upserts.add(k);
        pending.deletes.delete(k);
      } else {
        pending.deletes.add(k);
        pending.upserts.delete(k);
      }
    }
  }
  const now = Date.now();
  const touch = (m: MetaField) => {
    pending.meta.add(m);
    if (meta) meta[m] = now;
    dirty = true;
  };
  if (state.order !== prev.order) touch('order');
  if (state.favActors !== prev.favActors) touch('favActors');
  if (state.favDirectors !== prev.favDirectors) touch('favDirectors');
  if (state.companions !== prev.companions) touch('companions');
  if (JSON.stringify(syncedSettings(state.settings)) !== JSON.stringify(syncedSettings(prev.settings))) touch('settings');
  if (dirty) {
    saveMeta();
    clearTimeout(timer);
    timer = setTimeout(() => flush().catch(onSnapshotError), 400);
    refreshStatus();
  }
}

/** Sube lo pendiente en lotes. */
async function flush() {
  if (!current || !meta) return;
  const { fb, uid } = current;
  const { db, f } = fb;
  const s = useStore.getState();
  type Op = { ref: ReturnType<typeof f.doc>; data: Record<string, unknown>; merge?: boolean };
  const ops: Op[] = [];
  const now = Date.now();
  for (const k of pending.upserts) {
    const e = s.entries[k];
    if (e) ops.push({ ref: f.doc(db, 'users', uid, 'entries', k), data: { ...e, updatedAt: e.updatedAt ?? now } as Record<string, unknown> });
  }
  for (const k of pending.deletes) ops.push({ ref: f.doc(db, 'users', uid, 'entries', k), data: { key: k, deleted: true, updatedAt: now } });
  if (pending.meta.size) {
    const data: Record<string, unknown> = {};
    const values = { order: s.order, favActors: s.favActors, favDirectors: s.favDirectors, companions: s.companions, settings: syncedSettings(s.settings) };
    for (const m of pending.meta) {
      data[m] = values[m];
      data[`${m}At`] = meta[m] || now;
    }
    ops.push({ ref: f.doc(db, 'users', uid), data, merge: true });
  }
  pending.upserts.clear();
  pending.deletes.clear();
  pending.meta.clear();
  if (!ops.length) return refreshStatus();

  inflight++;
  refreshStatus();
  try {
    for (let i = 0; i < ops.length; i += 400) {
      const batch = f.writeBatch(db);
      for (const op of ops.slice(i, i + 400)) {
        if (op.merge) batch.set(op.ref, op.data, { merge: true });
        else batch.set(op.ref, op.data);
      }
      await batch.commit();
    }
  } finally {
    inflight--;
    refreshStatus();
  }
}

function onRemoteEntries(qs: QuerySnapshot) {
  const upserts: Entry[] = [];
  const deletes: string[] = [];
  const entries = useStore.getState().entries;
  for (const ch of qs.docChanges()) {
    if (ch.type === 'removed' || ch.doc.metadata.hasPendingWrites) continue;
    const r = ch.doc.data() as RemoteEntry;
    if (pending.upserts.has(r.key) || pending.deletes.has(r.key)) continue; // gana el cambio local que está por subir
    const action = remoteEntryAction(entries[r.key], r);
    if (action === 'upsert') upserts.push(fromRemote(r));
    if (action === 'delete') deletes.push(r.key);
  }
  if (upserts.length || deletes.length) applyRemote({ upserts, deletes });
  refreshStatus();
}

function onRemoteMeta(ds: DocumentSnapshot) {
  if (!meta || ds.metadata.hasPendingWrites || !ds.exists()) return;
  const r = ds.data() as RemoteMeta;
  const patch: Parameters<LibState['applyRemote']>[0] = {};
  for (const m of META_FIELDS) {
    const at = (r[`${m}At`] as number | undefined) ?? 0;
    if (r[m] !== undefined && at > meta[m] && !pending.meta.has(m)) {
      (patch as Record<string, unknown>)[m] = r[m];
      meta[m] = at;
    }
  }
  if (Object.keys(patch).length) {
    saveMeta();
    applyRemote(patch);
  }
}
