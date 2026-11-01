import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useSync } from '../lib/sync';
import { PROFILE_COLORS, deleteInbox, loadDirectory, pendingInbox, saveMyProfile, socialError, useSocial, type InboxItem, type ProfileSummary } from '../lib/social';
import { useAsync } from '../lib/useAsync';
import { toast } from '../lib/toast';
import { fmtAvg } from '../lib/rating';
import { TopBar, UserAvatar } from '../components/Bars';
import { Poster } from '../components/Poster';
import { StatusBadge } from '../components/MediaCard';
import { Empty, ErrorBox, Segmented, Spinner, Switch } from '../components/Misc';
import { Icon } from '../components/Icon';

type Tab = 'personas' | 'recibidas' | 'perfil';

export function Community() {
  const { tab: tabParam } = useParams();
  const navigate = useNavigate();
  const account = useSync((s) => s.email);
  const syncStatus = useSync((s) => s.status);
  const { ready, me, inbox, error } = useSocial();
  const tab: Tab = tabParam === 'recibidas' || tabParam === 'perfil' ? tabParam : 'personas';
  const pending = pendingInbox(inbox).length;

  let body: React.ReactNode;
  if (!account) {
    body = (
      <div className="card" style={{ marginTop: 6 }}>
        <p>
          En Comunidad ves los perfiles de otras personas que usan Butaca (sus calificaciones y favoritas) y se pueden recomendar películas entre ustedes.
        </p>
        <p className="muted small" style={{ marginTop: 8 }}>
          Para usarla necesitás una cuenta, así tus recomendaciones llegan a todos tus dispositivos.
        </p>
        <Link className="btn primary block" style={{ marginTop: 14 }} to="/cuenta">
          Ingresar o crear cuenta
        </Link>
      </div>
    );
  } else if (!ready || me === undefined) {
    body = syncStatus === 'error' ? <p className="err-msg">No se pudo conectar con tu cuenta. Revisá Ajustes → Cuenta.</p> : <Spinner />;
  } else if (me === null) {
    body = (
      <>
        <div className="banner" style={{ marginTop: 6 }}>
          <Icon name="users" size={18} />
          <div>Creá tu perfil para ver a otras personas y recomendarles películas. Vos elegís qué nombre mostrar y si tu perfil es visible.</div>
        </div>
        <ProfileForm onSaved={() => navigate('/comunidad', { replace: true })} />
      </>
    );
  } else {
    body = (
      <>
        <Segmented<Tab>
          value={tab}
          onChange={(t) => navigate(t === 'personas' ? '/comunidad' : `/comunidad/${t}`, { replace: true })}
          options={[
            { value: 'personas', label: 'Personas' },
            { value: 'recibidas', label: `Recibidas${pending ? ` (${pending})` : ''}` },
            { value: 'perfil', label: 'Mi perfil' },
          ]}
        />
        {error && (
          <p className="err-msg" style={{ marginTop: 10 }}>
            {error}
          </p>
        )}
        {tab === 'personas' ? <People me={me} /> : tab === 'recibidas' ? <Received /> : <MyProfile me={me} />}
      </>
    );
  }

  return (
    <>
      <TopBar title="Comunidad" back />
      <div className="page">{body}</div>
    </>
  );
}

function People({ me }: { me: ProfileSummary }) {
  const dir = useAsync(() => loadDirectory(), []);
  if (dir.loading && !dir.data) return <Spinner />;
  if (dir.error) return <ErrorBox error={new Error(socialError(dir.error))} onRetry={dir.reload} />;
  const list = dir.data ?? [];
  return (
    <div style={{ marginTop: 8 }}>
      {!me.public && (
        <p className="muted small" style={{ marginTop: 8 }}>
          Tu perfil está oculto: vos ves a los demás, pero ellos no te ven ni te pueden recomendar.{' '}
          <Link className="link" to="/comunidad/perfil">
            Cambiarlo
          </Link>
        </p>
      )}
      {list.length === 0 ? (
        <Empty icon="users" title="Todavía no hay otras personas">
          <p>Cuando alguien más cree su perfil en Butaca, aparece acá. Pasales el link de la app.</p>
        </Empty>
      ) : (
        list.map((p) => (
          <Link key={p.uid} to={`/u/${p.uid}`} className="mrow">
            <UserAvatar name={p.name} color={p.color} size={52} />
            <div className="info">
              <div className="t">{p.name}</div>
              <div className="sub">
                Vio {p.stats.seen}
                {p.stats.avg ? <span className="dot">★ {fmtAvg(p.stats.avg)}</span> : null}
                {p.stats.legends ? <span className="dot">{p.stats.legends} {p.stats.legends === 1 ? 'leyenda' : 'leyendas'}</span> : null}
              </div>
              {p.bio && <div className="sub ellipsis">{p.bio}</div>}
              {p.top.length > 0 && (
                <div className="mini-posters">
                  {p.top.slice(0, 6).map((i) => (
                    <Poster key={i.k} path={i.p} title={i.t} size="w92" />
                  ))}
                </div>
              )}
            </div>
            <Icon name="chevron" size={18} />
          </Link>
        ))
      )}
    </div>
  );
}

const fmtWhen = (ms: number) => {
  const days = Math.floor((Date.now() - ms) / 86400000);
  if (days < 1) return 'hoy';
  if (days === 1) return 'ayer';
  if (days < 30) return `hace ${days} días`;
  return new Date(ms).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
};

function Received() {
  const inbox = useSocial((s) => s.inbox);
  if (!inbox.length)
    return (
      <Empty icon="sparkles" title="Todavía no te recomendaron nada">
        <p>Cuando alguien te recomiende una película, aparece acá y en «Para vos».</p>
      </Empty>
    );
  return (
    <div style={{ marginTop: 6 }}>
      {inbox.map((it) => (
        <ReceivedRow key={it.id} it={it} />
      ))}
    </div>
  );
}

function ReceivedRow({ it }: { it: InboxItem }) {
  const to = `/t/${it.type}/${it.tmdbId}`;
  return (
    <div className="mrow" style={{ alignItems: 'flex-start' }}>
      <Link to={to}>
        <Poster path={it.poster} title={it.title} size="w154">
          <StatusBadge k={it.key} />
        </Poster>
      </Link>
      <Link to={to} className="info">
        <div className="row" style={{ gap: 6 }}>
          {!it.handled && <span className="unread-dot" aria-label="Sin ver" />}
          <div className="t clamp-2">{it.title}</div>
        </div>
        <div className="sub">
          {it.year && <span>{it.year}</span>}
          <span className={it.year ? 'dot' : ''}>
            De <b>{it.fromName}</b>, {fmtWhen(it.createdAt)}
          </span>
        </div>
        {it.note && <p className="note">«{it.note}»</p>}
      </Link>
      <button
        className="icon-btn ghost"
        aria-label={`Borrar la recomendación de ${it.title}`}
        onClick={() => deleteInbox(it.id).catch((e) => toast(socialError(e)))}
      >
        <Icon name="trash" size={18} />
      </button>
    </div>
  );
}

function MyProfile({ me }: { me: ProfileSummary }) {
  return (
    <div style={{ marginTop: 14 }}>
      <Link to={`/u/${me.uid}`} className="card row" style={{ justifyContent: 'space-between' }}>
        <span className="row">
          <UserAvatar name={me.name} color={me.color} />
          <span>
            <b>{me.name}</b>
            <div className="muted small">{me.public ? 'Ver mi perfil como lo ven los demás' : 'Perfil oculto'}</div>
          </span>
        </span>
        <Icon name="chevron" size={18} />
      </Link>
      <ProfileForm initial={me} onSaved={() => toast('Perfil guardado.')} />
    </div>
  );
}

function ProfileForm({ initial, onSaved }: { initial?: ProfileSummary; onSaved: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [bio, setBio] = useState(initial?.bio ?? '');
  const [color, setColor] = useState(initial?.color ?? PROFILE_COLORS[0]);
  const [visible, setVisible] = useState(initial?.public ?? true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => setErr(null), [name]);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setErr(null);
        try {
          await saveMyProfile({ name, bio, color, public: visible });
          onSaved();
        } catch (x) {
          setErr(socialError(x));
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="field">
        <label htmlFor="pname">Nombre que ven los demás</label>
        <input id="pname" className="input" value={name} maxLength={30} onChange={(e) => setName(e.target.value)} placeholder="Ej: Nico" required />
      </div>
      <div className="field">
        <label htmlFor="pbio">Una frase (opcional)</label>
        <input id="pbio" className="input" value={bio} maxLength={120} onChange={(e) => setBio(e.target.value)} placeholder="Ej: Fan del cine de los 80 y del terror" />
      </div>
      <div className="field">
        <label>Color</label>
        <div className="color-dots">
          {PROFILE_COLORS.map((c) => (
            <button type="button" key={c} className={c === color ? 'on' : ''} style={{ background: c }} aria-label={`Color ${c}`} aria-pressed={c === color} onClick={() => setColor(c)} />
          ))}
        </div>
      </div>
      <div className="setting">
        <div className="grow">
          <div style={{ fontWeight: 650 }}>Perfil visible</div>
          <div className="muted small">
            Otras personas ven tu nombre, tus vistas con estrellas, leyendas y actores y directores favoritos, y te pueden recomendar películas. Nunca se
            muestran tu email, tus claves ni tu lista de «Quiero ver».
          </div>
        </div>
        <Switch on={visible} onChange={setVisible} label="Perfil visible" />
      </div>
      {err && (
        <p className="err-msg" style={{ marginTop: 10 }}>
          {err}
        </p>
      )}
      <button className="btn primary block" style={{ marginTop: 16 }} type="submit" disabled={busy || name.trim().length < 2}>
        {busy ? 'Guardando…' : initial ? 'Guardar cambios' : 'Crear mi perfil'}
      </button>
    </form>
  );
}
