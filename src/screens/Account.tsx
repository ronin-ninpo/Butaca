import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authErrorMessage, logout, resetPassword, signIn, signUp, useSync, whenReady } from '../lib/sync';
import { useStore } from '../lib/store';
import { toast } from '../lib/toast';
import { TopBar } from '../components/Bars';
import { Segmented } from '../components/Misc';
import { Icon } from '../components/Icon';
import { SyncBadge } from '../components/SyncBadge';

type Mode = 'login' | 'signup';

export function Account() {
  const navigate = useNavigate();
  const { email: userEmail, status } = useSync();
  const hasKey = useStore((s) => !!s.settings.tmdbKey);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (mode === 'signup' && pass !== pass2) return setMsg({ text: 'Las contraseñas no coinciden.' });
    setBusy(true);
    try {
      if (mode === 'signup') await signUp(email, pass);
      else await signIn(email, pass);
      await whenReady();
      toast(mode === 'signup' ? 'Cuenta creada. Tus listas ya se guardan en la nube.' : 'Sesión iniciada. Tus listas están sincronizadas.');
      navigate('/', { replace: true });
    } catch (err) {
      setMsg({ text: authErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setMsg(null);
    if (!email.trim()) return setMsg({ text: 'Escribí tu email arriba y volvé a tocar «Olvidé mi contraseña».' });
    setBusy(true);
    try {
      await resetPassword(email);
      setMsg({ ok: true, text: `Te mandamos un mail a ${email.trim()} para elegir una contraseña nueva. Revisá también la carpeta de spam.` });
    } catch (err) {
      setMsg({ text: authErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  if (userEmail) {
    return (
      <>
        <TopBar title="Tu cuenta" back />
        <div className="page">
          <div className="card" style={{ marginTop: 6 }}>
            <div className="row">
              <div className="avatar" style={{ width: 48, height: 48, fontSize: 18, margin: 0 }}>
                {userEmail[0]?.toUpperCase()}
              </div>
              <div className="grow">
                <div style={{ fontWeight: 700 }} className="ellipsis">
                  {userEmail}
                </div>
                <SyncBadge />
              </div>
            </div>
          </div>
          <p className="muted small" style={{ marginTop: 14 }}>
            Tus listas, calificaciones, favoritos y claves se guardan en tu cuenta y se sincronizan con todos los dispositivos donde ingreses.
          </p>
          <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
            <button
              className="btn outline"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                await logout(false);
                toast('Sesión cerrada. Tus listas quedan en este dispositivo.');
                setBusy(false);
              }}
            >
              Cerrar sesión
            </button>
            <button
              className="btn outline danger"
              disabled={busy}
              onClick={async () => {
                if (!confirm('Se cierra la sesión y se borran tus listas y claves de ESTE dispositivo. En tu cuenta siguen guardadas. ¿Seguimos?')) return;
                setBusy(true);
                await logout(true);
                setBusy(false);
                navigate('/bienvenida', { replace: true });
              }}
            >
              Cerrar sesión y borrar de este dispositivo
            </button>
          </div>
          <p className="faint small" style={{ marginTop: 10 }}>
            Usá la segunda opción en una computadora compartida.
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <TopBar title="Tu cuenta" back />
      <div className="page">
        <div className="banner" style={{ marginTop: 6 }}>
          <Icon name="refresh" size={18} />
          <div>
            Con una cuenta, tus listas, calificaciones, favoritos y claves quedan guardados en la nube y se ven iguales en la PC y en el celular.
            {status === 'loading' && <span className="muted"> Conectando…</span>}
          </div>
        </div>

        <div style={{ marginTop: 16 }}>
          <Segmented<Mode>
            value={mode}
            onChange={(m) => {
              setMode(m);
              setMsg(null);
            }}
            options={[
              { value: 'login', label: 'Ingresar' },
              { value: 'signup', label: 'Crear cuenta' },
            ]}
          />
        </div>

        <form onSubmit={submit}>
          <div className="field">
            <label htmlFor="email">Email (es tu usuario)</label>
            <input id="email" className="input" type="email" autoComplete="email" inputMode="email" autoCapitalize="off" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="pass">Contraseña</label>
            <div className="search">
              <Icon name="key" size={18} />
              <input
                id="pass"
                className="input"
                style={{ borderRadius: 12 }}
                type={show ? 'text' : 'password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                minLength={6}
                required
              />
              <button className="clear" type="button" aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setShow((s) => !s)}>
                <Icon name="eye" size={18} />
              </button>
            </div>
          </div>
          {mode === 'signup' && (
            <div className="field">
              <label htmlFor="pass2">Repetí la contraseña</label>
              <input id="pass2" className="input" type={show ? 'text' : 'password'} autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} minLength={6} required />
              <span className="faint small">Mínimo 6 caracteres.</span>
            </div>
          )}

          {msg && (
            <p className={msg.ok ? 'ok-msg' : 'err-msg'} style={{ marginTop: 12 }} role="alert">
              {msg.text}
            </p>
          )}

          <button className="btn primary block" style={{ marginTop: 18 }} type="submit" disabled={busy}>
            {busy ? 'Un momento…' : mode === 'signup' ? 'Crear cuenta' : 'Ingresar'}
          </button>
        </form>

        {mode === 'login' && (
          <button className="link small" style={{ marginTop: 14 }} onClick={forgot} disabled={busy}>
            Olvidé mi contraseña
          </button>
        )}

        <p className="faint small" style={{ marginTop: 18 }}>
          {hasKey
            ? 'Si ya tenías listas en este dispositivo, se suman a las de tu cuenta.'
            : 'Al ingresar se cargan tus claves y listas guardadas en la cuenta.'}
        </p>
      </div>
    </>
  );
}
