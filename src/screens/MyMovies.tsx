import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { restrictToParentElement, restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../lib/store';
import { useGenreMap } from '../lib/useGenres';
import { useSheets, summaryFromSnap } from '../lib/sheets';
import { unmark } from '../lib/actions';
import type { Entry, MediaType } from '../lib/types';
import { TopBar, SettingsButton } from '../components/Bars';
import { Poster } from '../components/Poster';
import { RatingBadge } from '../components/RatingBadge';
import { Stars } from '../components/Stars';
import { Empty, Segmented } from '../components/Misc';
import { Icon } from '../components/Icon';
import { Desire } from '../components/Desire';
import { GROUP_ORDER, fmtAvg, fmtRating, groupOf, groupRank } from '../lib/rating';

type Tab = 'vistas' | 'quiero' | 'descartadas';
type SeenSort = 'fav' | 'recent' | 'year' | 'imdb' | 'title';
type TypeF = 'all' | MediaType;

const imdbNum = (e: Entry) => (e.snap.imdbRating ? parseFloat(e.snap.imdbRating) : -1);

/** Vistas ordenadas como "mis favoritas": leyendas, después por estrellas y, dentro de cada grupo, por el orden manual. */
export function favoritesOrder(entries: Record<string, Entry>, order: string[]) {
  const pos = new Map(order.map((k, i) => [k, i]));
  return Object.values(entries)
    .filter((e) => e.status === 'seen')
    .sort((a, b) => groupRank(b) - groupRank(a) || (pos.get(a.key) ?? 1e9) - (pos.get(b.key) ?? 1e9) || (b.seenAt ?? 0) - (a.seenAt ?? 0));
}

export function MyMovies() {
  const { tab: tabParam } = useParams();
  const tab: Tab = tabParam === 'quiero' || tabParam === 'descartadas' ? tabParam : 'vistas';
  const navigate = useNavigate();
  const entries = useStore((s) => s.entries);
  const counts = useMemo(() => {
    const c = { seen: 0, want: 0, skip: 0 };
    for (const e of Object.values(entries)) c[e.status]++;
    return c;
  }, [entries]);

  return (
    <>
      <TopBar title="Mis pelis" right={<SettingsButton />} />
      <div className="page">
        <Segmented<Tab>
          value={tab}
          onChange={(t) => navigate(t === 'vistas' ? '/mis' : `/mis/${t}`, { replace: true })}
          options={[
            { value: 'vistas', label: `Vistas ${counts.seen || ''}` },
            { value: 'quiero', label: `Quiero ver ${counts.want || ''}` },
            { value: 'descartadas', label: 'Descartadas' },
          ]}
        />
        {tab === 'vistas' ? <Seen /> : tab === 'quiero' ? <Want /> : <Skipped />}
      </div>
    </>
  );
}

function Filters({
  typeF,
  setTypeF,
  genreF,
  setGenreF,
  list,
  toggles = [],
}: {
  typeF: TypeF;
  setTypeF: (t: TypeF) => void;
  genreF: number | null;
  setGenreF: (g: number | null) => void;
  list: Entry[];
  toggles?: { id: string; label: string; icon: string; count: number; on: boolean; onToggle: () => void }[];
}) {
  const includeTv = useStore((s) => s.settings.includeTv);
  const genreMap = useGenreMap();
  const hasTv = list.some((e) => e.snap.type === 'tv');
  const genreCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const e of list) for (const g of e.snap.genreIds) m.set(g, (m.get(g) ?? 0) + 1);
    return [...m.entries()].filter(([g]) => genreMap.has(g)).sort((a, b) => b[1] - a[1]);
  }, [list, genreMap]);
  const shown = toggles.filter((t) => t.count > 0 || t.on);
  if (list.length < 2 && !shown.length) return null;
  return (
    <div className="chips" style={{ marginTop: 10 }}>
      {shown.length > 0 && (
        <>
          {shown.map((t) => (
            <button key={t.id} className={`chip ${t.on ? 'on' : ''}`} aria-pressed={t.on} onClick={t.onToggle}>
              <Icon name={t.icon} size={15} /> {t.label} <span className="faint">{t.count}</span>
            </button>
          ))}
          <span style={{ width: 1, background: 'var(--line)', flex: 'none' }} />
        </>
      )}
      {includeTv && hasTv && (
        <>
          {(['all', 'movie', 'tv'] as TypeF[]).map((t) => (
            <button key={t} className={`chip ${typeF === t ? 'on' : ''}`} onClick={() => setTypeF(t)}>
              {t === 'all' ? 'Todo' : t === 'movie' ? 'Películas' : 'Series'}
            </button>
          ))}
          <span style={{ width: 1, background: 'var(--line)', flex: 'none' }} />
        </>
      )}
      <button className={`chip ${genreF === null ? 'on' : ''}`} onClick={() => setGenreF(null)}>
        Todos los géneros
      </button>
      {genreCounts.map(([g, n]) => (
        <button key={g} className={`chip ${genreF === g ? 'on' : ''}`} onClick={() => setGenreF(genreF === g ? null : g)}>
          {genreMap.get(g)} <span className="faint">{n}</span>
        </button>
      ))}
    </div>
  );
}

function Seen() {
  const entries = useStore((s) => s.entries);
  const order = useStore((s) => s.order);
  const setOrder = useStore((s) => s.setOrder);
  const [sort, setSort] = useState<SeenSort>('fav');
  const [typeF, setTypeF] = useState<TypeF>('all');
  const [genreF, setGenreF] = useState<number | null>(null);
  const [classicF, setClassicF] = useState(false);
  const [rewatchF, setRewatchF] = useState(false);
  const [withF, setWithF] = useState<string | null>(null);

  const favs = useMemo(() => favoritesOrder(entries, order), [entries, order]);
  const rank = useMemo(() => new Map(favs.filter((e) => e.rating || e.legend).map((e, i) => [e.key, i + 1])), [favs]);
  const filtered = favs.filter(
    (e) =>
      (typeF === 'all' || e.snap.type === typeF) &&
      (genreF === null || e.snap.genreIds.includes(genreF)) &&
      (!classicF || e.classic) &&
      (!rewatchF || (e.rewatch && matchesWith(e, withF))),
  );
  const filtering = typeF !== 'all' || genreF !== null || classicF || rewatchF;
  const rewatchItems = favs.filter((e) => e.rewatch);
  const sorted =
    sort === 'fav'
      ? filtered
      : [...filtered].sort((a, b) =>
          sort === 'recent'
            ? (b.seenAt ?? 0) - (a.seenAt ?? 0)
            : sort === 'year'
              ? (b.snap.year ?? '').localeCompare(a.snap.year ?? '')
              : sort === 'imdb'
                ? imdbNum(b) - imdbNum(a)
                : a.snap.title.localeCompare(b.snap.title, 'es'),
        );

  const avg = favs.filter((e) => e.rating).reduce((s, e, _, arr) => s + e.rating! / arr.length, 0);

  if (favs.length === 0)
    return (
      <Empty icon="eye" title="Todavía no marcaste películas vistas">
        <p>Cuando marques «Ya la vi» aparecen acá, y podés ordenarlas como tu ranking personal.</p>
        <Link className="btn primary" style={{ marginTop: 14 }} to="/">
          Calificar recomendaciones
        </Link>
      </Empty>
    );

  const groups: { id: string; items: Entry[] }[] = [];
  if (sort === 'fav') {
    for (const id of GROUP_ORDER) {
      const items = sorted.filter((e) => groupOf(e) === id);
      if (items.length) groups.push({ id, items });
    }
  }

  const onGroupReorder = (id: string, newKeys: string[]) => {
    // Reemplazamos ese grupo dentro del orden completo y mantenemos los demás igual.
    const full = favoritesOrder(useStore.getState().entries, useStore.getState().order);
    const byGroup = new Map<string, string[]>();
    for (const e of full) {
      const g = groupOf(e);
      byGroup.set(g, [...(byGroup.get(g) ?? []), e.key]);
    }
    byGroup.set(id, newKeys);
    setOrder(GROUP_ORDER.flatMap((g) => byGroup.get(g) ?? []));
  };

  return (
    <>
      <div className="row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
        <span className="muted small ellipsis grow">
          {favs.length} vistas{avg ? ` · ★ ${fmtAvg(avg)}` : ''}
        </span>
        <label className="row small muted" style={{ gap: 6 }}>
          <Icon name="sort" size={15} />
          <select className="input" style={{ height: 34, width: 'auto', fontSize: 14, borderRadius: 999 }} value={sort} onChange={(e) => setSort(e.target.value as SeenSort)} aria-label="Ordenar">
            <option value="fav">Mis favoritas</option>
            <option value="recent">Vistas recientemente</option>
            <option value="imdb">Nota de IMDb</option>
            <option value="year">Año</option>
            <option value="title">Título (A-Z)</option>
          </select>
        </label>
      </div>
      <Filters
        typeF={typeF}
        setTypeF={setTypeF}
        genreF={genreF}
        setGenreF={setGenreF}
        list={favs}
        toggles={[
          { id: 'rewatch', label: 'Para volver a ver', icon: 'repeat', count: rewatchItems.length, on: rewatchF, onToggle: () => (setRewatchF(!rewatchF), setWithF(null)) },
          { id: 'classic', label: 'Clásicos', icon: 'award', count: favs.filter((e) => e.classic).length, on: classicF, onToggle: () => setClassicF(!classicF) },
        ]}
      />
      {rewatchF && <CompanionFilter items={rewatchItems} value={withF} onChange={setWithF} label="Filtrar por con quién volver a verla" />}

      {sort === 'fav' && (
        <p className="faint small" style={{ marginTop: 10 }}>
          {filtering ? 'Quitá los filtros para reordenar.' : 'Arrastrá desde ⠿ para ordenar las que tienen la misma calificación.'}
        </p>
      )}

      {sort === 'fav' ? (
        groups.map((g) => (
          <div key={g.id} className="group" data-group={g.id}>
            <div className={`group-head ${g.id === 'L' ? 'legend' : ''}`}>
              {g.id === 'L' ? (
                <>
                  <Icon name="crown" size={18} fill /> Leyendas
                </>
              ) : g.id !== '0' ? (
                <>
                  <Stars value={Number(g.id)} size={15} /> <span className="small">{fmtRating(Number(g.id))}</span>
                </>
              ) : (
                <span className="muted">Sin calificar</span>
              )}
              <span className="muted">{g.items.length}</span>
            </div>
            <SortableGroup items={g.items} rank={rank} disabled={filtering || g.items.length < 2} onReorder={(keys) => onGroupReorder(g.id, keys)} />
          </div>
        ))
      ) : (
        <div style={{ marginTop: 6 }}>
          {sorted.map((e) => (
            <SeenRow key={e.key} e={e} />
          ))}
        </div>
      )}
    </>
  );
}

function SortableGroup({ items, rank, disabled, onReorder }: { items: Entry[]; rank: Map<string, number>; disabled: boolean; onReorder: (keys: string[]) => void }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));
  const ids = items.map((e) => e.key);
  const onEnd = (ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  };
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onEnd} modifiers={[restrictToVerticalAxis, restrictToParentElement]}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div>
          {items.map((e) => (
            <SortableRow key={e.key} e={e} rankNo={rank.get(e.key)} disabled={disabled} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

function SortableRow({ e, rankNo, disabled }: { e: Entry; rankNo?: number; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: e.key, disabled });
  return (
    <SeenRow
      e={e}
      rankNo={rankNo}
      rowRef={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      dragging={isDragging}
      handle={
        disabled ? undefined : (
          <button ref={setActivatorNodeRef} className="handle" aria-label={`Mover ${e.snap.title}`} {...attributes} {...listeners}>
            <Icon name="grip" size={20} />
          </button>
        )
      }
    />
  );
}

function SeenRow({ e, rankNo, handle, rowRef, style, dragging }: { e: Entry; rankNo?: number; handle?: React.ReactNode; rowRef?: (el: HTMLElement | null) => void; style?: React.CSSProperties; dragging?: boolean }) {
  const openRate = useSheets((s) => s.openRate);
  const openWith = useSheets((s) => s.openWith);
  const s = e.snap;
  return (
    <div className={`mrow ${dragging ? 'dragging' : ''}`} ref={rowRef} style={style}>
      {rankNo !== undefined && <div className={`rank ${rankNo <= 3 ? 'top' : ''}`}>{rankNo}</div>}
      <Link to={`/t/${s.type}/${s.id}`}>
        <Poster path={s.poster} title={s.title} size="w154" />
      </Link>
      <div className="info">
        <Link to={`/t/${s.type}/${s.id}`}>
          <div className="t clamp-2">{s.title}</div>
        </Link>
        <div className="sub">
          {s.year && <span>{s.year}</span>}
          {s.type === 'tv' && <span className="dot">Serie</span>}
          <span className="dot">
            <RatingBadge type={s.type} id={s.id} imdbId={s.imdbId} tmdbScore={s.tmdbScore} />
          </span>
        </div>
        <button style={{ marginTop: 5 }} onClick={() => openRate(summaryFromSnap(s))} aria-label="Cambiar calificación">
          {e.rating || e.legend || e.classic ? (
            <span className="row" style={{ gap: 8 }}>
              {e.legend && <Icon name="crown" size={16} fill className="legend-tag" />}
              {e.rating ? <Stars value={e.rating} size={16} /> : null}
              {e.classic && (
                <span className="classic-tag">
                  <Icon name="award" size={15} /> Clásico
                </span>
              )}
            </span>
          ) : (
            <span className="link small">Calificar</span>
          )}
        </button>
        {e.rewatch && (
          <button className="with-line set" onClick={() => openWith(summaryFromSnap(s))} aria-label={`Con quién volver a ver ${s.title}`}>
            <Icon name="repeat" size={14} />
            <span className="ellipsis">{e.withWho?.length ? `Volver a ver · ${e.withWho.join(' · ')}` : 'Volver a ver · ¿con quién?'}</span>
          </button>
        )}
      </div>
      {handle}
    </div>
  );
}

const NO_ONE = '__nadie__';

const matchesWith = (e: Entry, withF: string | null) => withF === null || (withF === NO_ONE ? !e.withWho?.length : !!e.withWho?.includes(withF));

/** Fila de filtro "Con quién": cualquiera, cada etiqueta (con cantidad) o sin asignar. */
function CompanionFilter({ items, value, onChange, label }: { items: Entry[]; value: string | null; onChange: (v: string | null) => void; label: string }) {
  const companions = useStore((s) => s.companions);
  if (!companions.length) return null;
  return (
    <div className="chips" style={{ marginTop: 10 }} aria-label={label}>
      <span className="chip-label">
        <Icon name="users" size={16} /> Con
      </span>
      <button className={`chip ${value === null ? 'on' : ''}`} onClick={() => onChange(null)}>
        Cualquiera
      </button>
      {companions.map((c) => (
        <button key={c} className={`chip ${value === c ? 'on' : ''}`} onClick={() => onChange(value === c ? null : c)}>
          {c} <span className="faint">{items.filter((e) => e.withWho?.includes(c)).length}</span>
        </button>
      ))}
      <button className={`chip ${value === NO_ONE ? 'on' : ''}`} onClick={() => onChange(value === NO_ONE ? null : NO_ONE)}>
        Sin asignar <span className="faint">{items.filter((e) => !e.withWho?.length).length}</span>
      </button>
    </div>
  );
}

function Want() {
  const entries = useStore((s) => s.entries);
  const openRate = useSheets((s) => s.openRate);
  const openActions = useSheets((s) => s.openActions);
  const openWith = useSheets((s) => s.openWith);
  const [withF, setWithF] = useState<string | null>(null);
  const [sort, setSort] = useState<'desire' | 'recent' | 'imdb' | 'year' | 'title'>('desire');
  const [typeF, setTypeF] = useState<TypeF>('all');
  const [genreF, setGenreF] = useState<number | null>(null);
  const all = Object.values(entries).filter((e) => e.status === 'want');
  const list = all
    .filter((e) => (typeF === 'all' || e.snap.type === typeF) && (genreF === null || e.snap.genreIds.includes(genreF)))
    .filter((e) => matchesWith(e, withF))
    .sort((a, b) =>
      sort === 'desire'
        ? (b.desire ?? 0) - (a.desire ?? 0) || b.addedAt - a.addedAt
        : sort === 'recent'
          ? b.addedAt - a.addedAt
          : sort === 'imdb' ? imdbNum(b) - imdbNum(a) : sort === 'year' ? (b.snap.year ?? '').localeCompare(a.snap.year ?? '') : a.snap.title.localeCompare(b.snap.title, 'es'),
    );

  if (all.length === 0)
    return (
      <Empty icon="bookmark" title="Tu lista está vacía">
        <p>Tocá «Quiero verla» en cualquier película para guardarla acá.</p>
      </Empty>
    );

  return (
    <>
      <div className="row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
        <span className="muted small">{all.length} para ver</span>
        <select className="input" style={{ height: 34, width: 'auto', fontSize: 14, borderRadius: 999 }} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Ordenar">
          <option value="desire">Más ganas primero</option>
          <option value="recent">Agregadas recientemente</option>
          <option value="imdb">Nota de IMDb</option>
          <option value="year">Año</option>
          <option value="title">Título (A-Z)</option>
        </select>
      </div>
      <CompanionFilter items={all} value={withF} onChange={setWithF} label="Filtrar por con quién verla" />
      <Filters typeF={typeF} setTypeF={setTypeF} genreF={genreF} setGenreF={setGenreF} list={all} />
      {list.length === 0 && <p className="muted small center" style={{ marginTop: 24 }}>No hay películas con esos filtros.</p>}
      <div style={{ marginTop: 6 }}>
        {list.map((e) => {
          const s = e.snap;
          return (
            <div className="mrow" key={e.key}>
              <Link to={`/t/${s.type}/${s.id}`}>
                <Poster path={s.poster} title={s.title} size="w154" />
              </Link>
              <div className="info">
                <Link to={`/t/${s.type}/${s.id}`}>
                  <div className="t clamp-2">{s.title}</div>
                  <div className="sub">
                    {s.year && <span>{s.year}</span>}
                    {s.type === 'tv' && <span className="dot">Serie</span>}
                    <span className="dot">
                      <RatingBadge type={s.type} id={s.id} imdbId={s.imdbId} tmdbScore={s.tmdbScore} />
                    </span>
                  </div>
                  {s.directors?.[0] && <div className="sub ellipsis">{s.directors.map((d) => d.name).join(', ')}</div>}
                </Link>
                <div className="row wrap" style={{ gap: '2px 8px', marginTop: 4 }}>
                  <Desire k={e.key} />
                  <button className={`with-line ${e.withWho?.length ? 'set' : ''}`} style={{ marginTop: 0 }} onClick={() => openWith(summaryFromSnap(s))} aria-label={`Con quién ver ${s.title}`}>
                    <Icon name="users" size={14} />
                    <span className="ellipsis">{e.withWho?.length ? e.withWho.join(' · ') : '¿Con quién?'}</span>
                  </button>
                </div>
              </div>
              <button className="btn small" onClick={() => openRate(summaryFromSnap(s))}>
                <Icon name="eye" size={16} /> La vi
              </button>
              <button className="icon-btn ghost" aria-label="Opciones" onClick={() => openActions(summaryFromSnap(s))}>
                <Icon name="plus" size={20} />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}

function Skipped() {
  const entries = useStore((s) => s.entries);
  const list = Object.values(entries)
    .filter((e) => e.status === 'skip')
    .sort((a, b) => b.addedAt - a.addedAt);
  if (list.length === 0)
    return (
      <Empty icon="ban" title="No descartaste nada">
        <p>Lo que marques como «No me interesa» no se te vuelve a recomendar. Si te arrepentís, la recuperás desde acá.</p>
      </Empty>
    );
  return (
    <div style={{ marginTop: 6 }}>
      {list.map((e) => (
        <div className="mrow" key={e.key}>
          <Link to={`/t/${e.snap.type}/${e.snap.id}`}>
            <Poster path={e.snap.poster} title={e.snap.title} size="w154" />
          </Link>
          <Link to={`/t/${e.snap.type}/${e.snap.id}`} className="info">
            <div className="t clamp-2">{e.snap.title}</div>
            <div className="sub">{e.snap.year}</div>
          </Link>
          <button className="btn small outline" onClick={() => unmark(e.key)}>
            Recuperar
          </button>
        </div>
      ))}
    </div>
  );
}
