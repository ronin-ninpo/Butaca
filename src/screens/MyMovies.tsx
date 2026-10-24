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

type Tab = 'vistas' | 'quiero' | 'descartadas';
type SeenSort = 'fav' | 'recent' | 'year' | 'imdb' | 'title';
type TypeF = 'all' | MediaType;

const imdbNum = (e: Entry) => (e.snap.imdbRating ? parseFloat(e.snap.imdbRating) : -1);

/** Vistas ordenadas como "mis favoritas": por estrellas y, dentro de cada grupo, por el orden manual. */
export function favoritesOrder(entries: Record<string, Entry>, order: string[]) {
  const pos = new Map(order.map((k, i) => [k, i]));
  return Object.values(entries)
    .filter((e) => e.status === 'seen')
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0) || (pos.get(a.key) ?? 1e9) - (pos.get(b.key) ?? 1e9) || (b.seenAt ?? 0) - (a.seenAt ?? 0));
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

function Filters({ typeF, setTypeF, genreF, setGenreF, list }: { typeF: TypeF; setTypeF: (t: TypeF) => void; genreF: number | null; setGenreF: (g: number | null) => void; list: Entry[] }) {
  const includeTv = useStore((s) => s.settings.includeTv);
  const genreMap = useGenreMap();
  const hasTv = list.some((e) => e.snap.type === 'tv');
  const genreCounts = useMemo(() => {
    const m = new Map<number, number>();
    for (const e of list) for (const g of e.snap.genreIds) m.set(g, (m.get(g) ?? 0) + 1);
    return [...m.entries()].filter(([g]) => genreMap.has(g)).sort((a, b) => b[1] - a[1]);
  }, [list, genreMap]);
  if (list.length < 2) return null;
  return (
    <div className="chips" style={{ marginTop: 10 }}>
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

  const favs = useMemo(() => favoritesOrder(entries, order), [entries, order]);
  const rank = useMemo(() => new Map(favs.filter((e) => e.rating).map((e, i) => [e.key, i + 1])), [favs]);
  const filtered = favs.filter((e) => (typeF === 'all' || e.snap.type === typeF) && (genreF === null || e.snap.genreIds.includes(genreF)));
  const filtering = typeF !== 'all' || genreF !== null;
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

  const groups: { rating: number; items: Entry[] }[] = [];
  if (sort === 'fav') {
    for (const r of [5, 4, 3, 2, 1, 0]) {
      const items = sorted.filter((e) => (e.rating ?? 0) === r);
      if (items.length) groups.push({ rating: r, items });
    }
  }

  const onGroupReorder = (r: number, newKeys: string[]) => {
    // Reemplazamos ese grupo dentro del orden completo y mantenemos los demás igual.
    const full = favoritesOrder(useStore.getState().entries, useStore.getState().order);
    const byGroup = new Map<number, string[]>();
    for (const e of full) {
      const g = e.rating ?? 0;
      byGroup.set(g, [...(byGroup.get(g) ?? []), e.key]);
    }
    byGroup.set(r, newKeys);
    setOrder([5, 4, 3, 2, 1, 0].flatMap((g) => byGroup.get(g) ?? []));
  };

  return (
    <>
      <div className="row" style={{ marginTop: 12, justifyContent: 'space-between' }}>
        <span className="muted small ellipsis grow">
          {favs.length} vistas{avg ? ` · ★ ${avg.toFixed(1)}` : ''}
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
      <Filters typeF={typeF} setTypeF={setTypeF} genreF={genreF} setGenreF={setGenreF} list={favs} />

      {sort === 'fav' && (
        <p className="faint small" style={{ marginTop: 10 }}>
          {filtering ? 'Quitá los filtros para reordenar.' : 'Arrastrá desde ⠿ para ordenar las que tienen la misma cantidad de estrellas.'}
        </p>
      )}

      {sort === 'fav' ? (
        groups.map((g) => (
          <div key={g.rating}>
            <div className="group-head">
              {g.rating ? <Stars value={g.rating} size={15} /> : <span className="muted">Sin calificar</span>}
              <span className="muted">{g.items.length}</span>
            </div>
            <SortableGroup items={g.items} rank={rank} disabled={filtering || g.items.length < 2} onReorder={(keys) => onGroupReorder(g.rating, keys)} />
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
          {e.rating ? <Stars value={e.rating} size={16} /> : <span className="link small">Calificar</span>}
        </button>
      </div>
      {handle}
    </div>
  );
}

function Want() {
  const entries = useStore((s) => s.entries);
  const openRate = useSheets((s) => s.openRate);
  const openActions = useSheets((s) => s.openActions);
  const [sort, setSort] = useState<'recent' | 'imdb' | 'year' | 'title'>('recent');
  const [typeF, setTypeF] = useState<TypeF>('all');
  const [genreF, setGenreF] = useState<number | null>(null);
  const all = Object.values(entries).filter((e) => e.status === 'want');
  const list = all
    .filter((e) => (typeF === 'all' || e.snap.type === typeF) && (genreF === null || e.snap.genreIds.includes(genreF)))
    .sort((a, b) =>
      sort === 'recent' ? b.addedAt - a.addedAt : sort === 'imdb' ? imdbNum(b) - imdbNum(a) : sort === 'year' ? (b.snap.year ?? '').localeCompare(a.snap.year ?? '') : a.snap.title.localeCompare(b.snap.title, 'es'),
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
          <option value="recent">Agregadas recientemente</option>
          <option value="imdb">Nota de IMDb</option>
          <option value="year">Año</option>
          <option value="title">Título (A-Z)</option>
        </select>
      </div>
      <Filters typeF={typeF} setTypeF={setTypeF} genreF={genreF} setGenreF={setGenreF} list={all} />
      <div style={{ marginTop: 6 }}>
        {list.map((e) => {
          const s = e.snap;
          return (
            <div className="mrow" key={e.key}>
              <Link to={`/t/${s.type}/${s.id}`}>
                <Poster path={s.poster} title={s.title} size="w154" />
              </Link>
              <Link to={`/t/${s.type}/${s.id}`} className="info">
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
