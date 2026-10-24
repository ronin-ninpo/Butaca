import { Link } from 'react-router-dom';
import { ApiError } from '../lib/tmdb';
import { Icon } from './Icon';

export function Spinner() {
  return <div className="spinner" role="progressbar" aria-label="Cargando" />;
}

export function Empty({ icon = 'film', title, children }: { icon?: string; title: string; children?: React.ReactNode }) {
  return (
    <div className="empty">
      <div className="big">
        <Icon name={icon} size={28} />
      </div>
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function ErrorBox({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const keyProblem = error instanceof ApiError && (error.status === 401 || error.status === 0) && /clave/i.test(error.message);
  return (
    <div className="empty">
      <div className="big">
        <Icon name="info" size={28} />
      </div>
      <h3>No pudimos cargar esto</h3>
      <p>{error.message}</p>
      <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
        {onRetry && (
          <button className="btn small" onClick={onRetry}>
            <Icon name="refresh" size={16} /> Reintentar
          </button>
        )}
        {keyProblem && (
          <Link className="btn small primary" to="/ajustes">
            <Icon name="key" size={16} /> Revisar claves
          </Link>
        )}
      </div>
    </div>
  );
}

export function SkeletonGrid({ n = 9 }: { n?: number }) {
  return (
    <div className="grid">
      {Array.from({ length: n }, (_, i) => (
        <div key={i}>
          <div className="skel" style={{ aspectRatio: '2/3' }} />
          <div className="skel" style={{ height: 12, marginTop: 8, width: '80%' }} />
        </div>
      ))}
    </div>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: React.ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="tablist">
      {options.map((o) => (
        <button key={o.value} role="tab" aria-selected={o.value === value} className={o.value === value ? 'on' : ''} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return <button role="switch" aria-checked={on} aria-label={label} className={`switch ${on ? 'on' : ''}`} onClick={() => onChange(!on)} />;
}
