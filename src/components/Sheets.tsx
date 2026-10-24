import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { infoOf, useSheets } from '../lib/sheets';
import { useStore } from '../lib/store';
import { keyOf } from '../lib/types';
import { mark, ratingLabel, unmark } from '../lib/actions';
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
  const { kind, target, close, openRate } = useSheets();
  const navigate = useNavigate();
  const info = target ? infoOf(target) : null;
  const key = info ? keyOf(info.type, info.id) : '';
  const entry = useStore((s) => (key ? s.entries[key] : undefined));
  const [stars, setStars] = useState(0);

  useEffect(() => {
    setStars(entry?.status === 'seen' ? entry.rating ?? 0 : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, key]);

  useBackToClose(!!kind, close);

  if (!kind || !target || !info) return null;

  const pick = (v: number) => {
    setStars(v);
    setTimeout(() => {
      mark(target, 'seen', v);
      close();
    }, 380);
  };

  return (
    <>
      <div className="scrim" onClick={close} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={kind === 'rate' ? 'Calificar' : 'Opciones'}>
        <div className="grab" />
        <div className="row" style={{ gap: 12, alignItems: 'center' }}>
          <Poster path={info.poster} title={info.title} size="w92" className="sheet-poster" />
          <div className="grow">
            <h3 className="clamp-2">{info.title}</h3>
            <div className="muted small">{info.year}</div>
          </div>
        </div>

        {kind === 'rate' ? (
          <>
            <p className="center muted" style={{ marginTop: 18 }}>
              ¿Qué te pareció?
            </p>
            <div className="center" style={{ marginTop: 8 }}>
              <Stars value={stars} onChange={pick} size={40} big />
            </div>
            <div className="rate-label">{ratingLabel(stars)}</div>
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
