import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { list } from '../lib/tmdb';
import { useAsync } from '../lib/useAsync';
import { useStore } from '../lib/store';
import { useGenreMap } from '../lib/useGenres';
import { useSheets } from '../lib/sheets';
import { keyOf, type MediaSummary } from '../lib/types';
import { TopBar, SettingsButton } from '../components/Bars';
import { Poster } from '../components/Poster';
import { RatingBadge } from '../components/RatingBadge';
import { StatusBadge } from '../components/MediaCard';
import { Empty, ErrorBox, Segmented, Spinner } from '../components/Misc';
import { Icon } from '../components/Icon';

type Tab = 'now' | 'soon';

const fmt = (d?: string) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', month: 'short' }) : '');

async function fetchPages(path: string, region: string, pages: number) {
  const rs = await Promise.all(Array.from({ length: pages }, (_, i) => list(path, { region, page: i + 1 }, 'movie').catch(() => null)));
  const first = rs.find(Boolean);
  if (!first) throw new Error('No pudimos cargar la cartelera.');
  const seen = new Set<number>();
  return rs.flatMap((r) => r?.items ?? []).filter((i) => (seen.has(i.id) ? false : (seen.add(i.id), true)));
}

export function Theaters() {
  const region = useStore((s) => s.settings.region);
  const [tab, setTab] = useState<Tab>('now');
  const genreMap = useGenreMap();
  const now = useAsync(() => fetchPages('/movie/now_playing', region, 3), [region], tab === 'now');
  const soon = useAsync(() => fetchPages('/movie/upcoming', region, 3), [region], tab === 'soon');
  const cur = tab === 'now' ? now : soon;

  const items = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const all = cur.data ?? [];
    if (tab === 'soon') return all.filter((i) => (i.date ?? '') > today).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
    return all.sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0));
  }, [cur.data, tab]);

  return (
    <>
      <TopBar title="Cartelera" right={<SettingsButton />} />
      <div className="page">
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'now', label: 'En cines' },
            { value: 'soon', label: 'Próximos estrenos' },
          ]}
        />
        <div className="section" style={{ marginTop: 10 }}>
          {cur.loading && !cur.data ? (
            <Spinner />
          ) : cur.error ? (
            <ErrorBox error={cur.error} onRetry={cur.reload} />
          ) : items.length === 0 ? (
            <Empty icon="ticket" title="No hay datos de cartelera para tu país" />
          ) : (
            items.map((it) => <TheaterRow key={it.id} it={it} genreMap={genreMap} soon={tab === 'soon'} />)
          )}
        </div>
        <p className="faint small center" style={{ marginTop: 14 }}>
          Fechas de estreno según TMDB. No incluye horarios de funciones.
        </p>
      </div>
    </>
  );
}

function TheaterRow({ it, genreMap, soon }: { it: MediaSummary; genreMap: Map<number, string>; soon: boolean }) {
  const openActions = useSheets((s) => s.openActions);
  const g = it.genreIds
    .map((x) => genreMap.get(x))
    .filter(Boolean)
    .slice(0, 2)
    .join(', ');
  return (
    <div className="mrow">
      <Link to={`/t/movie/${it.id}`}>
        <Poster path={it.poster} title={it.title} size="w154">
          <StatusBadge k={keyOf('movie', it.id)} />
        </Poster>
      </Link>
      <Link to={`/t/movie/${it.id}`} className="info">
        <div className="t clamp-2">{it.title}</div>
        <div className="sub">
          {soon ? (
            <span style={{ color: 'var(--gold)', fontWeight: 650 }}>
              <Icon name="calendar" size={12} /> Estrena {fmt(it.date)}
            </span>
          ) : (
            <span>{it.year}</span>
          )}
          {g && <span className="dot">{g}</span>}
        </div>
        <div className="sub" style={{ marginTop: 4 }}>
          <RatingBadge type="movie" id={it.id} tmdbScore={(it.votes ?? 0) > 30 ? it.tmdbScore : undefined} />
        </div>
      </Link>
      <button className="icon-btn" aria-label="Opciones" onClick={() => openActions(it)}>
        <Icon name="plus" size={20} />
      </button>
    </div>
  );
}
