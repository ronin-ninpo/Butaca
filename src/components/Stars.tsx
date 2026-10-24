import { useRef } from 'react';
import { Icon } from './Icon';

function Star({ fill, size }: { fill: number; size: number }) {
  return (
    <span className="star" style={{ width: size, height: size }}>
      <Icon name="star" size={size} className="off" />
      {fill > 0 && (
        <span className="star-fill" style={{ width: fill >= 1 ? '100%' : '50%' }}>
          <Icon name="star" size={size} fill stroke={1.5} />
        </span>
      )}
    </span>
  );
}

const fillOf = (value: number, i: number) => Math.max(0, Math.min(1, value - (i - 1)));

/**
 * Estrellas de 0,5 a 5. Sin onChange solo muestran el valor.
 * Con onChange: se toca la mitad izquierda (media) o derecha (entera) de cada estrella, o se desliza el dedo.
 */
export function Stars({ value = 0, size = 14, onChange, big }: { value?: number; size?: number; onChange?: (v: number) => void; big?: boolean }) {
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  const dragging = useRef(false);
  const items = [1, 2, 3, 4, 5];

  if (!onChange) {
    return (
      <span className="stars" aria-label={`${value.toLocaleString('es-AR')} de 5 estrellas`}>
        {items.map((i) => (
          <Star key={i} fill={fillOf(value, i)} size={size} />
        ))}
      </span>
    );
  }

  const valueAt = (x: number) => {
    const rects = refs.current.map((el) => el?.getBoundingClientRect());
    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      if (!r) continue;
      const next = rects[i + 1];
      const end = next ? (r.right + next.left) / 2 : Infinity;
      if (x < end) return i + (x < r.left + r.width / 2 ? 0.5 : 1);
    }
    return 5;
  };

  return (
    <span
      className={`stars stars-input ${big ? 'big' : ''}`}
      role="slider"
      tabIndex={0}
      aria-label="Calificación"
      aria-valuemin={0.5}
      aria-valuemax={5}
      aria-valuenow={value || undefined}
      aria-valuetext={value ? `${value.toLocaleString('es-AR')} estrellas` : 'Sin calificar'}
      onPointerDown={(e) => {
        dragging.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        onChange(valueAt(e.clientX));
      }}
      onPointerMove={(e) => {
        if (dragging.current) {
          const v = valueAt(e.clientX);
          if (v !== value) onChange(v);
        }
      }}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') onChange(Math.min(5, (value || 0) + 0.5));
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') onChange(Math.max(0.5, (value || 1) - 0.5));
        else return;
        e.preventDefault();
      }}
    >
      {items.map((i) => (
        <span key={i} ref={(el) => (refs.current[i - 1] = el)}>
          <Star fill={fillOf(value, i)} size={size} />
        </span>
      ))}
    </span>
  );
}
