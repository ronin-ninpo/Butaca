import type { Entry, FavKind, PersonRef } from './types';

export interface PersonStat extends PersonRef {
  seen: number;
  rated: number;
  avg?: number;
  score: number;
  titles: string[];
}

const PRIOR = 3;
const WEIGHT = 2;

/** Ranking de actores o directores según lo que viste y cómo lo calificaste. */
export function peopleStats(entries: Record<string, Entry>, kind: FavKind): PersonStat[] {
  const map = new Map<number, PersonStat & { sum: number }>();
  for (const e of Object.values(entries)) {
    if (e.status !== 'seen') continue;
    const people = kind === 'actor' ? (e.snap.cast ?? []).slice(0, 8) : e.snap.directors ?? [];
    for (const p of people) {
      let s = map.get(p.id);
      if (!s) {
        s = { id: p.id, name: p.name, profile: p.profile, seen: 0, rated: 0, sum: 0, score: 0, titles: [] };
        map.set(p.id, s);
      }
      if (!s.profile && p.profile) s.profile = p.profile;
      s.seen++;
      s.titles.push(e.snap.title);
      if (e.rating) {
        s.rated++;
        s.sum += e.rating;
      }
    }
  }
  return [...map.values()]
    .map(({ sum, ...s }) => ({
      ...s,
      avg: s.rated ? sum / s.rated : undefined,
      // promedio "bayesiano": con pocas películas tira hacia 3, con muchas pesa tu nota real
      score: (sum + PRIOR * WEIGHT) / (s.rated + WEIGHT) + Math.min(s.seen, 10) * 0.02,
    }))
    .sort((a, b) => b.score - a.score || b.seen - a.seen);
}

/** Los que más te gustan (según calificaciones) para la sección automática. */
export function autoFavorites(entries: Record<string, Entry>, kind: FavKind, limit = 30) {
  const stats = peopleStats(entries, kind);
  const strong = stats.filter((s) => s.rated >= 2 && (s.avg ?? 0) >= 3.5);
  const pool = strong.length >= 5 ? strong : stats.filter((s) => s.rated >= 1 && (s.avg ?? 0) >= 3.5);
  return pool.slice(0, limit);
}

export function statFor(entries: Record<string, Entry>, kind: FavKind, id: number) {
  return peopleStats(entries, kind).find((s) => s.id === id);
}
