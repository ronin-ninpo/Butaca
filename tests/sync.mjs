// Prueba de la cuenta y la sincronización entre dispositivos, contra los emuladores de Firebase.
// Uso: npm run build && npx firebase emulators:start --only auth,firestore --project demo-butaca  (en otra terminal)
//      node tests/sync.mjs
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmdbHandler, omdbHandler, imageHandler } from './fixtures.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 4181;
const BASE = `http://localhost:${PORT}/`;
const EMU = '127.0.0.1';
const PROJECT = 'demo-butaca';
const SHOTS = process.env.SHOTS ?? 'capturas';
mkdirSync(SHOTS, { recursive: true });

const EMAIL = 'nico@butaca.app';
const PASS = 'secreto123';

// Emuladores limpios
await fetch(`http://${EMU}:8080/emulator/v1/projects/${PROJECT}/databases/(default)/documents`, { method: 'DELETE' });
await fetch(`http://${EMU}:9099/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((res, rej) => {
  server.stdout.on('data', (d) => String(d).includes(String(PORT)) && res());
  server.on('exit', (c) => rej(new Error('preview salió con ' + c)));
  setTimeout(() => rej(new Error('preview no arrancó')), 20000);
});

const browser = await chromium.launch();
const errors = [];

async function device(name) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: 'block', locale: 'es-AR' });
  await ctx.route('https://api.themoviedb.org/**', (route) => {
    const r = tmdbHandler(route.request().url(), route.request().headers());
    route.fulfill({ status: r.status ?? 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(r.body) });
  });
  await ctx.route('https://www.omdbapi.com/**', (route) => {
    const r = omdbHandler(route.request().url());
    route.fulfill({ status: r.status ?? 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(r.body) });
  });
  await ctx.route('https://image.tmdb.org/**', (route) => {
    const r = imageHandler(route.request().url());
    route.fulfill({ status: 200, contentType: r.contentType, body: r.body });
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(`[${name}] pageerror: ${e.message}`));
  page.on('console', (m) => m.type() === 'error' && errors.push(`[${name}] console: ${m.text()}`));
  await page.goto(BASE);
  await page.evaluate((emu) => localStorage.setItem('butaca.emulator', emu), EMU);
  return { ctx, page, name };
}

const snap = (id, title, extra = {}) => ({ type: 'movie', id, title, year: '2000', poster: null, genreIds: [18], directors: [], cast: [], ...extra });
const entry = (id, title, status, rating, t, extra = {}) => ({
  key: `movie:${id}`,
  status,
  rating,
  addedAt: t,
  seenAt: status === 'seen' ? t : undefined,
  updatedAt: t,
  snap: snap(id, title, extra),
});

async function seed(dev, state) {
  await dev.page.evaluate((s) => localStorage.setItem('butaca-library', JSON.stringify({ state: s, version: 1 })), state);
  await dev.page.reload();
}

const lib = (dev) => dev.page.evaluate(() => JSON.parse(localStorage.getItem('butaca-library') ?? '{}').state);
const ok = (msg) => console.log(`  ✓ ${msg}`);
const assert = (cond, msg) => {
  if (!cond) throw new Error('FALLÓ: ' + msg);
  ok(msg);
};
async function waitFor(dev, fn, arg, msg, timeout = 15000) {
  try {
    await dev.page.waitForFunction(fn, arg, { timeout, polling: 250 });
    ok(msg);
  } catch {
    throw new Error('FALLÓ (tiempo agotado): ' + msg);
  }
}
const hasEntry = ([key, pred]) => {
  const e = JSON.parse(localStorage.getItem('butaca-library') ?? '{}').state?.entries?.[key];
  return pred === 'absent' ? !e : !!e && (pred === 'any' || e.rating === pred);
};
async function rateInSheet(page, value) {
  await page.waitForSelector('.sheet .stars-input');
  await page.waitForTimeout(300);
  const b = await page.locator('.sheet .stars-input > span').nth(Math.ceil(value) - 1).boundingBox();
  await page.mouse.click(b.x + b.width * (value % 1 ? 0.25 : 0.75), b.y + b.height / 2);
  await page.click('.sheet button:has-text("Guardar")');
}
async function login(dev, mode) {
  await dev.page.goto(BASE + '#/cuenta');
  if (mode === 'signup') await dev.page.click('.segmented >> text=Crear cuenta');
  await dev.page.fill('#email', EMAIL);
  await dev.page.fill('#pass', PASS);
  if (mode === 'signup') await dev.page.fill('#pass2', PASS);
  await dev.page.click('form button[type=submit]');
}

let step = 0;
const shot = async (dev, name) => {
  await dev.page.waitForTimeout(300);
  await dev.page.screenshot({ path: `${SHOTS}/sync-${String(++step).padStart(2, '0')}-${name}.png` });
};

let pc, cel, nuevo;
try {
  const t0 = Date.now() - 86400000;
  console.log('PC: tiene listas locales y crea la cuenta');
  pc = await device('PC');
  await seed(pc, {
    entries: {
      'movie:603': entry(603, 'Matrix', 'seen', 5, t0, { cast: [{ id: 6384, name: 'Keanu Reeves' }] }),
      'movie:597': entry(597, 'Titanic', 'want', undefined, t0),
    },
    order: ['movie:603'],
    favActors: { 6384: { id: 6384, name: 'Keanu Reeves', profile: null, addedAt: t0 } },
    favDirectors: {},
    settings: { tmdbKey: 'test-key', omdbKey: 'omdb-key', region: 'AR', language: 'es-MX', includeTv: true },
  });
  await pc.page.goto(BASE + '#/ajustes');
  await pc.page.click('text=Ingresar o crear cuenta');
  await pc.page.waitForSelector('text=Con una cuenta');
  await shot(pc, 'ingresar');
  await login(pc, 'signup');
  await pc.page.waitForURL(/#\/$/);
  ok('crear cuenta lleva a «Para vos»');
  await pc.page.goto(BASE + '#/ajustes');
  await pc.page.waitForSelector('[data-sync="synced"]');
  ok('Ajustes muestra «Sincronizado» con el email');
  await shot(pc, 'ajustes-sincronizado');

  console.log('Celular: tiene OTRAS listas locales e ingresa con la misma cuenta');
  cel = await device('Celular');
  await seed(cel, {
    entries: {
      'movie:238': entry(238, 'El padrino', 'seen', 4.5, t0 + 1000),
      'movie:862': entry(862, 'Toy Story', 'seen', 3, t0 + 2000),
    },
    order: ['movie:238', 'movie:862'],
    favActors: {},
    favDirectors: { 1776: { id: 1776, name: 'Francis Ford Coppola', profile: null, addedAt: t0 } },
    settings: { tmdbKey: 'test-key', omdbKey: '', region: 'AR', language: 'es-MX', includeTv: true },
  });
  await login(cel, 'login');
  await cel.page.waitForURL(/#\/$/);
  let s = await lib(cel);
  assert(['movie:603', 'movie:597', 'movie:238', 'movie:862'].every((k) => s.entries[k]), 'el celular junta sus listas con las de la PC');
  assert(s.favActors[6384] && s.favDirectors[1776], 'también se juntan actores y directores favoritos');
  assert(s.settings.omdbKey === 'omdb-key', 'la clave de OMDb que faltaba en el celular llega desde la cuenta');
  await waitFor(pc, hasEntry, ['movie:238', 4.5], 'la PC recibe en vivo las películas del celular');
  await waitFor(pc, () => !!JSON.parse(localStorage.getItem('butaca-library')).state.favDirectors[1776], null, 'la PC recibe el director favorito del celular');

  console.log('Cambios en vivo');
  await cel.page.goto(BASE + '#/t/movie/105');
  await cel.page.click('.sbtn.seen');
  await rateInSheet(cel.page, 5);
  await waitFor(pc, hasEntry, ['movie:105', 5], 'calificar en el celular aparece en la PC');

  await pc.page.goto(BASE + '#/t/movie/597');
  await pc.page.click('.sbtn.want');
  await waitFor(cel, hasEntry, ['movie:597', 'absent'], 'quitar de «Quiero ver» en la PC se refleja en el celular');

  await pc.page.goto(BASE + '#/t/movie/238');
  await pc.page.click('.sbtn.seen');
  await pc.page.waitForTimeout(300);
  await pc.page.click('.sheet .legend-btn');
  await pc.page.click('.sheet button:has-text("Guardar")');
  await waitFor(cel, () => JSON.parse(localStorage.getItem('butaca-library')).state.entries['movie:238']?.legend === true, null, 'marcar Leyenda en la PC llega al celular');

  // Reordenar en el celular el grupo de 5 estrellas (Matrix y Volver al futuro)
  await cel.page.goto(BASE + '#/mis');
  await cel.page.waitForSelector('.group[data-group="5"] .mrow:nth-child(2)');
  const rows = cel.page.locator('.group[data-group="5"] .mrow');
  const before = await rows.locator('.t').allTextContents();
  const h1 = await rows.nth(1).locator('.handle').boundingBox();
  const h0 = await rows.nth(0).locator('.handle').boundingBox();
  await cel.page.mouse.move(h1.x + h1.width / 2, h1.y + h1.height / 2);
  await cel.page.mouse.down();
  for (let i = 1; i <= 12; i++) await cel.page.mouse.move(h1.x + h1.width / 2, h1.y + h1.height / 2 - ((h1.y - h0.y + 10) * i) / 12);
  await cel.page.mouse.up();
  const movedKey = (await lib(cel)).order.find((k) => k === 'movie:603' || k === 'movie:105');
  assert(movedKey && (await rows.locator('.t').first().textContent()) === before[1], `reordenar en el celular («${before[1]}» primero)`);
  await waitFor(
    pc,
    (k) => {
      const st = JSON.parse(localStorage.getItem('butaca-library')).state;
      return st.order.filter((x) => x === 'movie:603' || x === 'movie:105')[0] === k;
    },
    movedKey,
    'el nuevo orden del ranking llega a la PC',
  );
  await shot(cel, 'celular-mis-pelis');

  console.log('Sin conexión');
  await pc.ctx.setOffline(true);
  await pc.page.goto(BASE + '#/t/movie/13').catch(() => {});
  await pc.page.waitForSelector('.sbtn.want');
  await pc.page.click('.sbtn.want');
  await pc.page.goto(BASE + '#/ajustes');
  await pc.page.waitForSelector('[data-sync="offline"]');
  ok('sin internet la PC avisa que se sube cuando vuelva la conexión');
  await shot(pc, 'sin-conexion');
  await pc.ctx.setOffline(false);
  await pc.page.evaluate(() => window.dispatchEvent(new Event('online')));
  await waitFor(cel, hasEntry, ['movie:13', 'any'], 'al volver la conexión, lo marcado offline llega al celular', 30000);

  console.log('Con quién verla');
  await pc.page.goto(BASE + '#/mis/quiero');
  await pc.page.click('.mrow:has-text("Forrest Gump") .with-line');
  await pc.page.fill('.sheet input[aria-label="Nueva etiqueta"]', 'Belén');
  await pc.page.click('.sheet button:has-text("Agregar")');
  await pc.page.click('.sheet button:has-text("Listo")');
  await waitFor(
    cel,
    () => {
      const st = JSON.parse(localStorage.getItem('butaca-library')).state;
      return st.entries['movie:13']?.withWho?.includes('Belén') && st.companions.includes('Belén');
    },
    null,
    'la etiqueta «Belén» y su asignación llegan al celular',
  );

  console.log('Dispositivo nuevo, sin claves ni listas');
  nuevo = await device('Nuevo');
  await nuevo.page.goto(BASE);
  await nuevo.page.waitForURL(/bienvenida/);
  await nuevo.page.click('text=¿Ya usás Butaca en otro dispositivo?');
  await nuevo.page.waitForURL(/cuenta/);
  await nuevo.page.fill('#email', EMAIL);
  await nuevo.page.fill('#pass', 'otra-cosa');
  await nuevo.page.click('form button[type=submit]');
  await nuevo.page.waitForSelector('.err-msg');
  assert(/incorrectos|no es correcta/.test(await nuevo.page.textContent('.err-msg')), `contraseña mala: «${await nuevo.page.textContent('.err-msg')}»`);
  await nuevo.page.click('text=Olvidé mi contraseña');
  await nuevo.page.waitForSelector('.ok-msg');
  ok('«Olvidé mi contraseña» manda el mail de recuperación');
  await nuevo.page.fill('#pass', PASS);
  await nuevo.page.click('form button[type=submit]');
  await nuevo.page.waitForURL(/#\/$/);
  await nuevo.page.waitForSelector('.tabbar');
  s = await lib(nuevo);
  const pcState = await lib(pc);
  assert(s.settings.tmdbKey === 'test-key' && Object.keys(s.entries).length === Object.keys(pcState.entries).length, `el dispositivo nuevo baja claves y ${Object.keys(s.entries).length} títulos: entra directo sin cargar nada`);
  await nuevo.page.goto(BASE + '#/mis');
  await nuevo.page.waitForSelector('.group[data-group="L"]');
  await shot(nuevo, 'dispositivo-nuevo');

  console.log('Cerrar sesión borrando el dispositivo');
  nuevo.page.on('dialog', (d) => d.accept());
  await nuevo.page.goto(BASE + '#/cuenta');
  await nuevo.page.click('text=Cerrar sesión y borrar de este dispositivo');
  await nuevo.page.waitForURL(/bienvenida/);
  s = await lib(nuevo);
  assert(Object.keys(s.entries).length === 0 && !s.settings.tmdbKey, 'el dispositivo queda limpio (sin listas ni claves)');
  await pc.page.waitForTimeout(2500);
  assert(Object.keys((await lib(pc)).entries).length === Object.keys(pcState.entries).length, 'en la cuenta no se borró nada (la PC sigue igual)');

  console.log('Seguridad');
  const uid = await pc.page.evaluate(() => JSON.parse(localStorage.getItem('butaca.sync.meta')).uid);
  const other = await (
    await fetch(`http://${EMU}:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fake`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: 'intruso@ejemplo.com', password: 'intruso123', returnSecureToken: true }),
    })
  ).json();
  const base = `http://${EMU}:8080/v1/projects/${PROJECT}/databases/(default)/documents/users/${uid}`;
  const asOther = await fetch(`${base}/entries`, { headers: { Authorization: `Bearer ${other.idToken}` } });
  const anon = await fetch(`${base}/entries`);
  assert(asOther.status === 403 && anon.status === 403, `otra cuenta y alguien sin sesión NO pueden leer tus datos (${asOther.status}, ${anon.status})`);
  const write = await fetch(`${base}/entries/movie:1`, { method: 'PATCH', headers: { Authorization: `Bearer ${other.idToken}`, 'content-type': 'application/json' }, body: JSON.stringify({ fields: { key: { stringValue: 'x' } } }) });
  assert(write.status === 403, 'otra cuenta tampoco puede escribir en tus datos');
} catch (e) {
  console.error('\n' + e.message);
  for (const d of [pc, cel, nuevo].filter(Boolean)) await d.page.screenshot({ path: `${SHOTS}/sync-error-${d.name}.png` }).catch(() => {});
  process.exitCode = 1;
} finally {
  const real = errors.filter((e) => !/401|Failed to load resource|ERR_INTERNET_DISCONNECTED|net::ERR|offline|Could not reach Cloud Firestore|WebChannelConnection|Firestore.*transport errored/i.test(e));
  if (real.length) {
    console.error('\nErrores en consola:\n' + real.join('\n'));
    process.exitCode = 1;
  } else console.log('\nSin errores de JavaScript en la consola.');
  await browser.close();
  server.kill();
  process.exit(process.exitCode ?? 0);
}
