import { useStore } from '../lib/store';
import { useSheets, infoOf, type Target } from '../lib/sheets';
import { mark, toggleRewatch, unmark } from '../lib/actions';
import { keyOf } from '../lib/types';
import { Icon } from './Icon';
import { Stars } from './Stars';
import { Desire } from './Desire';

/** Los tres botones: Quiero verla / Ya la vi / No me interesa. */
export function StatusButtons({ target }: { target: Target }) {
  const info = infoOf(target);
  const k = keyOf(info.type, info.id);
  const e = useStore((s) => s.entries[k]);
  const openRate = useSheets((s) => s.openRate);
  const openWith = useSheets((s) => s.openWith);
  const st = e?.status;
  return (
    <>
      <div className="status-btns">
        <button className={`sbtn want ${st === 'want' ? 'on' : ''}`} aria-pressed={st === 'want'} onClick={() => (st === 'want' ? unmark(k) : mark(target, 'want'))}>
          <Icon name="bookmark" fill={st === 'want'} />
          Quiero verla
        </button>
        <button className={`sbtn seen ${st === 'seen' ? 'on' : ''}`} aria-pressed={st === 'seen'} onClick={() => openRate(target)}>
          <Icon name={st === 'seen' ? 'check' : 'eye'} />
          {st === 'seen' ? 'La vi' : 'Ya la vi'}
        </button>
        <button className={`sbtn skip ${st === 'skip' ? 'on' : ''}`} aria-pressed={st === 'skip'} onClick={() => (st === 'skip' ? unmark(k) : mark(target, 'skip'))}>
          <Icon name="ban" />
          No me interesa
        </button>
      </div>
      {st === 'want' && (
        <div className="card row" style={{ marginTop: 10, justifyContent: 'space-between' }}>
          <span className="muted small">Ganas de verla</span>
          <Desire k={k} size={22} showLabel />
        </div>
      )}
      {st === 'want' && (
        <button className="card row" style={{ marginTop: 10, width: '100%', textAlign: 'left' }} onClick={() => openWith(target)}>
          <Icon name="users" size={20} />
          <span className="grow small">
            {e?.withWho?.length ? (
              <>
                <span className="muted">Verla con </span>
                <b>{e.withWho.join(', ')}</b>
              </>
            ) : (
              <span className="muted">¿Con quién la querés ver?</span>
            )}
          </span>
          <Icon name="chevron" size={18} />
        </button>
      )}
      {st === 'seen' && (
        <button className="card row" style={{ marginTop: 10, width: '100%', justifyContent: 'space-between' }} onClick={() => openRate(target)}>
          <span className="muted small">{e?.rating || e?.legend || e?.classic ? 'Tu calificación' : 'Todavía no la calificaste'}</span>
          <span className="row wrap" style={{ gap: 10, justifyContent: 'flex-end' }}>
            {e?.legend && (
              <span className="legend-tag">
                <Icon name="crown" size={16} fill /> Leyenda
              </span>
            )}
            {e?.classic && (
              <span className="classic-tag">
                <Icon name="award" size={16} /> Clásico
              </span>
            )}
            <Stars value={e?.rating ?? 0} size={22} />
          </span>
        </button>
      )}
      {st === 'seen' && (
        <div className="card row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
          <button className={`chip ${e?.rewatch ? 'on' : ''}`} aria-pressed={!!e?.rewatch} onClick={() => toggleRewatch(k)}>
            <Icon name="repeat" size={16} /> Para volver a ver
          </button>
          {e?.rewatch && (
            <button className="grow small row" style={{ justifyContent: 'space-between', minWidth: 160 }} onClick={() => openWith(target)}>
              <span>
                {e.withWho?.length ? (
                  <>
                    <span className="muted">con </span>
                    <b>{e.withWho.join(', ')}</b>
                  </>
                ) : (
                  <span className="muted">¿Con quién?</span>
                )}
              </span>
              <Icon name="chevron" size={18} />
            </button>
          )}
        </div>
      )}
    </>
  );
}
