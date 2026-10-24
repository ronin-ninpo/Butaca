import { useEffect, useRef, useState } from 'react';
import { useRating } from '../lib/useRating';
import type { MediaType } from '../lib/types';

/** Nota de IMDb (o de TMDB si no hay clave de OMDb). Se consulta recién cuando la tarjeta aparece en pantalla. */
export function RatingBadge({ type, id, imdbId, tmdbScore, big, lazy = true }: { type: MediaType; id: number; imdbId?: string | null; tmdbScore?: number; big?: boolean; lazy?: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(!lazy);
  useEffect(() => {
    if (visible || !ref.current) return;
    const io = new IntersectionObserver(
      (es) => {
        if (es.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' },
    );
    io.observe(ref.current);
    return () => io.disconnect();
  }, [visible]);
  const r = useRating(type, id, { imdbId, tmdbScore, enabled: visible });
  return (
    <span ref={ref} className={`rbadge ${big ? 'big' : ''}`} title={r.source === 'tmdb' ? 'Nota de TMDB (configurá OMDb para ver la de IMDb)' : 'Nota de IMDb'}>
      {r.value ? (
        <>
          <span className={`tag ${r.source === 'tmdb' ? 'tmdb' : ''}`}>{r.source === 'tmdb' ? 'TMDB' : 'IMDb'}</span>
          {r.value}
          {big && r.votes ? <span className="muted small" style={{ fontWeight: 500 }}>({fmtVotes(r.votes)} votos)</span> : null}
        </>
      ) : r.loading ? (
        <span className="faint">…</span>
      ) : null}
    </span>
  );
}

function fmtVotes(v: string) {
  const n = Number(v.replace(/[^\d]/g, ''));
  return n ? n.toLocaleString('es-AR') : v;
}
