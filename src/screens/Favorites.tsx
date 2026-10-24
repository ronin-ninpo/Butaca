import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useStore } from '../lib/store';
import { autoFavorites, peopleStats, type PersonStat } from '../lib/favorites';
import type { FavKind, FavPerson } from '../lib/types';
import { TopBar, SettingsButton } from '../components/Bars';
import { Avatar } from '../components/Poster';
import { Empty, Segmented } from '../components/Misc';
import { Icon } from '../components/Icon';
import { Stars } from '../components/Stars';
import { fmtAvg, roundHalf } from '../lib/rating';

export function Favorites() {
  const { tab } = useParams();
  const kind: FavKind = tab === 'directores' ? 'director' : 'actor';
  const navigate = useNavigate();
  const entries = useStore((s) => s.entries);
  const manual = useStore((s) => (kind === 'actor' ? s.favActors : s.favDirectors));
  const toggle = useStore((s) => s.toggleFav);

  const stats = useMemo(() => new Map(peopleStats(entries, kind).map((s) => [s.id, s])), [entries, kind]);
  const auto = useMemo(() => autoFavorites(entries, kind).filter((p) => !manual[String(p.id)]), [entries, kind, manual]);
  const mine = useMemo(
    () =>
      Object.values(manual).sort((a, b) => (stats.get(b.id)?.score ?? 0) - (stats.get(a.id)?.score ?? 0) || b.addedAt - a.addedAt),
    [manual, stats],
  );
  const word = kind === 'actor' ? 'actores y actrices' : 'directores y directoras';

  return (
    <>
      <TopBar title="Favoritos" right={<SettingsButton />} />
      <div className="page">
        <Segmented<FavKind>
          value={kind}
          onChange={(k) => navigate(k === 'actor' ? '/favoritos' : '/favoritos/directores', { replace: true })}
          options={[
            { value: 'actor', label: 'Actores' },
            { value: 'director', label: 'Directores' },
          ]}
        />

        <section className="section">
          <h2 className="section-title">
            Mis favoritos <small>{mine.length || ''}</small>
          </h2>
          {mine.length === 0 ? (
            <p className="muted small">
              Tocá el <Icon name="heart" size={13} /> en la ficha de cualquier persona para sumarla. Abajo te sugerimos {word} según tus calificaciones.
            </p>
          ) : (
            mine.map((p) => <PersonRow key={p.id} p={p} stat={stats.get(p.id)} fav onToggle={() => toggle(kind, p)} />)
          )}
        </section>

        <section className="section">
          <h2 className="section-title">Según tus calificaciones</h2>
          {auto.length === 0 ? (
            <Empty icon={kind === 'actor' ? 'users' : 'clapper'} title="Todavía no hay suficientes datos">
              <p>Calificá con estrellas las películas que viste y acá aparecen los {word} que más te gustan.</p>
            </Empty>
          ) : (
            <>
              <p className="faint small" style={{ marginBottom: 4 }}>
                Calculado con tus estrellas y cuántas viste de cada uno. Tocá el corazón para fijarlos.
              </p>
              {auto.map((p) => (
                <PersonRow key={p.id} p={{ ...p, addedAt: 0 }} stat={p} onToggle={() => toggle(kind, p)} />
              ))}
            </>
          )}
        </section>
      </div>
    </>
  );
}

function PersonRow({ p, stat, fav, onToggle }: { p: FavPerson; stat?: PersonStat; fav?: boolean; onToggle: () => void }) {
  return (
    <div className="mrow">
      <Link to={`/p/${p.id}`}>
        <Avatar path={p.profile ?? stat?.profile} name={p.name} className="" />
      </Link>
      <Link to={`/p/${p.id}`} className="info">
        <div className="t">{p.name}</div>
        {stat ? (
          <>
            <div className="sub">
              Viste {stat.seen}
              {stat.avg ? (
                <span className="row" style={{ gap: 4, marginLeft: 8 }}>
                  <Stars value={roundHalf(stat.avg)} size={12} /> {fmtAvg(stat.avg)}
                </span>
              ) : null}
            </div>
            <div className="sub ellipsis">{stat.titles.slice(0, 3).join(' · ')}</div>
          </>
        ) : (
          <div className="sub">Todavía no viste nada suyo</div>
        )}
      </Link>
      <button className="icon-btn ghost" aria-label={fav ? 'Quitar de favoritos' : 'Agregar a favoritos'} aria-pressed={!!fav} onClick={onToggle} style={{ color: fav ? 'var(--accent)' : 'var(--faint)' }}>
        <Icon name="heart" fill={fav} />
      </button>
    </div>
  );
}
