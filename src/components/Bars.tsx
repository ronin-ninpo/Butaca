import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Icon } from './Icon';
import { pendingInbox, useSocial } from '../lib/social';

export function TopBar({ title, back, right, brand }: { title: React.ReactNode; back?: boolean; right?: React.ReactNode; brand?: boolean }) {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);
  return (
    <header className={`topbar ${scrolled ? 'scrolled' : ''}`}>
      {back && (
        <button className="icon-btn ghost" aria-label="Volver" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/'))}>
          <Icon name="back" />
        </button>
      )}
      <h1 className={brand ? 'brand' : ''}>{title}</h1>
      {right}
    </header>
  );
}

/** Botones de la barra superior: Comunidad (con recomendaciones sin ver) y Ajustes. */
export function SettingsButton() {
  const pending = useSocial((s) => pendingInbox(s.inbox).length);
  return (
    <>
      <NavLink to="/comunidad" className="icon-btn badge-host" aria-label={pending ? `Comunidad: ${pending} recomendaciones nuevas` : 'Comunidad'}>
        <Icon name="users" size={20} />
        {pending > 0 && <span className="badge">{pending > 9 ? '9+' : pending}</span>}
      </NavLink>
      <NavLink to="/ajustes" className="icon-btn" aria-label="Ajustes">
        <Icon name="settings" size={20} />
      </NavLink>
    </>
  );
}

/** Avatar de una persona de la comunidad: su inicial sobre su color. */
export function UserAvatar({ name, color, size = 44 }: { name: string; color: string; size?: number }) {
  return (
    <span className="user-avatar" style={{ width: size, height: size, fontSize: size * 0.42, background: color }} aria-hidden="true">
      {name.trim()[0]?.toUpperCase() ?? '?'}
    </span>
  );
}

const TABS = [
  { to: '/', icon: 'sparkles', label: 'Para vos', end: true },
  { to: '/explorar', icon: 'compass', label: 'Explorar' },
  { to: '/cartelera', icon: 'ticket', label: 'Cartelera' },
  { to: '/mis', icon: 'clapper', label: 'Mis pelis' },
  { to: '/favoritos', icon: 'heart', label: 'Favoritos' },
];

export function TabBar() {
  return (
    <nav className="tabbar" aria-label="Secciones">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')}>
          <Icon name={t.icon} size={23} />
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
