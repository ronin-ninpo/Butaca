import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { affinity, loadProfile, socialError, useSocial, type ProfileItem } from '../lib/social';
import { useAsync } from '../lib/useAsync';
import { useStore } from '../lib/store';
import { fmtAvg } from '../lib/rating';
import { TopBar, UserAvatar } from '../components/Bars';
import { Poster } from '../components/Poster';
import { StatusBadge } from '../components/MediaCard';
import { PersonCard } from '../components/People';
import { Stars } from '../components/Stars';
import { Empty, ErrorBox, Spinner } from '../components/Misc';
import { Icon } from '../components/Icon';

/** Una película del perfil de otra persona: con SUS estrellas y TU estado. */
function ItemCard({ it, rank }: { it: ProfileItem; rank?: number }) {
  const [type, id] = it.k.split(':');
  return (
    <Link to={`/t/${type}/${id}`} className="mcard">
      <Poster path={it.p} title={it.t} size="w185">
        <StatusBadge k={it.k} />
      </Poster>
      <div className="t clamp-2">
        {rank ? <span className="faint">{rank}. </span> : null}
        {it.t}
      </div>
      <div className="meta">
        {it.l && <Icon name="crown" size={13} fill className="legend-tag" />}
        {it.r ? <Stars value={it.r} size={11} /> : <span>{it.y}</span>}
        {it.c && <Icon name="award" size={13} className="classic-tag" />}
      </div>
    </Link>
  );
}

export function UserProfile() {
  const { uid = '' } = useParams();
  const ready = useSocial((s) => s.ready);
  const myUid = useSocial((s) => s.uid);
  const entries = useStore((s) => s.entries);
  const prof = useAsync(() => loadProfile(uid), [uid, ready], ready);
  const lib = prof.data?.library;
  const isMe = uid === myUid;

  const aff = useMemo(() => (lib && !isMe ? affinity(lib.seen, entries) : null), [lib, entries, isMe]);
  const legends = lib?.seen.filter((i) => i.l) ?? [];
  const ranking = lib?.seen.filter((i) => !i.l && i.r).slice(0, 20) ?? [];
  const recent = lib ? [...lib.seen].filter((i) => i.s).sort((a, b) => (b.s ?? 0) - (a.s ?? 0)).slice(0, 12) : [];
  const classics = lib?.seen.filter((i) => i.c) ?? [];

  if (!ready)
    return (
      <>
        <TopBar title="Perfil" back />
        <div className="page">
          <p className="muted">Iniciá sesión para ver perfiles.</p>
        </div>
      </>
    );
  if (prof.error)
    return (
      <>
        <TopBar title="Perfil" back />
        <ErrorBox error={new Error(socialError(prof.error))} onRetry={prof.reload} />
      </>
    );
  if (prof.loading || prof.data === undefined)
    return (
      <>
        <TopBar title="Perfil" back />
        <Spinner />
      </>
    );
  if (prof.data === null)
    return (
      <>
        <TopBar title="Perfil" back />
        <Empty icon="users" title="Este perfil no está disponible">
          <p>Puede que la persona lo haya ocultado.</p>
        </Empty>
      </>
    );

  const p = prof.data.summary;
  return (
    <>
      <TopBar title={p.name} back />
      <div className="page">
        <div className="row" style={{ gap: 14, marginTop: 4 }}>
          <UserAvatar name={p.name} color={p.color} size={72} />
          <div className="grow">
            {p.bio && <p>{p.bio}</p>}
            <div className="muted small" style={{ marginTop: 4 }}>
              Vio {p.stats.seen}
              {p.stats.avg ? ` · promedio ★ ${fmtAvg(p.stats.avg)}` : ''}
              {p.stats.legends ? ` · ${p.stats.legends} ${p.stats.legends === 1 ? 'leyenda' : 'leyendas'}` : ''}
            </div>
          </div>
        </div>

        {isMe ? (
          <p className="muted small" style={{ marginTop: 12 }}>
            Así ven tu perfil los demás.{' '}
            <Link className="link" to="/comunidad/perfil">
              Editar
            </Link>
          </p>
        ) : (
          aff && (
            <div className="card row" style={{ marginTop: 14, justifyContent: 'space-between' }}>
              <span className="small">
                {aff.common ? (
                  <>
                    Vieron <b>{aff.common}</b> en común
                  </>
                ) : (
                  'Todavía no vieron películas en común'
                )}
              </span>
              {aff.score !== null ? (
                <b style={{ color: aff.score >= 75 ? 'var(--seen)' : aff.score >= 50 ? 'var(--gold)' : 'var(--muted)' }}>Afinidad {aff.score}%</b>
              ) : aff.common ? (
                <span className="faint small">Califiquen más para ver la afinidad</span>
              ) : null}
            </div>
          )
        )}
        {!isMe && (
          <p className="faint small" style={{ marginTop: 10 }}>
            Para recomendarle una película, abrila y tocá «Recomendar».
          </p>
        )}

        {lib && lib.seen.length > 0 && !isMe && (
          <p className="faint small" style={{ marginTop: 6 }}>
            Debajo de cada póster, sus estrellas. Arriba a la izquierda, tu calificación si también la viste.
          </p>
        )}

        {!lib || !lib.seen.length ? (
          <Empty icon="film" title="Todavía no tiene películas vistas" />
        ) : (
          <>
            {legends.length > 0 && (
              <section className="section">
                <h2 className="section-title">
                  <Icon name="crown" size={18} fill className="legend-tag" /> Sus leyendas
                </h2>
                <div className="hscroll">
                  {legends.map((it) => (
                    <ItemCard key={it.k} it={it} />
                  ))}
                </div>
              </section>
            )}
            {ranking.length > 0 && (
              <section className="section">
                <h2 className="section-title">Su ranking</h2>
                <div className="grid">
                  {ranking.map((it, i) => (
                    <ItemCard key={it.k} it={it} rank={i + 1} />
                  ))}
                </div>
              </section>
            )}
            {recent.length > 0 && (
              <section className="section">
                <h2 className="section-title">Vio últimamente</h2>
                <div className="hscroll">
                  {recent.map((it) => (
                    <ItemCard key={it.k} it={it} />
                  ))}
                </div>
              </section>
            )}
            {classics.length > 0 && (
              <section className="section">
                <h2 className="section-title">
                  <Icon name="award" size={18} className="classic-tag" /> Sus clásicos
                </h2>
                <div className="hscroll">
                  {classics.map((it) => (
                    <ItemCard key={it.k} it={it} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
        {lib && lib.favActors.length > 0 && (
          <section className="section">
            <h2 className="section-title">Actores favoritos</h2>
            <div className="people">
              {lib.favActors.map((a) => (
                <PersonCard key={a.id} p={a} />
              ))}
            </div>
          </section>
        )}
        {lib && lib.favDirectors.length > 0 && (
          <section className="section">
            <h2 className="section-title">Directores favoritos</h2>
            <div className="people">
              {lib.favDirectors.map((a) => (
                <PersonCard key={a.id} p={a} kind="director" />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
