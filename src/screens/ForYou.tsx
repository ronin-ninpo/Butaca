import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../lib/store';
import { useAsync } from '../lib/useAsync';
import { buildRecommendations, type Candidate } from '../lib/recommend';
import { getDetails, img, type Details } from '../lib/tmdb';
import { useGenreMap, useGenres } from '../lib/useGenres';
import { mark } from '../lib/actions';
import { useSheets } from '../lib/sheets';
import { keyOf, type MediaType } from '../lib/types';
import { TopBar, SettingsButton } from '../components/Bars';
import { Poster } from '../components/Poster';
import { RatingBadge } from '../components/RatingBadge';
import { Icon } from '../components/Icon';
import { Empty, ErrorBox, Segmented } from '../components/Misc';

type TypeFilter = 'movie' | 'tv' | 'all';

function readPref<T>(k: string, def: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : def;
  } catch {
    return def;
  }
}
function writePref(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* sin almacenamiento: no pasa nada */
  }
}

export function ForYou() {
  const includeTv = useStore((s) => s.settings.includeTv);
  const entries = useStore((s) => s.entries);
  const [typeF, setTypeF] = useState<TypeFilter>(() => readPref('butaca.fy.type', 'movie'));
  const [genresF, setGenresF] = useState<number[]>(() => readPref('butaca.fy.genres', []));
  const [later, setLater] = useState<string[]>([]);
  const [tick, setTick] = useState(0);
  const genreMap = useGenreMap();
  const effectiveType: TypeFilter = includeTv ? typeF : 'movie';
  const types: MediaType[] = effectiveType === 'all' ? ['movie', 'tv'] : [effectiveType];
  const genreList = useGenres(effectiveType === 'tv' ? 'tv' : 'movie');

  useEffect(() => writePref('butaca.fy.type', typeF), [typeF]);
  useEffect(() => writePref('butaca.fy.genres', genresF), [genresF]);

  const recs = useAsync(
    () => {
      const s = useStore.getState();
      return buildRecommendations({ entries: s.entries, favActors: s.favActors, favDirectors: s.favDirectors, types });
    },
    [effectiveType, tick],
  );

  const queue = useMemo(() => {
    const list = recs.data?.candidates ?? [];
    return list.filter((c) => {
      const k = keyOf(c.item.type, c.item.id);
      if (entries[k] || later.includes(k)) return false;
      if (genresF.length && !c.item.genreIds.some((g) => genresF.includes(g))) return false;
      return true;
    });
  }, [recs.data, entries, later, genresF]);

  // Cuando se acaba el mazo, primero vuelven las "ahora no"; si tampoco hay, recalculamos.
  const lastAuto = useRef(0);
  useEffect(() => {
    if (recs.loading || !recs.data) return;
    if (queue.length === 0 && later.length) {
      setLater([]);
      return;
    }
    if (queue.length < 3 && recs.data.candidates.length >= 10 && Date.now() - lastAuto.current > 20_000) {
      lastAuto.current = Date.now();
      setTick((t) => t + 1);
    }
  }, [queue.length, recs.loading, recs.data, later.length]);

  const current = queue[0];
  const ratedCount = Object.values(entries).filter((e) => e.status === 'seen' && e.rating).length;
  const coldStart = ratedCount < 5;

  // Precarga de las próximas fichas para que el mazo sea fluido.
  useEffect(() => {
    queue.slice(1, 3).forEach((c) => getDetails(c.item.type, c.item.id).catch(() => {}));
  }, [queue]);

  const genreChips = (genreList.data ?? []).filter((g) => ![10770, 10763, 10764, 10767].includes(g.id));

  return (
    <>
      <TopBar
        title="Para vos"
        right={
          <>
            <button className="icon-btn" aria-label="Actualizar recomendaciones" onClick={() => setTick((t) => t + 1)}>
              <Icon name="refresh" size={19} />
            </button>
            <SettingsButton />
          </>
        }
      />
      <div className="page">
        {includeTv && (
          <Segmented<TypeFilter>
            value={typeF}
            onChange={(v) => {
              setTypeF(v);
              setGenresF([]);
            }}
            options={[
              { value: 'movie', label: 'Películas' },
              { value: 'tv', label: 'Series' },
              { value: 'all', label: 'Todo' },
            ]}
          />
        )}
        <div className="chips" style={{ marginTop: 10 }}>
          <button className={`chip ${genresF.length === 0 ? 'on' : ''}`} onClick={() => setGenresF([])}>
            Todos los géneros
          </button>
          {genreChips.map((g) => (
            <button
              key={g.id}
              className={`chip ${genresF.includes(g.id) ? 'on' : ''}`}
              onClick={() => setGenresF((cur) => (cur.includes(g.id) ? cur.filter((x) => x !== g.id) : [...cur, g.id]))}
            >
              {g.name}
            </button>
          ))}
        </div>

        {coldStart && (
          <div className="banner" style={{ marginTop: 12 }}>
            <Icon name="sparkles" size={18} />
            <div>
              <b>Enseñame tus gustos:</b> calificá las que ya viste y descartá las que no te interesan.{' '}
              <span className="muted">({ratedCount} de 5)</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12 }}>
        {recs.loading && !current ? (
          <div className="page">
            <div className="skel" style={{ aspectRatio: '16/11', borderRadius: 22 }} />
            <div className="skel" style={{ height: 160, marginTop: 10, borderRadius: 22 }} />
          </div>
        ) : recs.error && !current ? (
          <ErrorBox error={recs.error} onRetry={recs.reload} />
        ) : !current ? (
          <Empty icon="sparkles" title="No hay más recomendaciones por ahora">
            <p>{genresF.length ? 'Probá quitando algún filtro de género.' : 'Calificá más películas o marcá favoritos para descubrir más.'}</p>
            <button className="btn primary" style={{ marginTop: 14 }} onClick={() => setTick((t) => t + 1)}>
              <Icon name="refresh" size={18} /> Buscar más
            </button>
          </Empty>
        ) : (
          <Deck key={keyOf(current.item.type, current.item.id)} cand={current} genreMap={genreMap} onLater={() => setLater((l) => [...l, keyOf(current.item.type, current.item.id)])} />
        )}
        {recs.loading && current && <p className="center faint small" style={{ marginTop: 6 }}>Buscando más…</p>}
      </div>
    </>
  );
}

function Deck({ cand, genreMap, onLater }: { cand: Candidate; genreMap: Map<number, string>; onLater: () => void }) {
  const it = cand.item;
  const det = useAsync<Details>(() => getDetails(it.type, it.id), [it.type, it.id]);
  const openRate = useSheets((s) => s.openRate);
  const navigate = useNavigate();
  const target = det.data ?? it;

  const [dx, setDx] = useState(0);
  const [out, setOut] = useState<'left' | 'right' | 'down' | null>(null);
  const drag = useRef<{ x: number; y: number; active: boolean } | null>(null);
  const suppressClick = useRef(false);

  const fly = (dir: 'left' | 'right' | 'down', then: () => void) => {
    setOut(dir);
    setTimeout(then, 220);
  };
  const want = () => fly('right', () => mark(target, 'want'));
  const skip = () => fly('left', () => mark(target, 'skip'));
  const later = () => fly('down', onLater);

  const onDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, active: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const mx = e.clientX - d.x;
    const my = e.clientY - d.y;
    if (!d.active) {
      if (Math.abs(mx) > 12 && Math.abs(mx) > Math.abs(my) * 1.3) {
        d.active = true;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
      } else if (Math.abs(my) > 12) {
        drag.current = null;
        return;
      }
    }
    if (d.active) setDx(mx);
  };
  const onUp = () => {
    const d = drag.current;
    drag.current = null;
    if (!d?.active) return;
    suppressClick.current = true;
    setTimeout(() => (suppressClick.current = false), 60);
    if (dx > 110) want();
    else if (dx < -110) skip();
    setDx(0);
  };

  const transform = out
    ? out === 'right'
      ? 'translateX(130%) rotate(14deg)'
      : out === 'left'
        ? 'translateX(-130%) rotate(-14deg)'
        : 'translateY(40px) scale(0.92)'
    : dx
      ? `translateX(${dx}px) rotate(${dx / 22}deg)`
      : undefined;

  const d = det.data;
  const genres = (d?.genres.map((g) => g.name) ?? it.genreIds.map((g) => genreMap.get(g)).filter(Boolean)).slice(0, 3);
  const overview = d?.overview || it.overview;
  const backdrop = img(it.backdrop ?? d?.raw.backdrop_path, 'w780');

  return (
    <>
      <div className="deck">
        <article
          className={`rec-card ${dx && !out ? 'dragging' : ''}`}
          style={{ transform, opacity: out ? 0 : 1 }}
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onClick={() => {
            if (!suppressClick.current && !dx) navigate(`/t/${it.type}/${it.id}`);
          }}
        >
          <div className="stamp yes" style={{ opacity: Math.max(0, Math.min(1, dx / 110)) }}>
            QUIERO VERLA
          </div>
          <div className="stamp no" style={{ opacity: Math.max(0, Math.min(1, -dx / 110)) }}>
            PASO
          </div>
          <div className="art">
            {backdrop ? <img className="bd" src={backdrop} alt="" draggable={false} /> : null}
            <Poster path={it.poster} title={it.title} size="w185" />
          </div>
          <div className="body">
            <div className="titlebox">
              <h2>{d?.title ?? it.title}</h2>
              <div className="facts" style={{ marginTop: 4 }}>
                {(d?.yearRange ?? it.year) && <span>{d?.yearRange ?? it.year}</span>}
                {it.type === 'tv' && <span className="dot">Serie</span>}
                {d?.runtime ? <span className="dot">{fmtRuntime(d.runtime, it.type)}</span> : null}
                <span className="dot">
                  <RatingBadge type={it.type} id={it.id} imdbId={d?.imdbId} tmdbScore={it.tmdbScore} lazy={false} />
                </span>
              </div>
            </div>
            {cand.reasons[0] && (
              <div className="reason">
                <Icon name="sparkles" size={14} />
                <span>{cand.reasons[0].text}</span>
              </div>
            )}
            {genres.length > 0 && (
              <div className="genre-tags" style={{ marginTop: 10 }}>
                {genres.map((g) => (
                  <span key={g}>{g}</span>
                ))}
              </div>
            )}
            {overview ? (
              <p className="overview clamp-5" style={{ marginTop: 12, fontSize: 14.5 }}>
                {overview}
              </p>
            ) : det.loading ? (
              <div className="skel" style={{ height: 60, marginTop: 12 }} />
            ) : null}
            {d && (d.directors.length > 0 || d.cast.length > 0) && (
              <div className="small" style={{ marginTop: 12, display: 'grid', gap: 4 }}>
                {d.directors.length > 0 && (
                  <div className="ellipsis">
                    <span className="muted">{d.directorLabel}: </span>
                    <b>{d.directors.map((p) => p.name).join(', ')}</b>
                  </div>
                )}
                {d.cast.length > 0 && (
                  <div className="clamp-2">
                    <span className="muted">Con: </span>
                    {d.cast
                      .slice(0, 4)
                      .map((p) => p.name)
                      .join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </article>
      </div>

      <div className="deck-bar">
        <div className="deck-actions">
          <div className="deck-act">
            <button className="round no" aria-label="No me interesa" onClick={skip}>
              <Icon name="x" size={28} stroke={2.6} />
            </button>
            Paso
          </div>
          <div className="deck-act">
            <button className="round seen" aria-label="Ya la vi" onClick={() => openRate(target)}>
              <Icon name="eye" size={24} />
            </button>
            Ya la vi
          </div>
          <div className="deck-act">
            <button className="round want" aria-label="Quiero verla" onClick={want}>
              <Icon name="bookmark" size={26} />
            </button>
            Quiero verla
          </div>
          <div className="deck-act">
            <button className="round later" aria-label="Ahora no" onClick={later}>
              <Icon name="later" size={20} />
            </button>
            Ahora no
          </div>
        </div>
      </div>
    </>
  );
}

export function fmtRuntime(min: number, type: MediaType) {
  if (type === 'tv') return `${min} min/ep.`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h} h ${m ? m + ' min' : ''}`.trim() : `${m} min`;
}
