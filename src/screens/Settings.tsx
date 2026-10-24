import { useRef, useState } from 'react';
import { useStore, exportData } from '../lib/store';
import { clearCache } from '../lib/cache';
import { toast } from '../lib/toast';
import { isIos, isStandalone, useInstallPrompt } from '../lib/install';
import { TopBar } from '../components/Bars';
import { KeyForm } from '../components/KeyForm';
import { Switch } from '../components/Misc';
import { Icon } from '../components/Icon';
import { SyncBadge } from '../components/SyncBadge';
import { useSync } from '../lib/sync';
import { Link } from 'react-router-dom';

const REGIONS: [string, string][] = [
  ['AR', 'Argentina'],
  ['BO', 'Bolivia'],
  ['CL', 'Chile'],
  ['CO', 'Colombia'],
  ['CR', 'Costa Rica'],
  ['EC', 'Ecuador'],
  ['GT', 'Guatemala'],
  ['MX', 'México'],
  ['PA', 'Panamá'],
  ['PY', 'Paraguay'],
  ['PE', 'Perú'],
  ['DO', 'República Dominicana'],
  ['UY', 'Uruguay'],
  ['VE', 'Venezuela'],
];

export function Settings() {
  const settings = useStore((s) => s.settings);
  const update = useStore((s) => s.updateSettings);
  const importData = useStore((s) => s.importData);
  const resetAll = useStore((s) => s.resetAll);
  const entries = useStore((s) => s.entries);
  const [keysOpen, setKeysOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const install = useInstallPrompt();
  const account = useSync((s) => s.email);
  const n = Object.keys(entries).length;

  const doExport = async () => {
    const data = JSON.stringify(exportData());
    const name = `butaca-respaldo-${new Date().toISOString().slice(0, 10)}.json`;
    const file = new File([data], name, { type: 'application/json' });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Respaldo de Butaca' });
        return;
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  const doImport = async (f: File) => {
    try {
      const json = JSON.parse(await f.text());
      if (n > 0 && !confirm('Esto reemplaza tus listas actuales por las del respaldo. ¿Seguimos?')) return;
      importData(json);
      toast(`Respaldo importado: ${Object.keys(json.entries ?? {}).length} títulos.`);
    } catch (e) {
      toast((e as Error).message || 'No se pudo leer el archivo.');
    }
  };

  return (
    <>
      <TopBar title="Ajustes" back />
      <div className="page">
        <section className="section" style={{ marginTop: 6 }}>
          <h2 className="section-title">Cuenta y sincronización</h2>
          <Link to="/cuenta" className="card row" style={{ justifyContent: 'space-between' }}>
            <div className="grow">
              <div style={{ fontWeight: 650 }} className="ellipsis">
                {account ?? 'Ingresar o crear cuenta'}
              </div>
              {account ? <SyncBadge /> : <div className="muted small">Para tener tus listas en la PC y en el celular.</div>}
            </div>
            <Icon name="chevron" size={20} />
          </Link>
        </section>

        <section className="section">
          <h2 className="section-title">Claves de acceso</h2>
          <div className="card">
            <div className="row">
              <div className="grow small">
                <div>
                  TMDB: <b className={settings.tmdbKey ? 'ok-msg' : 'err-msg'}>{settings.tmdbKey ? 'configurada' : 'falta'}</b>
                </div>
                <div>
                  OMDb (IMDb): <b className={settings.omdbKey ? 'ok-msg' : 'muted'}>{settings.omdbKey ? 'configurada' : 'sin configurar'}</b>
                </div>
              </div>
              <button className="btn small" onClick={() => setKeysOpen((o) => !o)}>
                {keysOpen ? 'Cerrar' : 'Cambiar'}
              </button>
            </div>
            {keysOpen && <KeyForm onSaved={() => setKeysOpen(false)} />}
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Preferencias</h2>
          <div className="setting">
            <div className="grow">
              <div style={{ fontWeight: 650 }}>País</div>
              <div className="muted small">Para los títulos, la cartelera y dónde verla.</div>
            </div>
            <select className="input" style={{ width: 'auto' }} value={settings.region} onChange={(e) => update({ region: e.target.value })} aria-label="País">
              {REGIONS.map(([c, n]) => (
                <option key={c} value={c}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div className="setting">
            <div className="grow">
              <div style={{ fontWeight: 650 }}>Incluir series</div>
              <div className="muted small">Mostrar series además de películas.</div>
            </div>
            <Switch on={settings.includeTv} onChange={(v) => update({ includeTv: v })} label="Incluir series" />
          </div>
        </section>

        {!isStandalone() && (
          <section className="section">
            <h2 className="section-title">Instalar en el celular</h2>
            <div className="card small">
              {install.canPrompt ? (
                <button className="btn primary block" onClick={() => install.prompt()}>
                  <Icon name="phone" size={18} /> Instalar Butaca
                </button>
              ) : isIos() ? (
                <p>
                  En Safari tocá <b>Compartir</b> (el cuadrado con la flecha) y después <b>«Agregar a inicio»</b>. Queda como una app más.
                </p>
              ) : (
                <p>
                  En Chrome abrí el menú <b>⋮</b> y elegí <b>«Instalar app»</b> o <b>«Agregar a la pantalla principal»</b>.
                </p>
              )}
            </div>
          </section>
        )}

        <section className="section">
          <h2 className="section-title">Respaldo</h2>
          <p className="muted small">
            {account
              ? 'Tus listas ya se guardan en tu cuenta. Igual podés bajar una copia en un archivo cuando quieras. No incluye tus claves.'
              : 'Sin cuenta, tus listas viven solo en este dispositivo. Guardá un respaldo de vez en cuando (o para pasarlas a otro). No incluye tus claves.'}
          </p>
          <div className="row" style={{ marginTop: 10 }}>
            <button className="btn grow" onClick={doExport} disabled={n === 0}>
              <Icon name="download" size={18} /> Exportar
            </button>
            <button className="btn grow" onClick={() => fileRef.current?.click()}>
              <Icon name="upload" size={18} /> Importar
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) doImport(f);
                e.target.value = '';
              }}
            />
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Datos</h2>
          <div className="row wrap">
            <button
              className="btn small outline"
              onClick={async () => {
                await clearCache();
                toast('Caché borrada. Los datos se vuelven a descargar.');
              }}
            >
              <Icon name="refresh" size={16} /> Borrar caché
            </button>
            <button
              className="btn small outline danger"
              onClick={() => {
                if (confirm('¿Borrar todas tus listas, calificaciones y favoritos? No se puede deshacer.')) {
                  resetAll();
                  toast('Listo, empezás de cero.');
                }
              }}
            >
              <Icon name="trash" size={16} /> Borrar mis listas
            </button>
          </div>
        </section>

        <section className="section">
          <h2 className="section-title">Acerca de</h2>
          <p className="muted small">
            Datos de películas, series y personas: <b>TMDB</b>. Esta app usa la API de TMDB pero no está avalada ni certificada por TMDB. Disponibilidad en plataformas:{' '}
            <b>JustWatch</b> (vía TMDB). Nota de IMDb: <b>OMDb API</b>.
          </p>
          <p className="faint small" style={{ marginTop: 8 }}>
            Butaca 1.0
          </p>
        </section>
      </div>
    </>
  );
}
