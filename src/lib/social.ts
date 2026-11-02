import { create } from 'zustand';
import { onSession, type Session } from './sync';
import { useStore } from './store';
import { favoritesOrder } from './rating';
import { keyOf, type Entry, type MediaType, type PersonRef } from './types';

/** Una película vista, en el perfil público (nombres cortos para que el documento pese poco). */
export interface ProfileItem {
  k: string; // tipo:id
  t: string; // título
  y: string | null; // año
  p: string | null; // póster
  r: number | null; // estrellas
  l: boolean; // leyenda
  c: boolean; // clásico
  s: number | null; // cuándo la vio
  n?: string; // reflexión (solo si la eligió mostrar)
  na?: number; // cuándo la escribió
}

export interface ProfileStats {
  seen: number;
  rated: number;
  avg: number | null;
  legends: number;
}

/** profiles/{uid}: lo que se ve en la lista de personas. */
export interface ProfileSummary {
  uid: string;
  name: string;
  bio: string;
  color: string;
  public: boolean;
  updatedAt: number;
  stats: ProfileStats;
  top: ProfileItem[];
}

/** profiles/{uid}/data/library: el detalle, solo si el perfil es visible. */
export interface ProfileLibrary {
  seen: ProfileItem[];
  favActors: PersonRef[];
  favDirectors: PersonRef[];
  updatedAt: number;
}

/** inbox/{uid}/items/{id}: una recomendación recibida. */
export interface InboxItem {
  id: string;
  fromUid: string;
  fromName: string;
  key: string;
  type: MediaType;
  tmdbId: number;
  title: string;
  year: string | null;
  poster: string | null;
  note: string;
  createdAt: number;
  handled: boolean;
}

export const PROFILE_COLORS = ['#ff5b4f', '#ffb53d', '#4fd394', '#52b8ff', '#c4a1ff', '#ff7ab6'];
const MAX_SEEN = 1500;
const REVIEWS_BUDGET = 400_000; // caracteres de reflexiones compartidas por perfil

interface SocialState {
  /** hay sesión iniciada y sincronizada */
  ready: boolean;
  uid: string | null;
  /** undefined: cargando; null: todavía no creó su perfil */
  me: ProfileSummary | null | undefined;
  inbox: InboxItem[];
  error: string | null;
}

export const useSocial = create<SocialState>(() => ({ ready: false, uid: null, me: undefined, inbox: [], error: null }));

export const pendingInbox = (inbox: InboxItem[]) => inbox.filter((i) => !i.handled);

export function socialError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? '';
  if (code === 'permission-denied') return 'Firebase no dejó hacerlo. Si recién activaste Comunidad, falta pegar las reglas nuevas de Firestore.';
  if (code === 'unavailable') return 'Sin conexión con la nube. Probá de nuevo cuando vuelva internet.';
  return (e as Error)?.message ?? String(e);
}

let session: Session | null = null;
let unsubs: (() => void)[] = [];
let publishTimer: ReturnType<typeof setTimeout> | undefined;
const handling = new Set<string>();

function toItem(e: Entry): ProfileItem {
  return { k: e.key, t: e.snap.title, y: e.snap.year ?? null, p: e.snap.poster ?? null, r: e.rating ?? null, l: !!e.legend, c: !!e.classic, s: e.seenAt ?? null };
}

/** Agrega las reflexiones compartidas, cuidando que el documento no supere el tamaño que permite Firestore. */
function withReviews(list: Entry[]): ProfileItem[] {
  let budget = REVIEWS_BUDGET;
  const shared = new Set(
    list
      .filter((e) => e.review && e.reviewShared)
      .sort((a, b) => (b.reviewAt ?? 0) - (a.reviewAt ?? 0))
      .filter((e) => (budget -= e.review!.length) >= 0)
      .map((e) => e.key),
  );
  return list.map((e) => (shared.has(e.key) ? { ...toItem(e), n: e.review, na: e.reviewAt ?? Date.now() } : toItem(e)));
}

export function statsOf(items: ProfileItem[]): ProfileStats {
  const rated = items.filter((i) => i.r);
  return {
    seen: items.length,
    rated: rated.length,
    avg: rated.length ? rated.reduce((a, i) => a + (i.r ?? 0), 0) / rated.length : null,
    legends: items.filter((i) => i.l).length,
  };
}

/** Coincidencias con mis vistas: cuántas tienen en común y qué tan parecido califican (0-100). */
export function affinity(theirs: ProfileItem[], entries: Record<string, Entry>) {
  let common = 0;
  let ratedBoth = 0;
  let diff = 0;
  for (const it of theirs) {
    const e = entries[it.k];
    if (e?.status !== 'seen') continue;
    common++;
    if (it.r && e.rating) {
      ratedBoth++;
      diff += Math.abs(it.r - e.rating);
    }
  }
  return { common, ratedBoth, score: ratedBoth >= 3 ? Math.round(100 - (diff / ratedBoth / 4.5) * 100) : null };
}

const people = (m: Record<string, PersonRef>) => Object.values(m).map(({ id, name, profile }) => ({ id, name, profile: profile ?? null }));

onSession((s) => (s ? start(s) : stop()));

async function start(s: Session) {
  stop();
  session = s;
  const { db, f } = s.fb;
  useSocial.setState({ ready: true, uid: s.uid, me: undefined, inbox: [], error: null });
  try {
    const snap = await f.getDoc(f.doc(db, 'profiles', s.uid));
    if (session !== s) return;
    useSocial.setState({ me: snap.exists() ? (snap.data() as ProfileSummary) : null });
  } catch (e) {
    useSocial.setState({ me: null, error: socialError(e) });
  }

  // Recomendaciones recibidas, en vivo.
  const q = f.query(f.collection(db, 'inbox', s.uid, 'items'), f.orderBy('createdAt', 'desc'), f.limit(200));
  unsubs.push(
    f.onSnapshot(
      q,
      (qs) =>
        useSocial.setState({
          inbox: qs.docs.map((d) => {
            const x = d.data({ serverTimestamps: 'estimate' });
            return { ...(x as Omit<InboxItem, 'id' | 'createdAt'>), id: d.id, createdAt: x.createdAt?.toMillis?.() ?? Date.now() };
          }),
        }),
      (e) => useSocial.setState({ error: socialError(e) }),
    ),
  );

  // El perfil público se mantiene al día con tus listas.
  unsubs.push(
    useStore.subscribe((st, prev) => {
      if (st.entries !== prev.entries || st.order !== prev.order || st.favActors !== prev.favActors || st.favDirectors !== prev.favDirectors) schedulePublish();
      if (st.entries !== prev.entries) autoHandle();
    }),
  );
  unsubs.push(useSocial.subscribe((st, prev) => st.inbox !== prev.inbox && autoHandle()));
  if (useSocial.getState().me?.public) schedulePublish(1500);
}

function stop() {
  unsubs.forEach((u) => u());
  unsubs = [];
  clearTimeout(publishTimer);
  publishPending = false;
  session = null;
  handling.clear();
  useSocial.setState({ ready: false, uid: null, me: undefined, inbox: [], error: null });
}

function need(): Session {
  if (!session) throw new Error('Iniciá sesión para usar Comunidad.');
  return session;
}

let publishPending = false;

function schedulePublish(ms = 2500) {
  clearTimeout(publishTimer);
  publishPending = true;
  publishTimer = setTimeout(publishNow, ms);
}

function publishNow() {
  clearTimeout(publishTimer);
  publishPending = false;
  publish().catch((e) => useSocial.setState({ error: socialError(e) }));
}

// Si salís de la app con cambios sin publicar (en el celular los temporizadores se frenan), se publican ya.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && publishPending && session) publishNow();
  });
}

/** Sube el perfil: el resumen siempre; el detalle solo si es visible (si no, se borra). */
async function publish() {
  const me = useSocial.getState().me;
  if (!session || !me) return;
  const { db, f } = session.fb;
  const uid = session.uid;
  const s = useStore.getState();
  const seen = me.public ? withReviews(favoritesOrder(s.entries, s.order).slice(0, MAX_SEEN)) : [];
  const now = Date.now();
  const summary: ProfileSummary = { ...me, uid, updatedAt: now, stats: statsOf(seen), top: seen.slice(0, 8) };
  const batch = f.writeBatch(db);
  batch.set(f.doc(db, 'profiles', uid), summary);
  const libRef = f.doc(db, 'profiles', uid, 'data', 'library');
  if (me.public) batch.set(libRef, { seen, favActors: people(s.favActors), favDirectors: people(s.favDirectors), updatedAt: now } satisfies ProfileLibrary);
  else batch.delete(libRef);
  await batch.commit();
  useSocial.setState({ me: summary, error: null });
}

export async function saveMyProfile(p: { name: string; bio: string; color: string; public: boolean }) {
  const s = need();
  const name = p.name.trim().replace(/\s+/g, ' ').slice(0, 30);
  if (name.length < 2) throw new Error('Elegí un nombre de al menos 2 letras.');
  const base = useSocial.getState().me;
  useSocial.setState({
    me: {
      uid: s.uid,
      stats: base?.stats ?? { seen: 0, rated: 0, avg: null, legends: 0 },
      top: base?.top ?? [],
      updatedAt: Date.now(),
      name,
      bio: p.bio.trim().slice(0, 120),
      color: PROFILE_COLORS.includes(p.color) ? p.color : PROFILE_COLORS[0],
      public: p.public,
    },
  });
  clearTimeout(publishTimer);
  publishPending = false;
  await publish();
}

/** Personas con perfil visible (sin vos), por nombre. */
export async function loadDirectory(): Promise<ProfileSummary[]> {
  const s = need();
  const { db, f } = s.fb;
  const qs = await f.getDocs(f.query(f.collection(db, 'profiles'), f.where('public', '==', true)));
  return qs.docs
    .map((d) => d.data() as ProfileSummary)
    .filter((p) => p.uid !== s.uid)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

export async function loadProfile(uid: string): Promise<{ summary: ProfileSummary; library: ProfileLibrary | null } | null> {
  const s = need();
  const { db, f } = s.fb;
  let snap;
  try {
    snap = await f.getDoc(f.doc(db, 'profiles', uid));
  } catch (e) {
    // Un perfil oculto no se puede leer: es lo mismo que no estar disponible.
    if ((e as { code?: string })?.code === 'permission-denied') return null;
    throw e;
  }
  if (!snap.exists()) return null;
  const summary = snap.data() as ProfileSummary;
  if (!summary.public && uid !== s.uid) return null;
  const lib = await f.getDoc(f.doc(db, 'profiles', uid, 'data', 'library'));
  return { summary, library: lib.exists() ? (lib.data() as ProfileLibrary) : null };
}

/** Manda una recomendación a una o varias personas. */
export async function sendRecommendation(toUids: string[], t: { type: MediaType; id: number; title: string; year?: string; poster?: string | null }, note: string) {
  const s = need();
  const me = useSocial.getState().me;
  if (!me) throw new Error('Creá tu perfil en Comunidad para recomendar.');
  const { db, f } = s.fb;
  const batch = f.writeBatch(db);
  for (const to of toUids) {
    batch.set(f.doc(f.collection(db, 'inbox', to, 'items')), {
      fromUid: s.uid,
      fromName: me.name,
      key: keyOf(t.type, t.id),
      type: t.type,
      tmdbId: t.id,
      title: t.title,
      year: t.year ?? null,
      poster: t.poster ?? null,
      note: note.trim().slice(0, 300),
      createdAt: f.serverTimestamp(),
      handled: false,
    });
  }
  await batch.commit();
}

export async function markHandled(ids: string[]) {
  const s = need();
  const { db, f } = s.fb;
  await Promise.all(ids.map((id) => f.updateDoc(f.doc(db, 'inbox', s.uid, 'items', id), { handled: true })));
}

export async function deleteInbox(id: string) {
  const s = need();
  await s.fb.f.deleteDoc(s.fb.f.doc(s.fb.db, 'inbox', s.uid, 'items', id));
}

/** Si ya hiciste algo con una película recomendada (la marcaste, calificaste o descartaste), deja de figurar como pendiente. */
function autoHandle() {
  if (!session) return;
  const entries = useStore.getState().entries;
  const done = useSocial
    .getState()
    .inbox.filter((i) => !i.handled && !handling.has(i.id) && (entries[i.key]?.updatedAt ?? 0) > i.createdAt)
    .map((i) => i.id);
  if (!done.length) return;
  done.forEach((id) => handling.add(id));
  markHandled(done).catch(() => done.forEach((id) => handling.delete(id)));
}
