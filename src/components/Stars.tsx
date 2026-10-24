import { Icon } from './Icon';

export function Stars({ value = 0, size = 14, onChange, big }: { value?: number; size?: number; onChange?: (v: number) => void; big?: boolean }) {
  const items = [1, 2, 3, 4, 5];
  if (!onChange) {
    return (
      <span className="stars" aria-label={`${value} de 5 estrellas`}>
        {items.map((i) => (
          <Icon key={i} name="star" size={size} fill={i <= value} className={i <= value ? '' : 'off'} stroke={i <= value ? 1.5 : 2} />
        ))}
      </span>
    );
  }
  return (
    <span className={`stars ${big ? 'big' : ''}`} role="radiogroup" aria-label="Calificación">
      {items.map((i) => (
        <button key={i} type="button" role="radio" aria-checked={i === value} aria-label={`${i} estrella${i > 1 ? 's' : ''}`} onClick={() => onChange(i)}>
          <Icon name="star" size={size} fill={i <= value} className={i <= value ? '' : 'off'} stroke={i <= value ? 1.5 : 2} />
        </button>
      ))}
    </span>
  );
}
