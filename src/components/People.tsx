import { Link } from 'react-router-dom';
import { useStore } from '../lib/store';
import type { PersonRef } from '../lib/types';
import { Avatar } from './Poster';
import { Icon } from './Icon';

export function PersonCard({ p, sub, kind = 'actor' }: { p: PersonRef; sub?: string; kind?: 'actor' | 'director' }) {
  const fav = useStore((s) => !!(kind === 'actor' ? s.favActors : s.favDirectors)[String(p.id)]);
  return (
    <Link to={`/p/${p.id}`} className="pcard">
      <Avatar path={p.profile} name={p.name} />
      {fav && (
        <span className="fav-dot" title="Favorito">
          <Icon name="heart" size={12} fill stroke={2} />
        </span>
      )}
      <div className="n clamp-2">{p.name}</div>
      {sub && <div className="c clamp-2">{sub}</div>}
    </Link>
  );
}

export function FavButton({ kind, p, label, iconOnly }: { kind: 'actor' | 'director'; p: PersonRef; label?: string; iconOnly?: boolean }) {
  const fav = useStore((s) => !!(kind === 'actor' ? s.favActors : s.favDirectors)[String(p.id)]);
  const toggle = useStore((s) => s.toggleFav);
  if (iconOnly)
    return (
      <button
        className="icon-btn ghost"
        style={{ color: fav ? 'var(--accent)' : 'var(--faint)' }}
        aria-pressed={fav}
        aria-label={fav ? `Quitar a ${p.name} de favoritos` : `Marcar a ${p.name} como favorito`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggle(kind, p);
        }}
      >
        <Icon name="heart" fill={fav} />
      </button>
    );
  return (
    <button
      className={`btn small ${fav ? 'primary' : 'outline'}`}
      aria-pressed={fav}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(kind, p);
      }}
    >
      <Icon name="heart" size={16} fill={fav} />
      {label ?? (fav ? 'Favorito' : 'Marcar favorito')}
    </button>
  );
}
