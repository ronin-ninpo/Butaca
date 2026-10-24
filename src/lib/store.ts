import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Entry, FavKind, FavPerson, PersonRef, Snapshot, Status } from './types';
import { keyOf } from './types';

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

  setStatus: (snap: Snapshot, status: Status, rating?: number) => void;
  setRating: (key: string, rating: number | undefined) => void;
  updateSnap: (key: string, snap: Partial<Snapshot>) => void;
  remove: (key: string) => void;
  restore: (entry: Entry, orderIndex?: number) => void;
  setOrder: (order: string[]) => void;
  toggleFav: (kind: FavKind, p: PersonRef) => boolean;
  updateSettings: (s: Partial<Settings>) => void;
  importData: (data: unknown) => void;
  resetAll: () => void;
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

      setStatus: (snap, status, rating) =>
        set((s) => {
          const key = keyOf(snap.type, snap.id);
          const prev = s.entries[key];
          const now = Date.now();
          const entry: Entry = {
            key,
            status,
            rating: status === 'seen' ? rating : undefined,
            addedAt: prev?.status === status ? prev.addedAt : now,
            seenAt: status === 'seen' ? (prev?.status === 'seen' ? prev.seenAt : now) : undefined,
            snap: { ...prev?.snap, ...snap },
          };
          let order = s.order;
          if (status === 'seen' && !order.includes(key)) order = [...order, key];
          if (status !== 'seen' && order.includes(key)) order = order.filter((k) => k !== key);
          return { entries: { ...s.entries, [key]: entry }, order };
        }),

      setRating: (key, rating) =>
        set((s) => {
          const e = s.entries[key];
          if (!e) return {};
          // Si cambia de grupo de estrellas, va al final del grupo nuevo.
          const order = e.rating !== rating ? [...s.order.filter((k) => k !== key), key] : s.order;
          return { entries: { ...s.entries, [key]: { ...e, status: 'seen', rating } }, order };
        }),

      updateSnap: (key, snap) =>
        set((s) => {
          const e = s.entries[key];
          if (!e) return {};
          return { entries: { ...s.entries, [key]: { ...e, snap: { ...e.snap, ...snap } } } };
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
          return { entries: { ...s.entries, [entry.key]: entry }, order };
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
        const entries = d.entries as Record<string, Entry>;
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
