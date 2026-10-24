import { useState } from 'react';
import { img } from '../lib/tmdb';

export function Poster({ path, title, size = 'w342', className = '', children }: { path?: string | null; title: string; size?: 'w92' | 'w154' | 'w185' | 'w342' | 'w500'; className?: string; children?: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  const src = img(path, size);
  return (
    <div className={`poster ${className}`}>
      {src && !failed ? <img src={src} alt={title} loading="lazy" decoding="async" onError={() => setFailed(true)} /> : <div className="ph">{title}</div>}
      {children}
    </div>
  );
}

export function Avatar({ path, name, className = '' }: { path?: string | null; name: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const src = img(path, 'w185');
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
  return <div className={`avatar ${className}`}>{src && !failed ? <img src={src} alt={name} loading="lazy" onError={() => setFailed(true)} /> : initials}</div>;
}
