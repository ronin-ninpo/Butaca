import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getPerson, getPersonBioEn, toSummaries, type RawItem } from '../lib/tmdb';
import { useAsync } from '../lib/useAsync';
import { useStore } from '../lib/store';
import { statFor } from '../lib/favorites';
import { keyOf, type MediaSummary } from '../lib/types';
import { TopBar } from '../components/Bars';
import { Avatar } from '../components/Poster';
import { FavButton } from '../components/People';
import { MediaGrid } from '../components/MediaCard';
import { ErrorBox, Segmented, Spinner } from '../components/Misc';
import { Stars } from '../components/Stars';
import { fmtAvg, roundHalf } from '../lib/rating';

const NON_FICTION = new Set([10763, 10764, 10767, 99]);

function age(birth: string, death?: string | null) {
  const b = new Date(birth);
  const e = death ? new Date(death) : new Date();
  let a = e.getFullYear() - b.getFullYear();
  if (e.getMonth() < b.getMonth() || (e.getMonth() === b.getMonth() && e.getDate() < b.getDate())) a--;
  return a;
}

const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

function credits(list: RawItem[], includeTv: boolean) {
  const seen = new Set<string>();
  const out: MediaSummary[] = [];
  for (const s of toSummaries(list)) {
    if (!includeTv && s.type === 'tv') continue;
    if (s.genreIds.some((g) => NON_FICTION.has(g)) && s.type === 'tv') continue;
    const k = keyOf(s.type, s.id);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(s);
  }
  return out;
}

export function PersonDetail() {
  const { id } = useParams();
  const pid = Number(id);
  const includeTv = useStore((s) => s.settings.includeTv);
  const entries = useStore((s) => s.entries);
  const p = useAsync(() => getPerson(pid), [pid]);
  const bioEn = useAsync(() => getPersonBioEn(pid), [pid], !!p.data && !p.data.biography);
  const [tab, setTab] = useState<'acting' | 'directing'>('acting');
  const [order, setOrder] = useState<'popular' | 'recent' | 'rating'>('popular');
  const [bioOpen, setBioOpen] = useState(false);


  const data = p.data;
  const acting = useMemo(() => (data ? credits(data.combined_credits?.cast ?? [], includeTv) : []), [data, includeTv]);
  const directing = useMemo(
    () => (data ? credits((data.combined_credits?.crew ?? []).filter((c) => c.job === 'Director' || c.job === 'Creator'), includeTv) : []),
    [data, includeTv],
  );

  useEffect(() => {
    if (data) setTab(data.known_for_department === 'Directing' && directing.length ? 'directing' : acting.length ? 'acting' : 'directing');
  }, [data, acting.length, directing.length]);

  if (p.error) return (<><TopBar title="" back /><ErrorBox error={p.error} onRetry={p.reload} /></>);
  if (!data) return (<><TopBar title="" back /><Spinner /></>);

  const ref = { id: data.id, name: data.name, profile: data.profile_path };
  const g = data.gender;
  const actLabel = g === 1 ? 'Actriz favorita' : g === 2 ? 'Actor favorito' : 'Favorito/a en actuación';
  const dirLabel = g === 1 ? 'Directora favorita' : g === 2 ? 'Director favorito' : 'Favorito/a en dirección';
  const list = tab === 'acting' ? acting : directing;
  const sorted = [...list].sort((a, b) =>
    order === 'recent' ? (b.date ?? '').localeCompare(a.date ?? '') : order === 'rating' ? (b.votes! > 200 ? b.tmdbScore ?? 0 : 0) - (a.votes! > 200 ? a.tmdbScore ?? 0 : 0) : (b.votes ?? 0) - (a.votes ?? 0),
  );
  const statA = statFor(entries, 'actor', pid);
  const statD = statFor(entries, 'director', pid);
  const stat = tab === 'directing' ? statD ?? statA : statA ?? statD;
  const bio = data.biography || bioEn.data || '';

  return (
    <>
      <TopBar title={data.name} back />
      <div className="page">
        <div className="row" style={{ gap: 16, alignItems: 'flex-start', marginTop: 4 }}>
          <Avatar path={data.profile_path} name={data.name} className="" />
          <div className="grow">
            <div className="muted small">{data.known_for_department === 'Directing' ? 'Dirección' : data.known_for_department === 'Acting' ? 'Actuación' : data.known_for_department}</div>
            {data.birthday && (
              <div className="small" style={{ marginTop: 4 }}>
                {data.deathday ? `${fmtDate(data.birthday)} – ${fmtDate(data.deathday)} (${age(data.birthday, data.deathday)} años)` : `${fmtDate(data.birthday)} (${age(data.birthday)} años)`}
              </div>
            )}
            {data.place_of_birth && <div className="small muted">{data.place_of_birth}</div>}
          </div>
        </div>

        <div className="row wrap" style={{ marginTop: 14 }}>
          {acting.length > 0 && <FavButton kind="actor" p={ref} label={actLabel} />}
          {directing.length > 0 && <FavButton kind="director" p={ref} label={dirLabel} />}
        </div>

        {stat && (
          <div className="card row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
            <span className="small">
              Viste <b>{stat.seen}</b> {stat.seen === 1 ? 'título' : 'títulos'}
              {stat.avg ? ' · tu promedio' : ''}
            </span>
            {stat.avg ? (
              <span className="row small" style={{ gap: 6 }}>
                <Stars value={roundHalf(stat.avg)} size={15} /> <b>{fmtAvg(stat.avg)}</b>
              </span>
            ) : null}
          </div>
        )}

        {bio && (
          <section className="section">
            <h2 className="section-title">Biografía {!data.biography && <small>(en inglés)</small>}</h2>
            <p className={`overview ${bioOpen ? '' : 'clamp-5'}`} style={{ fontSize: 14.5 }}>
              {bio}
            </p>
            {bio.length > 320 && (
              <button className="link small" style={{ marginTop: 6 }} onClick={() => setBioOpen((o) => !o)}>
                {bioOpen ? 'Ver menos' : 'Leer más'}
              </button>
            )}
          </section>
        )}

        <section className="section">
          <h2 className="section-title">Filmografía</h2>
          {acting.length > 0 && directing.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <Segmented
                value={tab}
                onChange={setTab}
                options={[
                  { value: 'acting', label: `Actuación (${acting.length})` },
                  { value: 'directing', label: `Dirección (${directing.length})` },
                ]}
              />
            </div>
          )}
          <div className="chips" style={{ marginBottom: 12 }}>
            {(
              [
                ['popular', 'Más conocidas'],
                ['recent', 'Más recientes'],
                ['rating', 'Mejor puntuadas'],
              ] as const
            ).map(([v, l]) => (
              <button key={v} className={`chip ${order === v ? 'on' : ''}`} onClick={() => setOrder(v)}>
                {l}
              </button>
            ))}
          </div>
          <MediaGrid items={sorted.slice(0, 60)} showType />
        </section>
      </div>
    </>
  );
}
