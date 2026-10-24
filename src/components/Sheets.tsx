import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { infoOf, useSheets } from '../lib/sheets';
import { useStore } from '../lib/store';
import { keyOf } from '../lib/types';
import { mark, unmark } from '../lib/actions';
import { fmtRating, ratingLabel } from '../lib/rating';
import { Stars } from './Stars';
import { Poster } from './Poster';
import { Icon } from './Icon';

function useBackToClose(open: boolean, close: () => void) {
  // El botón "atrás" del celular cierra la hoja en vez de salir de la pantalla.
  useEffect(() => {
    if (!open) return;
    history.pushState({ sheet: true }, '');
    const onPop = () => close();
    window.addEventListener('popstate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      if (history.state?.sheet) history.back();
    };
  }, [open, close]);
}

/** Ejecuta fn cuando terminó el "atrás" con el que se cierra la hoja (si no, navegar se pisa con ese atrás). */
function afterSheetClosed(fn: () => void) {
  let done = false;
  const run = () => {
    if (done) return;
    done = true;
    window.removeEventListener('popstate', run);
    fn();
  };
  window.addEventListener('popstate', run);
  setTimeout(run, 500);
}

export function Sheets() {
  const { kind, target, close, openRate, openWith } = useSheets();
  const navigate = useNavigate();
  const info = target ? infoOf(target) : null;
  const key = info ? keyOf(info.type, info.id) : '';
  const entry = useStore((s) => (key ? s.entries[key] : undefined));
  const [stars, setStars] = useState(0);
  const [legend, setLegend] = useState(false);

  useEffect(() => {
    const seen = entry?.status === 'seen';
    setStars(seen ? entry.rating ?? 0 : 0);
    setLegend(seen ? !!entry.legend : false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, key]);

  useBackToClose(!!kind, close);

  if (!kind || !target || !info) return null;

  const toggleLegend = () => {
    // Una leyenda sin estrellas arranca con 5 (después se pueden cambiar).
    if (!legend && !stars) setStars(5);
    setLegend(!legend);
  };
  const save = () => {
    mark(target, 'seen', stars || undefined, legend);
    close();
  };

  return (
    <>
      <div className="scrim" onClick={close} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={kind === 'rate' ? 'Calificar' : kind === 'with' ? 'Con quién verla' : 'Opciones'}>
        <div className="grab" />
        <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          <Poster path={info.poster} title={info.title} size="w92" className="sheet-poster" />
          <div className="grow">
            <h3 className="clamp-2">{info.title}</h3>
            <div className="muted small">{info.year}</div>
          </div>
        </div>

        {kind === 'with' ? (
          <WithPanel k={key} onDone={close} />
        ) : kind === 'rate' ? (
          <>
            <p className="center muted" style={{ marginTop: 18 }}>
              ¿Qué te pareció?
            </p>
            <div className="center" style={{ marginTop: 4 }}>
              <Stars value={stars} onChange={setStars} size={42} big />
            </div>
            <div className="rate-label">
              {stars ? (
                <>
                  {fmtRating(stars)} · {ratingLabel(stars)} <span className="muted small">({stars * 2}/10)</span>
                </>
              ) : (
                <span className="faint small" style={{ fontWeight: 500 }}>
                  Tocá la mitad de una estrella para media
                </span>
              )}
            </div>
            <button className={`legend-btn ${legend ? 'on' : ''}`} aria-pressed={legend} onClick={toggleLegend}>
              <Icon name="crown" size={26} fill={legend} />
              <span>
                <b>Leyenda</b>
                <span className="small">Una de mis favoritas de siempre</span>
              </span>
              <span className="check">{legend && <Icon name="check" size={14} stroke={3} />}</span>
            </button>
            <button className="btn primary block" style={{ marginTop: 14 }} onClick={save} disabled={!stars && !legend}>
              Guardar
            </button>
            <div className="opts">
              <button
                className="opt"
                onClick={() => {
                  mark(target, 'seen', undefined);
                  close();
                }}
              >
                <Icon name="eye" /> La vi, pero no la califico
              </button>
              {entry?.status === 'seen' && (
                <button
                  className="opt"
                  style={{ color: 'var(--danger)' }}
                  onClick={() => {
                    unmark(key);
                    close();
                  }}
                >
                  <Icon name="trash" /> Quitar de vistas
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="opts">
            <button
              className={`opt ${entry?.status === 'want' ? 'on' : ''}`}
              onClick={() => {
                if (entry?.status === 'want') unmark(key);
                else mark(target, 'want');
                close();
              }}
            >
              <Icon name="bookmark" fill={entry?.status === 'want'} /> {entry?.status === 'want' ? 'Quitar de Quiero ver' : 'Quiero verla'}
            </button>
            {entry?.status === 'want' && (
              <button className="opt" onClick={() => openWith(target)}>
                <Icon name="users" /> {entry.withWho?.length ? `Con ${entry.withWho.join(', ')}` : '¿Con quién la querés ver?'}
              </button>
            )}
            <button className={`opt ${entry?.status === 'seen' ? 'on' : ''}`} onClick={() => openRate(target)}>
              <Icon name="eye" /> {entry?.status === 'seen' ? 'Cambiar mi calificación' : 'Ya la vi…'}
            </button>
            <button
              className={`opt ${entry?.status === 'skip' ? 'on' : ''}`}
              onClick={() => {
                if (entry?.status === 'skip') unmark(key);
                else mark(target, 'skip');
                close();
              }}
            >
              <Icon name="ban" /> {entry?.status === 'skip' ? 'Volver a recomendármela' : 'No me interesa'}
            </button>
            <button
              className="opt"
              onClick={() => {
                const to = `/t/${info.type}/${info.id}`;
                afterSheetClosed(() => navigate(to));
                close();
              }}
            >
              <Icon name="info" /> Ver ficha completa
            </button>
          </div>
        )}
      </div>
    </>
  );
}

/** Elegir con quién ver la película, crear etiquetas nuevas y editarlas. */
function WithPanel({ k, onDone }: { k: string; onDone: () => void }) {
  const selected = useStore((s) => s.entries[k]?.withWho) ?? [];
  const companions = useStore((s) => s.companions);
  const { setWithWho, addCompanion } = useStore.getState();
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(false);

  const toggle = (n: string) => setWithWho(k, selected.includes(n) ? selected.filter((x) => x !== n) : [...selected, n]);
  const create = (e: React.FormEvent) => {
    e.preventDefault();
    const n = addCompanion(text);
    if (n && !selected.includes(n)) setWithWho(k, [...selected, n]);
    setText('');
  };

  if (editing) return <TagEditor onBack={() => setEditing(false)} />;

  return (
    <>
      <p className="muted" style={{ marginTop: 16 }}>
        ¿Con quién la querés ver?
      </p>
      {companions.length ? (
        <div className="tag-grid" style={{ marginTop: 10 }}>
          {companions.map((c) => {
            const on = selected.includes(c);
            return (
              <button key={c} className={`chip ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => toggle(c)}>
                {on && <Icon name="check" size={14} stroke={3} />}
                {c}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="faint small" style={{ marginTop: 8 }}>
          Todavía no tenés etiquetas. Creá la primera abajo (por ejemplo: Belén, Familia, Sobrino).
        </p>
      )}
      <form className="row" style={{ marginTop: 14 }} onSubmit={create}>
        <input className="input grow" placeholder="Nueva etiqueta (ej: Familia)" aria-label="Nueva etiqueta" value={text} maxLength={30} onChange={(e) => setText(e.target.value)} />
        <button className="btn" type="submit" disabled={!text.trim()}>
          <Icon name="plus" size={18} /> Agregar
        </button>
      </form>
      <div className="row" style={{ marginTop: 16, justifyContent: 'space-between' }}>
        {companions.length > 0 ? (
          <button className="link small" onClick={() => setEditing(true)}>
            Editar etiquetas
          </button>
        ) : (
          <span />
        )}
        <button className="btn primary" onClick={onDone}>
          Listo
        </button>
      </div>
    </>
  );
}

function TagEditor({ onBack }: { onBack: () => void }) {
  const companions = useStore((s) => s.companions);
  const entries = useStore((s) => s.entries);
  const { renameCompanion, removeCompanion } = useStore.getState();
  const uses = (c: string) => Object.values(entries).filter((e) => e.withWho?.includes(c)).length;
  return (
    <>
      <p className="muted" style={{ marginTop: 16 }}>
        Editá el nombre o borrá etiquetas. Los cambios se aplican en todas tus películas.
      </p>
      <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>
        {companions.map((c) => (
          <div key={c} className="row">
            <input
              className="input grow"
              defaultValue={c}
              aria-label={`Nombre de la etiqueta ${c}`}
              maxLength={30}
              onBlur={(e) => e.target.value.trim() && e.target.value !== c && renameCompanion(c, e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
            <span className="faint small" style={{ width: 54, textAlign: 'right' }}>
              {uses(c)} {uses(c) === 1 ? 'peli' : 'pelis'}
            </span>
            <button
              className="icon-btn ghost"
              aria-label={`Borrar la etiqueta ${c}`}
              onClick={() => {
                const n = uses(c);
                if (!n || confirm(`¿Borrar «${c}»? Se quita de ${n} ${n === 1 ? 'película' : 'películas'}.`)) removeCompanion(c);
              }}
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
        ))}
      </div>
      <button className="btn block" style={{ marginTop: 16 }} onClick={onBack}>
        Volver
      </button>
    </>
  );
}
