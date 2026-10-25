import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import { useSheets } from '../lib/sheets';
import { keyOf, type MediaSummary } from '../lib/types';
import { Poster } from './Poster';
import { RatingBadge } from './RatingBadge';
import { Icon } from './Icon';
import { fmtRating } from '../lib/rating';

export function StatusBadge({ k }: { k: string }) {
  const e = useStore((s) => s.entries[k]);
  if (!e) return null;
  if (e.status === 'seen' && e.legend)
    return (
      <span className="status-badge legend" title={e.classic ? 'Leyenda · Clásico' : 'Leyenda'}>
        <Icon name="crown" size={12} fill stroke={2} />
        {e.rating ? fmtRating(e.rating) : ''}
        {e.classic && <Icon name="award" size={12} stroke={2.5} />}
      </span>
    );
  if (e.status === 'seen')
    return (
      <span className="status-badge seen" title={e.classic ? 'Vista · Clásico' : 'Vista'}>
        <Icon name={e.rating ? 'star' : 'check'} size={11} fill stroke={3} />
        {e.rating ? fmtRating(e.rating) : e.classic ? '' : 'Vista'}
        {e.classic && <Icon name="award" size={12} stroke={2.5} />}
      </span>
    );
  if (e.status === 'want')
    return (
      <span className="status-badge want" title="Quiero verla">
        <Icon name="bookmark" size={11} fill stroke={2.5} />
      </span>
    );
  if (e.status === 'later')
    return (
      <span className="status-badge skip" title="Ahora no">
        <Icon name="clock" size={11} stroke={3} />
      </span>
    );
  return (
    <span className="status-badge skip" title="No me interesa">
      <Icon name="ban" size={11} stroke={3} />
    </span>
  );
}

export function MediaCard({ item, showType, sub }: { item: MediaSummary; showType?: boolean; sub?: React.ReactNode }) {
  const openActions = useSheets((s) => s.openActions);
  const k = keyOf(item.type, item.id);
  return (
    <div className="mcard">
      <Link to={`/t/${item.type}/${item.id}`} aria-label={item.title}>
        <Poster path={item.poster} title={item.title} size="w185">
          <StatusBadge k={k} />
        </Poster>
      </Link>
      <button className="quick" aria-label="Opciones" onClick={() => openActions(item)}>
        <Icon name="plus" size={18} stroke={2.5} />
      </button>
      <Link to={`/t/${item.type}/${item.id}`}>
        <div className="t clamp-2">{item.title}</div>
      </Link>
      <div className="meta">
        {sub ?? (
          <>
            {item.year && <span>{item.year}</span>}
            {showType && item.type === 'tv' && <span>Serie</span>}
            <RatingBadge type={item.type} id={item.id} tmdbScore={item.tmdbScore} />
          </>
        )}
      </div>
    </div>
  );
}

export function MediaGrid({ items, showType }: { items: MediaSummary[]; showType?: boolean }) {
  return (
    <div className="grid">
      {items.map((it) => (
        <MediaCard key={keyOf(it.type, it.id)} item={it} showType={showType} />
      ))}
    </div>
  );
}

export function MediaStrip({ items }: { items: MediaSummary[] }) {
  return (
    <div className="hscroll">
      {items.map((it) => (
        <MediaCard key={keyOf(it.type, it.id)} item={it} />
      ))}
    </div>
  );
}
