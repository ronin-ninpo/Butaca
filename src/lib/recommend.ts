import { DAY } from './cache';
import { getCredits, getGenres, list, recommendationsFor, toSummaries } from './tmdb';
import { autoFavorites } from './favorites';
import type { Entry, FavPerson, MediaSummary, MediaType } from './types';
import { keyOf } from './types';
import { tasteScore } from './rating';

export interface Candidate {
  item: MediaSummary;
  score: number;
  reasons: { text: string; w: number }[];
}

export interface RecInput {
  entries: Record<string, Entry>;
  favActors: Record<string, FavPerson>;
  favDirectors: Record<string, FavPerson>;
  types: MediaType[];
}

export interface RecResult {
  candidates: Candidate[];
  coldStart: boolean;
  ratedCount: number;
}

const NON_FICTION_TV = new Set([10763, 10764, 10767]); // noticias, reality, talk shows

/** Afinidad por género: positivo si lo calificás alto, negativo si bajo. */
export function genreAffinity(entries: Record<string, Entry>) {
  const acc = new Map<number, { sum: number; n: number }>();
  for (const e of Object.values(entries)) {
    let delta: number | undefined;
    if (e.status === 'seen' && (e.rating || e.legend)) delta = tasteScore(e) - 3;
    else if (e.status === 'want') delta = 0.6;
    else if (e.status === 'skip') delta = -0.4;
    if (delta === undefined) continue;
    for (const g of e.snap.genreIds) {
      const a = acc.get(g) ?? { sum: 0, n: 0 };
      a.sum += delta;
      a.n++;
      acc.set(g, a);
    }
  }
  const out = new Map<number, number>();
  for (const [g, a] of acc) out.set(g, a.sum / (a.n + 2));
  return out;
}

function shuffleTail<T>(arr: T[], keep: number) {
  const head = arr.slice(0, keep);
  const tail = arr.slice(keep);
  for (let i = tail.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tail[i], tail[j]] = [tail[j], tail[i]];
  }
  return [...head, ...tail];
}

export async function buildRecommendations(input: RecInput): Promise<RecResult> {
  const { entries, types } = input;
  const genreNames = new Map<number, string>();
  await Promise.allSettled(types.map((t) => getGenres(t).then((gs) => gs.forEach((g) => genreNames.set(g.id, g.name)))));
  const all = Object.values(entries);
  const rated = all.filter((e) => e.status === 'seen' && (e.rating || e.legend));
  const wants = all.filter((e) => e.status === 'want');
  const exclude = new Set(Object.keys(entries));
  const typeOk = (t: MediaType) => types.includes(t);
  const cands = new Map<string, Candidate>();

  const add = (item: MediaSummary, w: number, reason?: string) => {
    const k = keyOf(item.type, item.id);
    if (exclude.has(k) || !typeOk(item.type) || !item.poster) return;
    if ((item.votes ?? 0) < 25) return;
    if (item.type === 'tv' && item.genreIds.some((g) => NON_FICTION_TV.has(g))) return;
    let c = cands.get(k);
    if (!c) {
      c = { item, score: 0, reasons: [] };
      cands.set(k, c);
    }
    c.score += w;
    if (reason && !c.reasons.some((r) => r.text === reason)) c.reasons.push({ text: reason, w });
  };

  // 1) Semillas: lo que calificaste alto (y lo que querés ver), más reciente primero.
  const byRecent = (a: Entry, b: Entry) => (b.seenAt ?? b.addedAt) - (a.seenAt ?? a.addedAt);
  // Primero las leyendas, después lo más reciente.
  const loved = rated
    .filter((e) => e.legend || (e.rating ?? 0) >= 4)
    .sort((a, b) => Number(!!b.legend) - Number(!!a.legend) || byRecent(a, b));
  const hated = rated.filter((e) => !e.legend && (e.rating ?? 0) <= 2).sort(byRecent).slice(0, 4);
  const seeds = [
    ...shuffleTail(loved, 6)
      .slice(0, 10)
      .map((e) => ({
        e,
        w: e.legend ? 1.3 : (e.rating ?? 0) >= 4.5 ? 1 : 0.6,
        why: e.legend ? `Porque «${e.snap.title}» es una de tus leyendas` : `Porque te gustó «${e.snap.title}»`,
      })),
    ...shuffleTail(wants.sort((a, b) => (b.desire ?? 0) - (a.desire ?? 0) || byRecent(a, b)), 2)
      .slice(0, 4)
      .map((e) => ({ e, w: 0.3 + (e.desire ?? 1) * 0.07, why: `Porque querés ver «${e.snap.title}»` })),
  ];

  const tasks: Promise<void>[] = [];
  for (const s of seeds) {
    tasks.push(
      recommendationsFor(s.e.snap.type, s.e.snap.id).then((r) => {
        r.items.forEach((it, i) => add(it, s.w * (1 - i / 40), s.why));
      }),
    );
  }
  for (const e of hated) {
    tasks.push(
      recommendationsFor(e.snap.type, e.snap.id).then((r) => {
        r.items.forEach((it) => add(it, (e.rating ?? 0) <= 1 ? -0.7 : -0.35));
      }),
    );
  }

  // 2) Tus actores y directores favoritos (marcados a mano + los que salen de tus notas).
  const pickPeople = (manual: Record<string, FavPerson>, kind: 'actor' | 'director', n: number) => {
    const ids = new Map<number, string>();
    for (const p of shuffleTail(Object.values(manual), 0)) if (ids.size < n) ids.set(p.id, p.name);
    for (const p of autoFavorites(entries, kind, 6)) if (ids.size < n + 2) ids.set(p.id, p.name);
    return [...ids.entries()].slice(0, n + 2);
  };
  for (const [id, name] of pickPeople(input.favActors, 'actor', 3)) {
    tasks.push(
      getCredits(id).then((c) => {
        const items = toSummaries(c.cast)
          .filter((x) => (x.votes ?? 0) >= 80)
          .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
          .slice(0, 25);
        items.forEach((it, i) => add(it, 0.5 * (1 - i / 50), `Con ${name}, de tus favoritos`));
      }),
    );
  }
  for (const [id, name] of pickPeople(input.favDirectors, 'director', 3)) {
    tasks.push(
      getCredits(id).then((c) => {
        const items = toSummaries(c.crew.filter((x) => x.job === 'Director' || x.job === 'Creator'))
          .filter((x) => (x.votes ?? 0) >= 50)
          .sort((a, b) => (b.tmdbScore ?? 0) - (a.tmdbScore ?? 0))
          .slice(0, 25);
        items.forEach((it) => add(it, 0.6, `De ${name}, de tus directores favoritos`));
      }),
    );
  }

  // 3) Tus géneros preferidos: lo mejor puntuado de cada uno.
  const aff = genreAffinity(entries);
  const topGenres = [...aff.entries()].filter(([, v]) => v > 0.25).sort((a, b) => b[1] - a[1]).slice(0, 3);
  for (const [g] of topGenres) {
    for (const t of types) {
      tasks.push(
        list(`/discover/${t}`, { with_genres: g, sort_by: 'vote_average.desc', 'vote_count.gte': t === 'movie' ? 800 : 250, page: 1 + Math.floor(Math.random() * 3) }, t, DAY).then((r) =>
          r.items.forEach((it) => {
            if (it.genreIds.includes(g)) add(it, 0.3, `Porque te gusta ${genreNames.get(g)?.toLowerCase() ?? 'este género'}`);
          }),
        ),
      );
    }
  }

  // 4) Arranque en frío: lo más visto de todos los tiempos, para que califiques lo que ya viste.
  const coldStart = rated.length < 5;
  if (coldStart || cands.size < 15) {
    for (const t of types) {
      for (const page of [1, 2, 3]) {
        tasks.push(
          list(`/discover/${t}`, { sort_by: 'vote_count.desc', page }, t, 7 * DAY).then((r) =>
            r.items.forEach((it, i) => add(it, 0.25 - (page - 1) * 0.05 - i / 400, coldStart ? 'Muy vista — ¿ya la viste?' : 'Un clásico popular')),
          ),
        );
      }
    }
    tasks.push(
      list('/trending/all/week', {}, undefined, 6 * 3600_000).then((r) => r.items.forEach((it) => add(it, 0.12, 'Tendencia esta semana'))),
    );
  }

  await Promise.allSettled(tasks);

  // Puntaje final: coincidencias + afinidad de género + calidad general.
  const out = [...cands.values()].filter((c) => c.score > 0.05);
  for (const c of out) {
    const g = c.item.genreIds.map((id) => aff.get(id) ?? 0);
    const gScore = g.length ? g.reduce((a, b) => a + b, 0) / g.length : 0;
    const quality = ((c.item.tmdbScore ?? 6) - 6.5) * 0.08;
    const multi = Math.min(c.reasons.length, 4) * 0.05;
    c.score = c.score + gScore * 0.5 + quality + multi + Math.random() * 0.05;
    c.reasons.sort((a, b) => b.w - a.w);
  }
  out.sort((a, b) => b.score - a.score);
  return { candidates: out, coldStart, ratedCount: rated.length };
}
