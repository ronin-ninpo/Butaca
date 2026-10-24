import { cached, DAY, HOUR, limiter } from './cache';
import { getSettings } from './store';

export interface ImdbRating {
  rating: string | null;
  votes: string | null;
}

let pausedUntil = 0;
const queue = limiter(3);

async function query(imdbId: string, key: string) {
  const res = await fetch(`https://www.omdbapi.com/?i=${encodeURIComponent(imdbId)}&apikey=${encodeURIComponent(key.trim())}`);
  if (res.status === 401) throw new Error('La clave de OMDb no es válida o no está activada.');
  const j = await res.json();
  if (j.Response === 'False') {
    if (/limit/i.test(j.Error ?? '')) {
      pausedUntil = Date.now() + HOUR;
      throw new Error('Se alcanzó el límite diario de OMDb.');
    }
    if (/invalid api key|no api key/i.test(j.Error ?? '')) throw new Error('La clave de OMDb no es válida o no está activada.');
    return { rating: null, votes: null };
  }
  return {
    rating: j.imdbRating && j.imdbRating !== 'N/A' ? j.imdbRating : null,
    votes: j.imdbVotes && j.imdbVotes !== 'N/A' ? j.imdbVotes : null,
  };
}

/** Nota de IMDb vía OMDb. Devuelve null si no hay clave o no se pudo obtener. */
export async function getImdbRating(imdbId: string | null | undefined): Promise<ImdbRating | null> {
  const { omdbKey } = getSettings();
  if (!imdbId || !omdbKey || Date.now() < pausedUntil) return null;
  try {
    return await cached('omdb:' + imdbId, 5 * DAY, () => queue(() => query(imdbId, omdbKey)));
  } catch {
    return null;
  }
}

export async function testOmdbKey(key: string) {
  await query('tt0111161', key);
  return true;
}
