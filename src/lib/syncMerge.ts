import type { Entry, FavPerson } from './types';
import type { RemotePatch, Settings } from './store';

/** Lo que se guarda en la nube de cada título. `deleted` marca que se quitó de las listas. */
export interface RemoteEntry extends Entry {
  updatedAt: number;
  deleted?: boolean;
}

export type SyncedSettings = Pick<Settings, 'tmdbKey' | 'omdbKey' | 'region' | 'includeTv'>;

export const META_FIELDS = ['order', 'favActors', 'favDirectors', 'settings'] as const;
export type MetaField = (typeof META_FIELDS)[number];

/** Documento users/{uid}: listas generales, cada una con la fecha de su último cambio. */
export interface RemoteMeta {
  order?: string[];
  orderAt?: number;
  favActors?: Record<string, FavPerson>;
  favActorsAt?: number;
  favDirectors?: Record<string, FavPerson>;
  favDirectorsAt?: number;
  settings?: Partial<SyncedSettings>;
  settingsAt?: number;
}

/** Fecha del último cambio local de cada lista general (y de qué cuenta). */
export interface LocalMeta {
  uid: string;
  order: number;
  favActors: number;
  favDirectors: number;
  settings: number;
}

export interface LocalState {
  entries: Record<string, Entry>;
  order: string[];
  favActors: Record<string, FavPerson>;
  favDirectors: Record<string, FavPerson>;
  settings: Settings;
}

/** Fecha de último cambio de un título (los guardados antes de la sincronización no la tienen). */
export const stamp = (e: Entry) => e.updatedAt ?? Math.max(e.addedAt ?? 0, e.seenAt ?? 0);

export function fromRemote(r: RemoteEntry): Entry {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { deleted, ...e } = r;
  return e;
}

export const syncedSettings = (s: Settings): SyncedSettings => ({ tmdbKey: s.tmdbKey, omdbKey: s.omdbKey, region: s.region, includeTv: s.includeTv });

/** Qué cambia en el dispositivo y qué hay que subir, al aplicar un título que llegó de la nube. */
export function remoteEntryAction(local: Entry | undefined, r: RemoteEntry): 'upsert' | 'delete' | null {
  if (r.deleted) return local && stamp(local) <= r.updatedAt ? 'delete' : null;
  return !local || stamp(local) < r.updatedAt ? 'upsert' : null;
}

export interface MergePlan {
  patch: RemotePatch;
  upload: string[];
  metaUpload: MetaField[];
  meta: LocalMeta;
}

/**
 * Primera sincronización al iniciar sesión: junta lo del dispositivo con lo de la nube.
 * - Títulos: gana el cambio más reciente; lo que solo está en un lado se conserva.
 * - Favoritos: la primera vez en este dispositivo se suman los de ambos lados; después gana lo más reciente.
 * - Si el dispositivo tenía datos de OTRA cuenta, no se mezclan: se reemplazan por los de esta.
 */
export function mergeInitial(local: LocalState, remote: RemoteEntry[], rmeta: RemoteMeta | null, prevMeta: LocalMeta | null, uid: string, now = Date.now()): MergePlan {
  const otherAccount = !!prevMeta && prevMeta.uid !== uid;
  const firstTime = !prevMeta || otherAccount;
  const meta: LocalMeta = firstTime ? { uid, order: 0, favActors: 0, favDirectors: 0, settings: 0 } : { ...prevMeta };
  const localEntries = otherAccount ? {} : local.entries;

  const patch: RemotePatch = { upserts: [], deletes: [] };
  const upload: string[] = [];
  const remoteByKey = new Map(remote.map((r) => [r.key, r]));

  if (otherAccount) patch.deletes = Object.keys(local.entries).filter((k) => !remoteByKey.has(k) || remoteByKey.get(k)!.deleted);
  for (const r of remote) {
    const action = remoteEntryAction(localEntries[r.key], r);
    if (action === 'upsert') patch.upserts!.push(fromRemote(r));
    if (action === 'delete') patch.deletes!.push(r.key);
  }
  for (const l of Object.values(localEntries)) {
    const r = remoteByKey.get(l.key);
    if (!r || stamp(l) > r.updatedAt) upload.push(l.key);
  }

  const metaUpload: MetaField[] = [];

  for (const f of ['favActors', 'favDirectors'] as const) {
    const rv = rmeta?.[f];
    const rAt = rmeta?.[`${f}At`] ?? 0;
    if (firstTime) {
      const merged = { ...(rv ?? {}), ...(otherAccount ? {} : local[f]) };
      patch[f] = merged;
      if (Object.keys(merged).length !== Object.keys(rv ?? {}).length || !rv) {
        metaUpload.push(f);
        meta[f] = now;
      } else meta[f] = rAt;
    } else if (rv && rAt > meta[f]) {
      patch[f] = rv;
      meta[f] = rAt;
    } else if (meta[f] > rAt) metaUpload.push(f);
  }

  {
    const rv = rmeta?.order;
    const rAt = rmeta?.orderAt ?? 0;
    if (firstTime) {
      // El orden de la nube primero; lo que solo estaba en este dispositivo va al final (applyRemote completa y limpia).
      const localOrder = otherAccount ? [] : local.order;
      const merged = [...(rv ?? []), ...localOrder.filter((k) => !(rv ?? []).includes(k))];
      patch.order = merged;
      metaUpload.push('order');
      meta.order = now;
    } else if (rv && rAt > meta.order) {
      patch.order = rv;
      meta.order = rAt;
    } else if (meta.order > rAt) metaUpload.push('order');
  }

  {
    const rv = rmeta?.settings;
    const rAt = rmeta?.settingsAt ?? 0;
    const ls = syncedSettings(local.settings);
    if (firstTime) {
      // Claves: si un lado no tiene, se toma la del otro. País y series: lo de la nube si existe.
      const merged: SyncedSettings = {
        tmdbKey: ls.tmdbKey || rv?.tmdbKey || '',
        omdbKey: ls.omdbKey || rv?.omdbKey || '',
        region: rv?.region ?? ls.region,
        includeTv: rv?.includeTv ?? ls.includeTv,
      };
      patch.settings = merged;
      metaUpload.push('settings');
      meta.settings = now;
    } else if (rv && rAt > meta.settings) {
      patch.settings = rv;
      meta.settings = rAt;
    } else if (meta.settings > rAt) metaUpload.push('settings');
  }

  return { patch, upload, metaUpload, meta };
}
