import { useEffect, useState } from 'react';
import { DAY, limiter } from './cache';
import { getSettings, useStore } from './store';
import { tmdb, type Provider, type WatchRegion } from './tmdb';
import type { MediaType } from './types';

/** Una plataforma de streaming (las variantes "con anuncios" cuentan como la misma). */
export interface Platform {
  key: string;
  name: string;
  logo: string;
}

const queue = limiter(6);
/** Respuestas ya resueltas en esta sesión (además de la caché de TMDB en IndexedDB). */
const known = new Map<string, string[]>();
const failed = new Set<string>();
const platforms = new Map<string, Platform>();

const platformName = (name: string) => name.replace(/\s+(basic|standard|premium)?\s*with ads$/i, '').trim();

function register(p: Provider): string {
  const name = platformName(p.provider_name);
  const key = name.toLowerCase();
  if (!platforms.has(key)) platforms.set(key, { key, name, logo: p.logo_path });
  return key;
}

/** Plataformas donde el título está incluido en la suscripción (o gratis), en tu país. */
async function fetchPlatforms(type: MediaType, id: number, region: string): Promise<string[]> {
  const r = await tmdb<{ results?: Record<string, WatchRegion> }>(`/${type}/${id}/watch/providers`, {}, DAY);
  const w = r.results?.[region];
  if (!w) return [];
  return [...new Set([...(w.flatrate ?? []), ...(w.free ?? []), ...(w.ads ?? [])].map(register))];
}

export const getPlatform = (key: string) => platforms.get(key);

/**
 * Para una lista de títulos, en qué plataformas está cada uno. Va completándose a medida que llegan las respuestas.
 * Devuelve también cuántos ya se consultaron, para mostrar el avance.
 */
export function useAvailability(items: { key: string; type: MediaType; id: number }[]) {
  const region = useStore((s) => s.settings.region);
  const [, setTick] = useState(0);
  const ids = items.map((i) => i.key).join(',');

  useEffect(() => {
    let alive = true;
    let pendingRefresh: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (pendingRefresh) return;
      pendingRefresh = setTimeout(() => {
        pendingRefresh = undefined;
        if (alive) setTick((t) => t + 1);
      }, 150);
    };
    for (const it of items) {
      const k = `${region}|${it.key}`;
      if (known.has(k)) continue;
      queue(() => (alive ? fetchPlatforms(it.type, it.id, getSettings().region) : Promise.resolve(null)))
        .then((keys) => {
          if (keys) {
            known.set(k, keys);
            failed.delete(k);
          }
        })
        .catch(() => {
          // Se reintenta la próxima vez que se abra la lista.
          failed.add(k);
        })
        .finally(refresh);
    }
    return () => {
      alive = false;
      clearTimeout(pendingRefresh);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, region]);

  const byKey = new Map<string, string[]>();
  let errors = 0;
  for (const it of items) {
    const v = known.get(`${region}|${it.key}`);
    if (v) byKey.set(it.key, v);
    else if (failed.has(`${region}|${it.key}`)) errors++;
  }
  const tally = new Map<string, number>();
  for (const keys of byKey.values()) for (const p of keys) tally.set(p, (tally.get(p) ?? 0) + 1);
  const counts = [...tally.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  return { byKey, counts, done: byKey.size + errors, errors, total: items.length };
}
