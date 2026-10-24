import { create } from 'zustand';
import type { Details } from './tmdb';
import type { MediaSummary, Snapshot } from './types';

export type Target = MediaSummary | Details;

interface SheetState {
  kind: 'rate' | 'actions' | null;
  target: Target | null;
  openRate: (t: Target) => void;
  openActions: (t: Target) => void;
  close: () => void;
}

export const useSheets = create<SheetState>((set) => ({
  kind: null,
  target: null,
  openRate: (target) => set({ kind: 'rate', target }),
  openActions: (target) => set({ kind: 'actions', target }),
  close: () => set({ kind: null, target: null }),
}));

export function infoOf(t: Target): { type: MediaSummary['type']; id: number; title: string; poster?: string | null; year?: string } {
  const s = (t as Details).raw ? (t as Details).summary : (t as MediaSummary);
  return { type: s.type, id: s.id, title: s.title, poster: s.poster, year: s.year };
}

/** Convierte lo guardado en el celular en algo que las hojas y acciones aceptan. */
export function summaryFromSnap(s: Snapshot): MediaSummary {
  return { type: s.type, id: s.id, title: s.title, originalTitle: s.originalTitle, year: s.year, poster: s.poster, genreIds: s.genreIds, tmdbScore: s.tmdbScore };
}
