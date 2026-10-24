import { useEffect, useMemo, useState } from 'react';
import { discover, getProviders, img, searchMulti, type DiscoverFilters } from '../lib/tmdb';
import { useAsync } from '../lib/useAsync';
import { useStore } from '../lib/store';
import { useGenres } from '../lib/useGenres';
import { keyOf, type MediaSummary, type MediaType } from '../lib/types';
import { TopBar, SettingsButton } from '../components/Bars';
import { MediaGrid } from '../components/MediaCard';
import { PersonCard } from '../components/People';
import { Empty, ErrorBox, Segmented, SkeletonGrid, Spinner } from '../components/Misc';
import { Icon } from '../components/Icon';

const PREF = 'butaca.explore';
const defaults: DiscoverFilters = { type: 'movie', genres: [], genreMode: 'any', sort: 'popularity', providers: [] };

function load(): DiscoverFilters {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(PREF) ?? '{}') };
  } catch {
    return defaults;
  }
}

const DECADES: { label: string; from?: number; to?: number }[] = [
  { label: 'Cualquier año' },
  { label: 'Últimos 2 años', from: new Date().getFullYear() - 1 },
  { label: '2020s', from: 2020, to: 2029 },
  { label: '2010s', from: 2010, to: 2019 },
  { label: '2000s', from: 2000, to: 2009 },
  { label: '90s', from: 1990, to: 1999 },
  { label: '80s', from: 1980, to: 1989 },
  { label: '70s', from: 1970, to: 1979 },
  { label: 'Antes de 1970', to: 1969 },
];

function useDebounced<T>(v: T, ms: number) {
  const [d, setD] = useState(v);
  useEffect(() => {
    const t = setTimeout(() => setD(v), ms);
    return () => clearTimeout(t);
  }, [v, ms]);
  return d;
}

export function Explore() {
  const includeTv = useStore((s) => s.settings.includeTv);
  const region = useStore((s) => s.settings.region);
  const [f, setF] = useState<DiscoverFilters>(load);
  const [q, setQ] = useState('');
  const query = useDebounced(q.trim(), 400);
  const [panel, setPanel] = useState(false);
  const [pages, setPages] = useState<MediaSummary[][]>([]);
  const [page, setPage] = useState(1);
  const [more, setMore] = useState(false);
  const type: MediaType = includeTv ? f.type : 'movie';
  const filters = { ...f, type };
  const genres = useGenres(type);
  const providers = useAsync(() => getProviders(type), [type, region], panel || f.providers.length > 0);

  useEffect(() => {
    try {
      localStorage.setItem(PREF, JSON.stringify(f));
    } catch {
      /* ok */
    }
  }, [f]);

  const fkey = JSON.stringify(filters) + region;
  const first = useAsync(() => discover(filters, 1), [fkey], !query);
  const search = useAsync(() => searchMulti(query), [query], !!query);

  useEffect(() => {
    setPages([]);
    setPage(1);
  }, [fkey]);

  const loadMore = async () => {
    setMore(true);
    try {
      const r = await discover(filters, page + 1);
      setPages((p) => [...p, r.items]);
      setPage((x) => x + 1);
    } finally {
      setMore(false);
    }
  };

  const items = useMemo(() => {
    const all = [...(first.data?.items ?? []), ...pages.flat()];
    const seen = new Set<string>();
    return all.filter((i) => {
      const k = keyOf(i.type, i.id);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
  }, [first.data, pages]);

  const set = (patch: Partial<DiscoverFilters>) => setF((cur) => ({ ...cur, ...patch }));
  const toggle = (arr: number[], v: number) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  const activeCount = (f.yearFrom || f.yearTo ? 1 : 0) + (f.minScore ? 1 : 0) + f.providers.length + (f.sort !== 'popularity' ? 1 : 0);
  const decadeIdx = Math.max(0, DECADES.findIndex((d) => d.from === f.yearFrom && d.to === f.yearTo));

  const media = search.data?.media.filter((m) => includeTv || m.type === 'movie') ?? [];
  const people = (search.data?.people ?? []).sort((a, b) => b.popularity - a.popularity).slice(0, 12);

  return (
    <>
      <TopBar title="Explorar" right={<SettingsButton />} />
      <div className="page">
        <div className="search">
          <Icon name="search" size={19} />
          <input className="input" type="search" placeholder="Buscar películas, series, actores…" value={q} onChange={(e) => setQ(e.target.value)} enterKeyHint="search" aria-label="Buscar" />
          {q && (
            <button className="clear" aria-label="Borrar búsqueda" onClick={() => setQ('')}>
              <Icon name="x" size={18} />
            </button>
          )}
        </div>

        {query ? (
          <div className="section" style={{ marginTop: 16 }}>
            {search.loading && !search.data ? (
              <Spinner />
            ) : search.error ? (
              <ErrorBox error={search.error} onRetry={search.reload} />
            ) : media.length === 0 && people.length === 0 ? (
              <Empty icon="search" title="Sin resultados">
                <p>Probá con otro título o con el nombre original.</p>
              </Empty>
            ) : (
              <>
                {people.length > 0 && (
                  <>
                    <h2 className="section-title">Personas</h2>
                    <div className="people" style={{ marginBottom: 18 }}>
                      {people.map((p) => (
                        <PersonCard key={p.id} p={p} sub={p.dept === 'Directing' ? 'Dirección' : p.dept === 'Acting' ? 'Actuación' : p.dept} />
                      ))}
                    </div>
                  </>
                )}
                {media.length > 0 && (
                  <>
                    <h2 className="section-title">Títulos</h2>
                    <MediaGrid items={media} showType={includeTv} />
                  </>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            <div className="row" style={{ marginTop: 12 }}>
              {includeTv && (
                <div className="grow">
                  <Segmented<MediaType>
                    value={type}
                    onChange={(v) => setF({ ...f, type: v, genres: [], providers: [] })}
                    options={[
                      { value: 'movie', label: 'Películas' },
                      { value: 'tv', label: 'Series' },
                    ]}
                  />
                </div>
              )}
              <button className={`chip ${panel || activeCount ? 'on' : ''}`} style={{ height: 40 }} onClick={() => setPanel((p) => !p)} aria-expanded={panel}>
                <Icon name="sliders" size={16} /> Filtros {activeCount > 0 && <span className="count">{activeCount}</span>}
              </button>
            </div>

            <div className="chips" style={{ marginTop: 10 }}>
              <button className={`chip ${f.genres.length === 0 ? 'on' : ''}`} onClick={() => set({ genres: [] })}>
                Todos
              </button>
              {(genres.data ?? [])
                .filter((g) => ![10770, 10763, 10764, 10767].includes(g.id))
                .map((g) => (
                  <button key={g.id} className={`chip ${f.genres.includes(g.id) ? 'on' : ''}`} onClick={() => set({ genres: toggle(f.genres, g.id) })}>
                    {g.name}
                  </button>
                ))}
            </div>

            {panel && (
              <div className="panel">
                {f.genres.length > 1 && (
                  <div className="field">
                    <label>Con varios géneros elegidos, mostrar las que tengan</label>
                    <Segmented
                      value={f.genreMode}
                      onChange={(v) => set({ genreMode: v })}
                      options={[
                        { value: 'any', label: 'Alguno' },
                        { value: 'all', label: 'Todos a la vez' },
                      ]}
                    />
                  </div>
                )}
                <div className="field">
                  <label htmlFor="ord">Ordenar por</label>
                  <select id="ord" className="input" value={f.sort} onChange={(e) => set({ sort: e.target.value as DiscoverFilters['sort'] })}>
                    <option value="popularity">Más populares ahora</option>
                    <option value="rating">Mejor puntuadas</option>
                    <option value="votes">Más vistas de todos los tiempos</option>
                    <option value="newest">Más nuevas</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="dec">Época</label>
                  <select id="dec" className="input" value={decadeIdx} onChange={(e) => set({ yearFrom: DECADES[+e.target.value].from, yearTo: DECADES[+e.target.value].to })}>
                    {DECADES.map((d, i) => (
                      <option key={d.label} value={i}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label>Puntaje mínimo (TMDB)</label>
                  <div className="chips">
                    {[0, 6, 7, 7.5, 8].map((v) => (
                      <button key={v} className={`chip ${(f.minScore ?? 0) === v ? 'on' : ''}`} onClick={() => set({ minScore: v || undefined })}>
                        {v ? `${v}+` : 'Cualquiera'}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label>Disponible en</label>
                  {providers.loading ? (
                    <Spinner />
                  ) : (
                    <div className="chips" style={{ flexWrap: 'wrap', overflow: 'visible', margin: 0, padding: 0 }}>
                      {(providers.data ?? []).slice(0, 16).map((p) => (
                        <button key={p.provider_id} className={`chip ${f.providers.includes(p.provider_id) ? 'on' : ''}`} onClick={() => set({ providers: toggle(f.providers, p.provider_id) })}>
                          <img src={img(p.logo_path, 'w92')} alt="" />
                          {p.provider_name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
                  <button className="btn small outline" onClick={() => setF({ ...defaults, type: f.type })}>
                    Limpiar filtros
                  </button>
                  <button className="btn small primary" onClick={() => setPanel(false)}>
                    Listo
                  </button>
                </div>
              </div>
            )}

            <div className="section" style={{ marginTop: 16 }}>
              {first.loading && !first.data ? (
                <SkeletonGrid />
              ) : first.error ? (
                <ErrorBox error={first.error} onRetry={first.reload} />
              ) : items.length === 0 ? (
                <Empty icon="search" title="No encontramos títulos con esos filtros">
                  <p>Probá sacando alguno.</p>
                </Empty>
              ) : (
                <>
                  <p className="faint small" style={{ marginBottom: 10 }}>
                    {first.data!.total_results.toLocaleString('es-AR')} resultados
                  </p>
                  <MediaGrid items={items} />
                  {page < (first.data?.total_pages ?? 1) && (
                    <button className="btn block" style={{ marginTop: 18 }} onClick={loadMore} disabled={more}>
                      {more ? 'Cargando…' : 'Cargar más'}
                    </button>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
