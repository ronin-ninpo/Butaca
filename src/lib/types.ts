export type MediaType = 'movie' | 'tv';
export type Status = 'want' | 'seen' | 'skip';

export interface PersonRef {
  id: number;
  name: string;
  profile?: string | null;
}

/** Datos mínimos de una película/serie, para listas y tarjetas. */
export interface MediaSummary {
  type: MediaType;
  id: number;
  title: string;
  originalTitle?: string;
  year?: string;
  date?: string;
  poster?: string | null;
  backdrop?: string | null;
  overview?: string;
  genreIds: number[];
  tmdbScore?: number;
  votes?: number;
  popularity?: number;
}

/** Lo que guardamos en el celular de cada título marcado. */
export interface Snapshot {
  type: MediaType;
  id: number;
  title: string;
  originalTitle?: string;
  year?: string;
  poster?: string | null;
  genreIds: number[];
  directors?: PersonRef[];
  cast?: PersonRef[];
  imdbId?: string | null;
  imdbRating?: string | null;
  tmdbScore?: number;
}

export interface Entry {
  key: string;
  status: Status;
  rating?: number;
  addedAt: number;
  seenAt?: number;
  snap: Snapshot;
}

export interface FavPerson extends PersonRef {
  addedAt: number;
}

export type FavKind = 'actor' | 'director';

export const keyOf = (type: MediaType, id: number) => `${type}:${id}`;
