import { useStore } from '../lib/store';
import { useSheets, infoOf, type Target } from '../lib/sheets';
import { mark, unmark } from '../lib/actions';
import { keyOf } from '../lib/types';
import { Icon } from './Icon';
import { Stars } from './Stars';

/** Los tres botones: Quiero verla / Ya la vi / No me interesa. */
export function StatusButtons({ target }: { target: Target }) {
  const info = infoOf(target);
  const k = keyOf(info.type, info.id);
  const e = useStore((s) => s.entries[k]);
  const openRate = useSheets((s) => s.openRate);
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
      {st === 'seen' && (
        <button className="card row" style={{ marginTop: 10, width: '100%', justifyContent: 'space-between' }} onClick={() => openRate(target)}>
          <span className="muted small">{e?.rating ? 'Tu calificación' : 'Todavía no la calificaste'}</span>
          <Stars value={e?.rating ?? 0} size={22} />
        </button>
      )}
    </>
  );
}
