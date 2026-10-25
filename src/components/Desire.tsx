import { useStore } from '../lib/store';
import { Icon } from './Icon';

export const DESIRE_LABELS = ['', 'Algún día', 'Tengo ganas', '¡Muchas ganas!'];

/** Ganas de ver una película de "Quiero ver", de 1 a 3 llamitas. Tocar el nivel actual lo quita. */
export function Desire({ k, size = 18, showLabel }: { k: string; size?: number; showLabel?: boolean }) {
  const level = useStore((s) => s.entries[k]?.desire);
  const setDesire = useStore((s) => s.setDesire);
  return (
    <span className="desire" role="group" aria-label={`Ganas de verla: ${level ? `${level} de 3` : 'sin nivel'}`}>
      {([1, 2, 3] as const).map((n) => (
        <button
          key={n}
          type="button"
          className={level && n <= level ? 'on' : ''}
          aria-label={`${n} de 3: ${DESIRE_LABELS[n]}`}
          aria-pressed={level === n}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDesire(k, level === n ? undefined : n);
          }}
        >
          <Icon name="flame" size={size} fill={!!level && n <= level} stroke={1.8} />
        </button>
      ))}
      {showLabel && <span className="desire-label">{level ? DESIRE_LABELS[level] : '¿Cuántas ganas tenés?'}</span>}
    </span>
  );
}
