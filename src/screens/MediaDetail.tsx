import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { getDetails, img, snapshotFromDetails, type Provider } from '../lib/tmdb';
import { useAsync } from '../lib/useAsync';
import { useStore } from '../lib/store';
import { keyOf, type MediaType } from '../lib/types';
import { Poster, Avatar } from '../components/Poster';
import { RatingBadge } from '../components/RatingBadge';
import { StatusButtons } from '../components/StatusButtons';
import { PersonCard, FavButton } from '../components/People';
import { MediaStrip } from '../components/MediaCard';
import { ErrorBox, Spinner } from '../components/Misc';
import { Icon } from '../components/Icon';
import { fmtRuntime } from './ForYou';

const COUNTRY: Record<string, string> = { AR: 'Argentina', MX: 'México', CL: 'Chile', CO: 'Colombia', PE: 'Perú', UY: 'Uruguay', PY: 'Paraguay', BO: 'Bolivia', EC: 'Ecuador', VE: 'Venezuela', CR: 'Costa Rica', GT: 'Guatemala', PA: 'Panamá', DO: 'Rep. Dominicana', US: 'EE. UU.', ES: 'España' };

export function MediaDetail() {
  const { type, id } = useParams();
  const t = (type === 'tv' ? 'tv' : 'movie') as MediaType;
  const nid = Number(id);
  const navigate = useNavigate();
  const region = useStore((s) => s.settings.region);
  const det = useAsync(() => getDetails(t, nid), [t, nid, region]);
  const k = keyOf(t, nid);
  const hasEntry = useStore((s) => !!s.entries[k]);
  const updateSnap = useStore((s) => s.updateSnap);


  // Si ya estaba en tus listas, refrescamos lo guardado (reparto, dirección) con la ficha completa.
  useEffect(() => {
    if (det.data && hasEntry) {
      const e = useStore.getState().entries[k];
      if (!e.snap.cast || !e.snap.directors || !e.snap.imdbId) updateSnap(k, snapshotFromDetails(det.data));
    }
  }, [det.data, hasEntry, k, updateSnap]);

  const back = (
    <div className="hero-bar">
      <button className="icon-btn glass" aria-label="Volver" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))}>
        <Icon name="back" />
      </button>
    </div>
  );

  if (det.error)
    return (
      <div style={{ paddingTop: 70 }}>
        {back}
        <ErrorBox error={det.error} onRetry={det.reload} />
      </div>
    );
  if (!det.data)
    return (
      <div style={{ paddingTop: 70 }}>
        {back}
        <Spinner />
      </div>
    );

  const d = det.data;
  const s = d.summary;
  const backdrop = img(s.backdrop, 'w780');
  const prov = d.providers;
  const hasProv = prov && (prov.flatrate?.length || prov.rent?.length || prov.buy?.length || prov.free?.length || prov.ads?.length);

  return (
    <div>
      <div className="hero">
        {backdrop ? <img className="backdrop" src={backdrop} alt="" /> : <div className="backdrop empty" />}
        {back}
      </div>
      <div className="head">
        <Poster path={s.poster} title={d.title} size="w342" />
        <div className="grow" style={{ paddingBottom: 4 }}>
          <h1>{d.title}</h1>
          {s.originalTitle && s.originalTitle !== d.title && <div className="orig">{s.originalTitle}</div>}
          <div className="facts">
            <span>{d.yearRange ?? s.year ?? 'Sin fecha'}</span>
            {t === 'tv' && <span className="dot">Serie</span>}
            {d.runtime ? <span className="dot">{fmtRuntime(d.runtime, t)}</span> : null}
            {d.certification && (
              <span className="dot">
                <span className="cert">{d.certification}</span>
              </span>
            )}
          </div>
          {t === 'tv' && d.seasons ? (
            <div className="facts">
              {d.seasons} temporada{d.seasons > 1 ? 's' : ''}
              {d.episodes ? <span className="dot">{d.episodes} episodios</span> : null}
            </div>
          ) : null}
          <div style={{ marginTop: 8 }}>
            <RatingBadge type={t} id={nid} imdbId={d.imdbId} tmdbScore={s.tmdbScore} big lazy={false} />
          </div>
        </div>
      </div>

      <div className="page">
        <div className="section" style={{ marginTop: 18 }}>
          <StatusButtons target={d} />
        </div>

        <div className="genre-tags">
          {d.genres.map((g) => (
            <span key={g.id}>{g.name}</span>
          ))}
        </div>

        <section className="section">
          <h2 className="section-title">Sinopsis</h2>
          {d.tagline && <p className="tagline">{d.tagline}</p>}
          {d.overview ? (
            <p className="overview">{d.overview}</p>
          ) : (
            <p className="muted">Todavía no hay sinopsis en español para este título.</p>
          )}
          {d.overviewLang === 'en' && <p className="faint small" style={{ marginTop: 6 }}>Sinopsis en inglés: no hay versión en español.</p>}
        </section>

        {d.trailer && (
          <a className="btn block" style={{ marginTop: 16 }} href={`https://www.youtube.com/watch?v=${d.trailer.key}`} target="_blank" rel="noreferrer">
            <Icon name="play" fill size={18} /> Ver tráiler
          </a>
        )}

        {d.directors.length > 0 && (
          <section className="section">
            <h2 className="section-title">{d.directorLabel}</h2>
            {d.directors.map((p) => (
              <Link key={p.id} to={`/p/${p.id}`} className="director">
                <Avatar path={p.profile} name={p.name} />
                <div className="grow">
                  <div style={{ fontWeight: 700 }}>{p.name}</div>
                  <div className="muted small">{t === 'tv' ? 'Creación' : 'Dirección'}</div>
                </div>
                <FavButton kind="director" p={p} iconOnly />
              </Link>
            ))}
          </section>
        )}

        {d.cast.length > 0 && (
          <section className="section">
            <h2 className="section-title">Reparto</h2>
            <div className="people">
              {d.cast.map((p) => (
                <PersonCard key={p.id} p={p} sub={p.character} />
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <h2 className="section-title">
            Dónde verla <small>en {COUNTRY[region] ?? region}</small>
          </h2>
          {hasProv ? (
            <div className="card providers">
              <ProvRow label="Incluida en" list={[...(prov!.flatrate ?? []), ...(prov!.free ?? []), ...(prov!.ads ?? [])]} />
              <ProvRow label="Alquiler" list={prov!.rent} />
              <ProvRow label="Compra" list={prov!.buy} />
              {prov!.link && (
                <a className="link small" href={prov!.link} target="_blank" rel="noreferrer">
                  Ver opciones y precios <Icon name="external" size={13} />
                </a>
              )}
              <div className="faint small">Datos de disponibilidad: JustWatch.</div>
            </div>
          ) : (
            <p className="muted">No figura en plataformas de streaming {t === 'movie' ? 'por ahora (puede estar solo en cines).' : 'por ahora.'}</p>
          )}
        </section>

        {d.recommendations.length > 0 && (
          <section className="section">
            <h2 className="section-title">Si te gusta esta</h2>
            <MediaStrip items={d.recommendations} />
          </section>
        )}
        <div style={{ height: 20 }} />
      </div>
    </div>
  );
}

function ProvRow({ label, list }: { label: string; list?: Provider[] }) {
  const uniq = (list ?? []).filter((p, i, a) => a.findIndex((x) => x.provider_id === p.provider_id) === i);
  if (!uniq.length) return null;
  return (
    <div className="prov-row">
      <div className="lbl">{label}</div>
      <div className="prov-logos">
        {uniq.map((p) => (
          <img key={p.provider_id} src={img(p.logo_path, 'w92')} alt={p.provider_name} title={p.provider_name} loading="lazy" />
        ))}
      </div>
    </div>
  );
}
