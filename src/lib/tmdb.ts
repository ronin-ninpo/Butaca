import { cached, DAY, HOUR } from './cache';
import { getSettings } from './store';
import type { MediaSummary, MediaType, PersonRef, Snapshot } from './types';

const BASE = 'https://api.themoviedb.org/3';
export const IMG = 'https://image.tmdb.org/t/p/';

export const img = (path: string | null | undefined, size: 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'h632' | 'original' = 'w342') =>
  path ? `${IMG}${size}${path}` : undefined;

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

type Params = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, params: Params, language: string) {
  const url = new URL(BASE + path);
  const all: Params = { language, ...params };
  for (const [k, v] of Object.entries(all)) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  }
  return url;
}

async function rawFetch(url: URL, key: string) {
  const k = key.trim();
  const headers: Record<string, string> = { accept: 'application/json' };
  const u = new URL(url);
  // Acepta tanto la "API Key" (v3) como el "Token de lectura" (v4, empieza con eyJ).
  if (k.startsWith('eyJ')) headers.Authorization = `Bearer ${k}`;
  else u.searchParams.set('api_key', k);
  let res: Response;
  try {
    res = await fetch(u, { headers });
  } catch {
    throw new ApiError('Sin conexión con TMDB. Revisá tu internet.', 0);
  }
  if (!res.ok) {
    if (res.status === 401) throw new ApiError('La clave de TMDB no es válida.', 401);
    if (res.status === 404) throw new ApiError('No encontrado.', 404);
    if (res.status === 429) throw new ApiError('Demasiadas consultas seguidas. Probá en unos segundos.', 429);
    throw new ApiError(`Error de TMDB (${res.status}).`, res.status);
  }
  return res.json();
}

export function tmdb<T>(path: string, params: Params = {}, ttl = 12 * HOUR): Promise<T> {
  const { tmdbKey, language } = getSettings();
  if (!tmdbKey) return Promise.reject(new ApiError('Falta configurar la clave de TMDB.', 0));
  const url = buildUrl(path, params, language);
  return cached<T>('tmdb:' + url.toString(), ttl, () => rawFetch(url, tmdbKey));
}

/** Verifica una clave sin guardarla. */
export async function testTmdbKey(key: string) {
  await rawFetch(buildUrl('/configuration', {}, 'es-MX'), key);
  return true;
}

// ---------- Tipos crudos de TMDB ----------

export interface RawItem {
  id: number;
  media_type?: 'movie' | 'tv' | 'person';
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  release_date?: string;
  first_air_date?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  profile_path?: string | null;
  overview?: string;
  genre_ids?: number[];
  vote_average?: number;
  vote_count?: number;
  popularity?: number;
  known_for_department?: string;
  known_for?: RawItem[];
  character?: string;
  job?: string;
  department?: string;
  episode_count?: number;
}

export interface Paged<T> {
  page: number;
  results: T[];
  total_pages: number;
  total_results: number;
  dates?: { minimum: string; maximum: string };
}

export interface RawPerson {
  id: number;
  name: string;
  profile_path: string | null;
  character?: string;
  job?: string;
  order?: number;
  roles?: { character: string; episode_count: number }[];
  jobs?: { job: string }[];
  known_for_department?: string;
  gender?: number;
}

export interface Provider {
  provider_id: number;
  provider_name: string;
  logo_path: string;
  display_priority?: number;
}

export interface WatchRegion {
  link?: string;
  flatrate?: Provider[];
  rent?: Provider[];
  buy?: Provider[];
  ads?: Provider[];
  free?: Provider[];
}

export interface Video {
  key: string;
  site: string;
  type: string;
  official?: boolean;
  iso_639_1?: string;
  name: string;
  published_at?: string;
}

export interface RawDetails extends RawItem {
  genres: { id: number; name: string }[];
  runtime?: number;
  episode_run_time?: number[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  last_air_date?: string;
  status?: string;
  tagline?: string;
  imdb_id?: string | null;
  created_by?: { id: number; name: string; profile_path: string | null }[];
  credits?: { cast: RawPerson[]; crew: RawPerson[] };
  aggregate_credits?: { cast: RawPerson[]; crew: RawPerson[] };
  videos?: { results: Video[] };
  'watch/providers'?: { results: Record<string, WatchRegion> };
  release_dates?: { results: { iso_3166_1: string; release_dates: { certification: string; type: number; release_date: string }[] }[] };
  content_ratings?: { results: { iso_3166_1: string; rating: string }[] };
  translations?: { translations: { iso_639_1: string; iso_3166_1: string; data: { title?: string; name?: string; overview?: string; tagline?: string } }[] };
  alternative_titles?: { titles?: { iso_3166_1: string; title: string; type: string }[]; results?: { iso_3166_1: string; title: string; type: string }[] };
  recommendations?: Paged<RawItem>;
  similar?: Paged<RawItem>;
  external_ids?: { imdb_id?: string | null };
}

export interface RawPersonDetails {
  id: number;
  name: string;
  biography: string;
  birthday: string | null;
  deathday: string | null;
  place_of_birth: string | null;
  profile_path: string | null;
  known_for_department: string;
  gender: number;
  combined_credits?: { cast: RawItem[]; crew: RawItem[] };
}

// ---------- Normalización ----------

export const yearOf = (d?: string) => (d && d.length >= 4 ? d.slice(0, 4) : undefined);

export function toSummary(r: RawItem, type?: MediaType): MediaSummary | null {
  const t = (type ?? r.media_type) as MediaType | undefined;
  if (t !== 'movie' && t !== 'tv') return null;
  const date = t === 'movie' ? r.release_date : r.first_air_date;
  return {
    type: t,
    id: r.id,
    title: (t === 'movie' ? r.title : r.name) || r.original_title || r.original_name || 'Sin título',
    originalTitle: t === 'movie' ? r.original_title : r.original_name,
    year: yearOf(date),
    date: date || undefined,
    poster: r.poster_path,
    backdrop: r.backdrop_path,
    overview: r.overview,
    genreIds: r.genre_ids ?? [],
    tmdbScore: r.vote_average,
    votes: r.vote_count,
    popularity: r.popularity,
  };
}

export function toSummaries(list: RawItem[] | undefined, type?: MediaType) {
  return (list ?? []).map((r) => toSummary(r, type)).filter((x): x is MediaSummary => !!x);
}

const personRef = (p: { id: number; name: string; profile_path: string | null }): PersonRef => ({
  id: p.id,
  name: p.name,
  profile: p.profile_path,
});

export interface Details {
  summary: MediaSummary;
  raw: RawDetails;
  title: string;
  overview: string;
  overviewLang: 'es' | 'en' | null;
  tagline?: string;
  genres: { id: number; name: string }[];
  runtime?: number;
  directors: PersonRef[];
  directorLabel: string;
  cast: (PersonRef & { character?: string })[];
  imdbId: string | null;
  certification?: string;
  providers?: WatchRegion;
  trailer?: Video;
  recommendations: MediaSummary[];
  seasons?: number;
  episodes?: number;
  yearRange?: string;
}

function pickTrailer(videos: Video[] = []): Video | undefined {
  const yt = videos.filter((v) => v.site === 'YouTube');
  const score = (v: Video) =>
    (v.type === 'Trailer' ? 10 : v.type === 'Teaser' ? 5 : 0) + (v.iso_639_1 === 'es' ? 4 : 0) + (v.official ? 2 : 0);
  return yt.filter((v) => v.type === 'Trailer' || v.type === 'Teaser').sort((a, b) => score(b) - score(a))[0];
}

export async function getDetails(type: MediaType, id: number): Promise<Details> {
  const append =
    type === 'movie'
      ? 'credits,videos,watch/providers,release_dates,translations,alternative_titles,recommendations,similar,external_ids'
      : 'aggregate_credits,credits,videos,watch/providers,content_ratings,translations,alternative_titles,recommendations,similar,external_ids';
  const d = await tmdb<RawDetails>(`/${type}/${id}`, { append_to_response: append, include_video_language: 'es,en,null' }, 3 * DAY);
  const { region } = getSettings();
  const summary = toSummary({ ...d, genre_ids: d.genres?.map((g) => g.id) }, type)!;

  // Título: primero el de tu país (si TMDB lo tiene), si no el latino.
  const trs = d.translations?.translations ?? [];
  const regional = trs.find((t) => t.iso_639_1 === 'es' && t.iso_3166_1 === region);
  const regionalTitle = type === 'movie' ? regional?.data.title : regional?.data.name;
  const alts = (type === 'movie' ? d.alternative_titles?.titles : d.alternative_titles?.results) ?? [];
  const altTitle = alts.find((a) => a.iso_3166_1 === region && !a.type)?.title;
  const title = regionalTitle || (region !== 'MX' ? altTitle : undefined) || summary.title;

  // Sinopsis: oficial en español (las de TMDB son de distribuidora, sin spoilers). Si no hay, en inglés.
  let overview = regional?.data.overview || d.overview || '';
  let overviewLang: Details['overviewLang'] = overview ? 'es' : null;
  if (!overview) {
    const es = trs.find((t) => t.iso_639_1 === 'es' && t.data.overview);
    const en = trs.find((t) => t.iso_639_1 === 'en' && t.data.overview);
    if (es) overview = es.data.overview!;
    else if (en) {
      overview = en.data.overview!;
      overviewLang = 'en';
    }
    if (es) overviewLang = 'es';
  }

  let directors: PersonRef[];
  let directorLabel: string;
  let cast: Details['cast'];
  if (type === 'movie') {
    directors = (d.credits?.crew ?? []).filter((c) => c.job === 'Director').map(personRef);
    directorLabel = 'Dirección';
    cast = (d.credits?.cast ?? []).slice(0, 18).map((c) => ({ ...personRef(c), character: c.character }));
  } else {
    directors = (d.created_by ?? []).map(personRef);
    directorLabel = 'Creada por';
    const agg = d.aggregate_credits?.cast ?? d.credits?.cast ?? [];
    cast = agg.slice(0, 18).map((c) => ({ ...personRef(c), character: c.roles?.[0]?.character ?? c.character }));
  }
  const seen = new Set<number>();
  directors = directors.filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));

  let certification: string | undefined;
  if (type === 'movie') {
    const rd = d.release_dates?.results.find((r) => r.iso_3166_1 === region);
    certification = rd?.release_dates.find((x) => x.certification)?.certification;
  } else {
    certification = d.content_ratings?.results.find((r) => r.iso_3166_1 === region)?.rating || undefined;
  }

  const recs = toSummaries(d.recommendations?.results, type);
  const sim = toSummaries(d.similar?.results, type);
  const recommendations = (recs.length >= 6 ? recs : [...recs, ...sim.filter((s) => !recs.some((r) => r.id === s.id))]).slice(0, 20);

  const yearRange =
    type === 'tv' && summary.year
      ? `${summary.year}${d.status === 'Ended' || d.status === 'Canceled' ? '–' + (yearOf(d.last_air_date) ?? '') : '–'}`
      : undefined;

  return {
    summary: { ...summary, title },
    raw: d,
    title,
    overview,
    overviewLang,
    tagline: regional?.data.tagline || d.tagline || undefined,
    genres: d.genres ?? [],
    runtime: type === 'movie' ? d.runtime : d.episode_run_time?.[0],
    directors,
    directorLabel,
    cast,
    imdbId: d.imdb_id || d.external_ids?.imdb_id || null,
    certification,
    providers: d['watch/providers']?.results?.[region],
    trailer: pickTrailer(d.videos?.results),
    recommendations,
    seasons: d.number_of_seasons,
    episodes: d.number_of_episodes,
    yearRange,
  };
}

export function snapshotFromDetails(det: Details): Snapshot {
  return {
    type: det.summary.type,
    id: det.summary.id,
    title: det.title,
    originalTitle: det.summary.originalTitle,
    year: det.summary.year,
    poster: det.summary.poster,
    genreIds: det.genres.map((g) => g.id),
    directors: det.directors.slice(0, 3),
    cast: det.cast.slice(0, 10).map(({ id, name, profile }) => ({ id, name, profile })),
    imdbId: det.imdbId,
    tmdbScore: det.summary.tmdbScore,
  };
}

export function snapshotFromSummary(s: MediaSummary): Snapshot {
  return {
    type: s.type,
    id: s.id,
    title: s.title,
    originalTitle: s.originalTitle,
    year: s.year,
    poster: s.poster,
    genreIds: s.genreIds,
    tmdbScore: s.tmdbScore,
  };
}

export async function getImdbId(type: MediaType, id: number): Promise<string | null> {
  const r = await tmdb<{ imdb_id?: string | null }>(`/${type}/${id}/external_ids`, {}, 60 * DAY);
  return r.imdb_id || null;
}

// ---------- Listados ----------

export interface Genre {
  id: number;
  name: string;
}

export async function getGenres(type: MediaType): Promise<Genre[]> {
  const r = await tmdb<{ genres: Genre[] }>(`/genre/${type}/list`, {}, 30 * DAY);
  return r.genres;
}

export async function getProviders(type: MediaType): Promise<Provider[]> {
  const { region } = getSettings();
  const r = await tmdb<{ results: (Provider & { display_priorities?: Record<string, number> })[] }>(
    `/watch/providers/${type}`,
    { watch_region: region },
    7 * DAY,
  );
  return r.results
    .map((p) => ({ ...p, display_priority: p.display_priorities?.[region] ?? p.display_priority ?? 999 }))
    .sort((a, b) => (a.display_priority ?? 999) - (b.display_priority ?? 999));
}

export async function list(path: string, params: Params = {}, type?: MediaType, ttl = 6 * HOUR) {
  const r = await tmdb<Paged<RawItem>>(path, params, ttl);
  return { ...r, items: toSummaries(r.results, type) };
}

export interface DiscoverFilters {
  type: MediaType;
  genres: number[];
  genreMode: 'all' | 'any';
  sort: 'popularity' | 'rating' | 'newest' | 'votes';
  yearFrom?: number;
  yearTo?: number;
  minScore?: number;
  providers: number[];
}

export function discover(f: DiscoverFilters, page = 1) {
  const { region } = getSettings();
  const isMovie = f.type === 'movie';
  const dateField = isMovie ? 'primary_release_date' : 'first_air_date';
  const today = new Date().toISOString().slice(0, 10);
  const sortBy = {
    popularity: 'popularity.desc',
    rating: 'vote_average.desc',
    newest: `${dateField}.desc`,
    votes: 'vote_count.desc',
  }[f.sort];
  const params: Params = {
    page,
    sort_by: sortBy,
    include_adult: false,
    with_genres: f.genres.length ? f.genres.join(f.genreMode === 'all' ? ',' : '|') : undefined,
    [`${dateField}.gte`]: f.yearFrom ? `${f.yearFrom}-01-01` : undefined,
    [`${dateField}.lte`]: f.yearTo ? `${f.yearTo}-12-31` : f.sort === 'newest' ? today : undefined,
    'vote_average.gte': f.minScore || undefined,
    'vote_count.gte': f.sort === 'rating' ? (isMovie ? 300 : 150) : f.minScore ? 50 : f.sort === 'newest' ? 10 : undefined,
    with_watch_providers: f.providers.length ? f.providers.join('|') : undefined,
    watch_region: f.providers.length ? region : undefined,
    with_watch_monetization_types: f.providers.length ? 'flatrate|free|ads' : undefined,
  };
  if (!isMovie) params.without_genres = '10767|10763'; // sin talk shows ni noticieros
  return list(`/discover/${f.type}`, params, f.type);
}

export async function searchMulti(query: string, page = 1) {
  const r = await tmdb<Paged<RawItem>>('/search/multi', { query, page, include_adult: false }, HOUR);
  const media = toSummaries(r.results);
  const people = r.results
    .filter((x) => x.media_type === 'person')
    .map((p) => ({ id: p.id, name: p.name ?? '', profile: p.profile_path, dept: p.known_for_department, popularity: p.popularity ?? 0 }));
  return { media, people, totalPages: r.total_pages };
}

export function getPerson(id: number) {
  return tmdb<RawPersonDetails>(`/person/${id}`, { append_to_response: 'combined_credits' }, 3 * DAY);
}

export async function getPersonBioEn(id: number) {
  const r = await tmdb<RawPersonDetails>(`/person/${id}`, { language: 'en-US' }, 7 * DAY);
  return r.biography;
}

export function getCredits(id: number) {
  return tmdb<{ cast: RawItem[]; crew: RawItem[] }>(`/person/${id}/combined_credits`, {}, 3 * DAY);
}

export function recommendationsFor(type: MediaType, id: number) {
  return list(`/${type}/${id}/recommendations`, {}, type, DAY);
}
