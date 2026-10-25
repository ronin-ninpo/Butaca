export type MediaType = 'movie' | 'tv';
/** later = «Ahora no»: no se recomienda de nuevo, pero se puede revisar desde Para vos */
export type Status = 'want' | 'seen' | 'skip' | 'later';

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
  /** De 0,5 a 5 en pasos de 0,5 */
  rating?: number;
  /** Una de mis favoritas de siempre: va arriba de todo en "Mis favoritas" */
  legend?: boolean;
  /** Clásico: una película que marcó una época (no cambia el ranking) */
  classic?: boolean;
  /** Ganas de verla (solo en Quiero ver): 1 algún día, 2 tengo ganas, 3 muchas ganas */
  desire?: 1 | 2 | 3;
  /** Vista, pero la quiero volver a ver (sigue en Vistas) */
  rewatch?: boolean;
  /** Con quién la querés ver (nombres de etiquetas) */
  withWho?: string[];
  addedAt: number;
  seenAt?: number;
  /** Último cambio (para sincronizar entre dispositivos) */
  updatedAt?: number;
  snap: Snapshot;
}

export interface FavPerson extends PersonRef {
  addedAt: number;
}

export type FavKind = 'actor' | 'director';

/** Marcas especiales al calificar */
export interface Marks {
  legend?: boolean;
  classic?: boolean;
  rewatch?: boolean;
}

export const keyOf = (type: MediaType, id: number) => `${type}:${id}`;
