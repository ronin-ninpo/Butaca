import { useEffect, useState } from 'react';
import { getImdbId } from './tmdb';
import { getImdbRating } from './omdb';
import { useStore } from './store';
import type { MediaType } from './types';
import { keyOf } from './types';

export interface RatingInfo {
  value: string | null;
  source: 'imdb' | 'tmdb' | null;
  votes?: string | null;
  loading: boolean;
}

/**
 * Nota de IMDb para un título. Si no hay clave de OMDb (o falla) usa la nota de TMDB, marcada como tal.
 * `enabled` permite esperar a que la tarjeta sea visible antes de consultar.
 */
export function useRating(type: MediaType, id: number, opts: { imdbId?: string | null; tmdbScore?: number; enabled?: boolean } = {}): RatingInfo {
  const { imdbId, tmdbScore, enabled = true } = opts;
  const omdbKey = useStore((s) => s.settings.omdbKey);
  const stored = useStore((s) => s.entries[keyOf(type, id)]?.snap.imdbRating);
  const fallback: RatingInfo = tmdbScore
    ? { value: tmdbScore.toFixed(1), source: 'tmdb', loading: false }
    : { value: null, source: null, loading: false };
  const [info, setInfo] = useState<RatingInfo>(stored ? { value: stored, source: 'imdb', loading: false } : { ...fallback, loading: !!omdbKey });

  useEffect(() => {
    let alive = true;
    if (!omdbKey) {
      setInfo(fallback);
      return;
    }
    if (!enabled) return;
    (async () => {
      try {
        const iid = imdbId ?? (await getImdbId(type, id));
        const r = await getImdbRating(iid);
        if (!alive) return;
        if (r?.rating) setInfo({ value: r.rating, source: 'imdb', votes: r.votes, loading: false });
        else setInfo(stored ? { value: stored, source: 'imdb', loading: false } : fallback);
      } catch {
        if (alive) setInfo(stored ? { value: stored, source: 'imdb', loading: false } : fallback);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, id, imdbId, omdbKey, enabled]);

  return info;
}
