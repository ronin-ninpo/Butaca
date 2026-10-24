import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Entry, FavKind, FavPerson, PersonRef, Snapshot, Status } from './types';
import { keyOf } from './types';
import { groupOf } from './rating';

export interface Settings {
  tmdbKey: string;
  omdbKey: string;
  region: string;
  language: string;
  includeTv: boolean;
}

interface LibraryState {
  entries: Record<string, Entry>;
  /** Orden manual de las vistas (el usuario las arrastra dentro de cada grupo de estrellas). */
  order: string[];
  favActors: Record<string, FavPerson>;
  favDirectors: Record<string, FavPerson>;
  settings: Settings;

  setStatus: (snap: Snapshot, status: Status, rating?: number, legend?: boolean) => void;
  setRating: (key: string, rating: number | undefined, legend?: boolean) => void;
  updateSnap: (key: string, snap: Partial<Snapshot>) => void;
  remove: (key: string) => void;
  restore: (entry: Entry, orderIndex?: number) => void;
  setOrder: (order: string[]) => void;
  toggleFav: (kind: FavKind, p: PersonRef) => boolean;
  updateSettings: (s: Partial<Settings>) => void;
  importData: (data: unknown) => void;
  resetAll: () => void;
  /** Aplica cambios que llegan de la nube (sin marcarlos como cambios locales). */
  applyRemote: (patch: RemotePatch) => void;
}

export interface RemotePatch {
  upserts?: Entry[];
  deletes?: string[];
  order?: string[];
  favActors?: Record<string, FavPerson>;
  favDirectors?: Record<string, FavPerson>;
  settings?: Partial<Settings>;
}

/** Deja en `order` solo las vistas, sin repetidos, y agrega al final las que falten. */
function normalizeOrder(order: string[], entries: Record<string, Entry>) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const k of order) if (entries[k]?.status === 'seen' && !seen.has(k)) (seen.add(k), out.push(k));
  for (const e of Object.values(entries)) if (e.status === 'seen' && !seen.has(e.key)) (seen.add(e.key), out.push(e.key));
  return out;
}

export const defaultSettings: Settings = {
  tmdbKey: '',
  omdbKey: '',
  region: 'AR',
  language: 'es-MX',
  includeTv: true,
};

const emptyLibrary = {
  entries: {} as Record<string, Entry>,
  order: [] as string[],
  favActors: {} as Record<string, FavPerson>,
  favDirectors: {} as Record<string, FavPerson>,
};

export const useStore = create<LibraryState>()(
  persist(
    (set, get) => ({
      ...emptyLibrary,
      settings: { ...defaultSettings },

      setStatus: (snap, status, rating, legend) =>
        set((s) => {
          const key = keyOf(snap.type, snap.id);
          const prev = s.entries[key];
          const now = Date.now();
          const entry: Entry = {
            key,
            status,
            rating: status === 'seen' ? rating : undefined,
            legend: status === 'seen' && legend ? true : undefined,
            addedAt: prev?.status === status ? prev.addedAt : now,
            seenAt: status === 'seen' ? (prev?.status === 'seen' ? prev.seenAt : now) : undefined,
            updatedAt: now,
            snap: { ...prev?.snap, ...snap },
          };
          let order = s.order;
          if (status === 'seen' && !order.includes(key)) order = [...order, key];
          if (status !== 'seen' && order.includes(key)) order = order.filter((k) => k !== key);
          return { entries: { ...s.entries, [key]: entry }, order };
        }),

      setRating: (key, rating, legend) =>
        set((s) => {
          const e = s.entries[key];
          if (!e) return {};
          const next: Entry = { ...e, status: 'seen', rating, legend: legend ? true : undefined, updatedAt: Date.now() };
          // Si cambia de grupo (estrellas o leyenda), va al final del grupo nuevo.
          const order = groupOf(e) !== groupOf(next) || !s.order.includes(key) ? [...s.order.filter((k) => k !== key), key] : s.order;
          return { entries: { ...s.entries, [key]: next }, order };
        }),

      updateSnap: (key, snap) =>
        set((s) => {
          const e = s.entries[key];
          if (!e) return {};
          return { entries: { ...s.entries, [key]: { ...e, snap: { ...e.snap, ...snap }, updatedAt: Date.now() } } };
        }),

      remove: (key) =>
        set((s) => {
          if (!s.entries[key]) return {};
          const entries = { ...s.entries };
          delete entries[key];
          return { entries, order: s.order.filter((k) => k !== key) };
        }),

      restore: (entry, orderIndex) =>
        set((s) => {
          const order = s.order.filter((k) => k !== entry.key);
          if (entry.status === 'seen') {
            const i = orderIndex === undefined || orderIndex < 0 ? order.length : Math.min(orderIndex, order.length);
            order.splice(i, 0, entry.key);
          }
          return { entries: { ...s.entries, [entry.key]: { ...entry, updatedAt: Date.now() } }, order };
        }),

      setOrder: (order) => set({ order }),

      toggleFav: (kind, p) => {
        const field = kind === 'actor' ? 'favActors' : 'favDirectors';
        const current = get()[field];
        const id = String(p.id);
        const next = { ...current };
        let added: boolean;
        if (next[id]) {
          delete next[id];
          added = false;
        } else {
          next[id] = { id: p.id, name: p.name, profile: p.profile ?? null, addedAt: Date.now() };
          added = true;
        }
        set({ [field]: next } as Partial<LibraryState>);
        return added;
      },

      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      importData: (data) => {
        const d = data as Partial<typeof emptyLibrary> & { app?: string; settings?: Partial<Settings> };
        if (!d || typeof d !== 'object' || typeof d.entries !== 'object') {
          throw new Error('El archivo no parece un respaldo de Butaca.');
        }
        const now = Date.now();
        const entries = Object.fromEntries(Object.entries(d.entries as Record<string, Entry>).map(([k, e]) => [k, { ...e, updatedAt: now }]));
        const seenKeys = Object.values(entries)
          .filter((e) => e.status === 'seen')
          .map((e) => e.key);
        const order = Array.isArray(d.order) ? d.order.filter((k) => entries[k]?.status === 'seen') : [];
        for (const k of seenKeys) if (!order.includes(k)) order.push(k);
        set((s) => ({
          entries,
          order,
          favActors: d.favActors ?? {},
          favDirectors: d.favDirectors ?? {},
          settings: { ...s.settings, ...(d.settings ?? {}) },
        }));
      },

      resetAll: () => set((s) => ({ ...emptyLibrary, settings: { ...s.settings } })),

      applyRemote: (patch) =>
        set((s) => {
          const entries = { ...s.entries };
          for (const e of patch.upserts ?? []) entries[e.key] = e;
          for (const k of patch.deletes ?? []) delete entries[k];
          return {
            entries,
            order: normalizeOrder(patch.order ?? s.order, entries),
            favActors: patch.favActors ?? s.favActors,
            favDirectors: patch.favDirectors ?? s.favDirectors,
            settings: patch.settings ? { ...s.settings, ...patch.settings } : s.settings,
          };
        }),
    }),
    {
      name: 'butaca-library',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        entries: s.entries,
        order: s.order,
        favActors: s.favActors,
        favDirectors: s.favDirectors,
        settings: s.settings,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<LibraryState>;
        return { ...current, ...p, settings: { ...defaultSettings, ...(p.settings ?? {}) } };
      },
    },
  ),
);

export const getSettings = () => useStore.getState().settings;

export function exportData() {
  const s = useStore.getState();
  return {
    app: 'butaca',
    version: 1,
    exportedAt: new Date().toISOString(),
    entries: s.entries,
    order: s.order,
    favActors: s.favActors,
    favDirectors: s.favDirectors,
    settings: { region: s.settings.region, includeTv: s.settings.includeTv },
  };
}

export const useEntry = (key: string) => useStore((s) => s.entries[key]);
