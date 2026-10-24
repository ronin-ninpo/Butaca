import { useSync } from '../lib/sync';

const TEXT = {
  off: 'Sin sesión: tus listas están solo en este dispositivo',
  loading: 'Conectando con tu cuenta…',
  synced: 'Sincronizado',
  syncing: 'Guardando en la nube…',
  offline: 'Sin conexión: se sube cuando vuelva internet',
  error: 'Error al sincronizar',
};

/** Estado de la sincronización con la nube, en una línea. */
export function SyncBadge() {
  const { status, error } = useSync();
  const color = status === 'synced' ? 'var(--seen)' : status === 'error' ? 'var(--danger)' : status === 'off' ? 'var(--faint)' : 'var(--gold)';
  return (
    <div className="small" style={{ color, display: 'flex', alignItems: 'center', gap: 6 }} role="status" data-sync={status}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flex: 'none' }} />
      <span>
        {TEXT[status]}
        {status === 'error' && error ? `: ${error}` : ''}
      </span>
    </div>
  );
}
