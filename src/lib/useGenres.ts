import { useMemo } from 'react';
import { useAsync } from './useAsync';
import { getGenres, type Genre } from './tmdb';
import { useStore } from './store';
import type { MediaType } from './types';

export function useGenres(type: MediaType) {
  const lang = useStore((s) => s.settings.language);
  const key = useStore((s) => !!s.settings.tmdbKey);
  return useAsync(() => getGenres(type), [type, lang], key);
}

/** Nombres de géneros de películas y series juntos (id → nombre). */
export function useGenreMap() {
  const m = useGenres('movie');
  const t = useGenres('tv');
  return useMemo(() => {
    const map = new Map<number, string>();
    for (const g of [...(t.data ?? []), ...(m.data ?? [])] as Genre[]) map.set(g.id, g.name);
    return map;
  }, [m.data, t.data]);
}
