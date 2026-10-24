import { useState } from 'react';
import { useStore } from '../lib/store';
import { testTmdbKey } from '../lib/tmdb';
import { testOmdbKey } from '../lib/omdb';
import { Icon } from './Icon';

type Status = { kind: 'idle' | 'testing' | 'ok' | 'err'; msg?: string };

function KeyField({ id, label, value, onChange, placeholder }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="search">
        <Icon name="key" size={18} />
        <input
          id={id}
          className="input"
          style={{ borderRadius: 12 }}
          type={show ? 'text' : 'password'}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
        />
        <button className="clear" type="button" aria-label={show ? 'Ocultar' : 'Mostrar'} onClick={() => setShow((s) => !s)}>
          <Icon name="eye" size={18} />
        </button>
      </div>
    </div>
  );
}

/** Carga y prueba de las claves de TMDB y OMDb. */
export function KeyForm({ onSaved, compact }: { onSaved?: () => void; compact?: boolean }) {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const [tmdb, setTmdb] = useState(settings.tmdbKey);
  const [omdb, setOmdb] = useState(settings.omdbKey);
  const [st, setSt] = useState<{ tmdb: Status; omdb: Status }>({ tmdb: { kind: 'idle' }, omdb: { kind: 'idle' } });

  const save = async () => {
    setSt({ tmdb: { kind: 'testing' }, omdb: { kind: omdb ? 'testing' : 'idle' } });
    let tOk = false;
    let oOk = !omdb;
    try {
      await testTmdbKey(tmdb);
      tOk = true;
      setSt((s) => ({ ...s, tmdb: { kind: 'ok', msg: 'Clave de TMDB funcionando.' } }));
    } catch (e) {
      setSt((s) => ({ ...s, tmdb: { kind: 'err', msg: (e as Error).message } }));
    }
    if (omdb) {
      try {
        await testOmdbKey(omdb);
        oOk = true;
        setSt((s) => ({ ...s, omdb: { kind: 'ok', msg: 'Clave de OMDb funcionando.' } }));
      } catch (e) {
        setSt((s) => ({ ...s, omdb: { kind: 'err', msg: (e as Error).message } }));
      }
    }
    if (tOk) update({ tmdbKey: tmdb, omdbKey: oOk ? omdb : settings.omdbKey });
    if (tOk && oOk) onSaved?.();
  };

  const msg = (s: Status) =>
    s.kind === 'ok' ? <span className="ok-msg">✓ {s.msg}</span> : s.kind === 'err' ? <span className="err-msg">{s.msg}</span> : s.kind === 'testing' ? <span className="muted small">Probando…</span> : null;

  return (
    <div>
      <KeyField id="tmdb" label="Clave de TMDB (obligatoria)" value={tmdb} onChange={setTmdb} placeholder="API Key o Token de lectura" />
      {msg(st.tmdb)}
      {!compact && (
        <ol className="steps">
          <li>
            Creá una cuenta gratis en{' '}
            <a href="https://www.themoviedb.org/signup" target="_blank" rel="noreferrer">
              themoviedb.org
            </a>
            .
          </li>
          <li>
            Entrá a{' '}
            <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">
              Configuración → API
            </a>{' '}
            y pedí una clave de tipo «Developer» (uso personal).
          </li>
          <li>Copiá la «API Key» (o el «Token de lectura») y pegala acá.</li>
        </ol>
      )}

      <KeyField id="omdb" label="Clave de OMDb (para la nota de IMDb)" value={omdb} onChange={setOmdb} placeholder="Opcional, ej. a1b2c3d4" />
      {msg(st.omdb)}
      {!compact && (
        <ol className="steps">
          <li>
            Pedila gratis en{' '}
            <a href="https://www.omdbapi.com/apikey.aspx" target="_blank" rel="noreferrer">
              omdbapi.com/apikey
            </a>{' '}
            (plan FREE, 1.000 consultas por día).
          </li>
          <li>Te llega por mail: hacé clic en el enlace de activación y pegá la clave acá.</li>
          <li>Sin esta clave la app muestra la nota de TMDB en lugar de la de IMDb.</li>
        </ol>
      )}

      <button className="btn primary block" style={{ marginTop: 18 }} onClick={save} disabled={!tmdb || st.tmdb.kind === 'testing'}>
        {st.tmdb.kind === 'testing' ? 'Probando…' : 'Guardar claves'}
      </button>
    </div>
  );
}
