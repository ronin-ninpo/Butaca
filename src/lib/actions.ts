import { useStore } from './store';
import { getDetails, snapshotFromDetails, snapshotFromSummary, type Details } from './tmdb';
import { getImdbRating } from './omdb';
import { toast } from './toast';
import type { Marks, MediaSummary, Snapshot, Status } from './types';
import { keyOf } from './types';

import { fmtRating, ratingLabel, starsText } from './rating';

const ratingText = (title: string, rating?: number, marks: Marks = {}) => {
  const base = marks.legend
    ? `«${title}»: 👑 Leyenda${rating ? ` · ${starsText(rating)}` : ''}`
    : rating
      ? `«${title}»: ${starsText(rating)} ${fmtRating(rating)} · ${ratingLabel(rating)}`
      : `«${title}» marcada como vista`;
  return base + (marks.classic ? ' · 🏅 Clásico' : '') + (marks.rewatch ? ' · para volver a ver' : '');
};

export function toggleRewatch(key: string) {
  const e = useStore.getState().entries[key];
  if (!e || e.status !== 'seen') return;
  const undo = undoFor(key);
  useStore.getState().setRewatch(key, !e.rewatch);
  toast(e.rewatch ? `«${e.snap.title}» ya no está para volver a ver` : `«${e.snap.title}» marcada para volver a ver`, { label: 'Deshacer', run: undo });
}

function isDetails(x: MediaSummary | Details): x is Details {
  return (x as Details).raw !== undefined;
}

/** Completa la ficha guardada con reparto, dirección y nota de IMDb (para favoritos y recomendaciones). */
async function enrich(key: string, base: Snapshot, det?: Details) {
  try {
    const d = det ?? (await getDetails(base.type, base.id));
    const snap = snapshotFromDetails(d);
    if (useStore.getState().entries[key]) useStore.getState().updateSnap(key, snap);
    const r = await getImdbRating(snap.imdbId);
    if (r?.rating && useStore.getState().entries[key]) useStore.getState().updateSnap(key, { imdbRating: r.rating });
  } catch {
    /* se reintenta la próxima vez que se abra la ficha */
  }
}

function undoFor(key: string) {
  const s = useStore.getState();
  const prev = s.entries[key];
  const idx = s.order.indexOf(key);
  return () => {
    if (prev) useStore.getState().restore(prev, idx);
    else useStore.getState().remove(key);
  };
}

/** Marca un título como "quiero verla", "ya la vi" (con o sin estrellas) o "no me interesa". */
export function mark(target: MediaSummary | Details, status: Status, rating?: number, marks: Marks = {}, opts: { quiet?: boolean } = {}) {
  const det = isDetails(target) ? target : undefined;
  const snap = det ? snapshotFromDetails(det) : snapshotFromSummary(target as MediaSummary);
  const key = keyOf(snap.type, snap.id);
  const undo = undoFor(key);
  const store = useStore.getState();
  const prev = store.entries[key];
  if (status === 'seen' && prev?.status === 'seen') {
    store.updateSnap(key, snap);
    store.setRating(key, rating, marks);
  } else {
    store.setStatus(snap, status, rating, marks);
  }

  const needsEnrich = !det && (!prev?.snap.cast || !prev?.snap.directors);
  if (needsEnrich || (det && !prev?.snap.imdbRating)) enrich(key, snap, det);

  if (!opts.quiet) {
    const t = snap.title;
    const msg =
      status === 'want'
        ? `«${t}» agregada a Quiero ver`
        : status === 'seen'
          ? ratingText(t, rating, marks)
          : `No te vamos a recomendar «${t}»`;
    toast(msg, { label: 'Deshacer', run: undo });
  }
}

export function unmark(key: string) {
  const e = useStore.getState().entries[key];
  if (!e) return;
  const undo = undoFor(key);
  useStore.getState().remove(key);
  toast(`«${e.snap.title}» quitada de tus listas`, { label: 'Deshacer', run: undo });
}

export function rate(key: string, rating: number | undefined, marks: Marks = {}) {
  const e = useStore.getState().entries[key];
  if (!e) return;
  const undo = undoFor(key);
  useStore.getState().setRating(key, rating, marks);
  toast(ratingText(e.snap.title, rating, marks), { label: 'Deshacer', run: undo });
}
