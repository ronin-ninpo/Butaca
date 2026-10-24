// Prueba de punta a punta con TMDB/OMDb simulados. Uso: npm run build && node tests/e2e.mjs
import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmdbHandler, omdbHandler, imageHandler } from './fixtures.mjs';

const { chromium } = createRequire(import.meta.url)('playwright');
const PORT = 4179;
const BASE = `http://localhost:${PORT}/`;
const SHOTS = process.env.SHOTS ?? 'capturas';
mkdirSync(SHOTS, { recursive: true });

const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe' });
await new Promise((res, rej) => {
  server.stdout.on('data', (d) => String(d).includes(String(PORT)) && res());
  server.on('exit', (c) => rej(new Error('preview salió con ' + c)));
  setTimeout(() => rej(new Error('preview no arrancó')), 20000);
});

const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  serviceWorkers: 'block',
  locale: 'es-AR',
  acceptDownloads: true,
});
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
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('console: ' + m.text()));

let step = 0;
const ok = (msg) => console.log(`  ✓ ${msg}`);
const shot = async (name, full = false) => {
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/${String(++step).padStart(2, '0')}-${name}.png`, fullPage: full });
};
const assert = (cond, msg) => {
  if (!cond) throw new Error('FALLÓ: ' + msg);
  ok(msg);
};
const lib = () => page.evaluate(() => JSON.parse(localStorage.getItem('butaca-library') ?? '{}').state);
const cardTitle = () => page.locator('.rec-card h2').first().textContent();
/** Califica en la hoja abierta: toca la mitad izquierda (x,5) o derecha (entera) de la estrella y guarda. */
async function rateInSheet(value, legend = false, classic = false) {
  await page.waitForTimeout(300); // que termine la animación de la hoja
  const star = page.locator('.sheet .stars-input > span').nth(Math.ceil(value) - 1);
  const b = await star.boundingBox();
  await page.mouse.click(b.x + b.width * (value % 1 ? 0.25 : 0.75), b.y + b.height / 2);
  if (legend) await page.click('.sheet .legend-btn:not(.classic)');
  if (classic) await page.click('.sheet .legend-btn.classic');
  await page.click('.sheet button:has-text("Guardar")');
}
async function waitNewCard(prev) {
  await page.waitForFunction((p) => document.querySelector('.rec-card h2')?.textContent !== p, prev, { timeout: 8000 });
}

try {
  console.log('Bienvenida y claves');
  await page.goto(BASE);
  await page.waitForURL(/#\/bienvenida/);
  await shot('bienvenida');
  await page.fill('#tmdb', 'clave-mala');
  await page.click('text=Guardar claves');
  await page.waitForSelector('text=La clave de TMDB no es válida.');
  ok('rechaza una clave inválida');
  await page.fill('#tmdb', 'test-key');
  await page.fill('#omdb', 'omdb-key');
  await page.click('text=Guardar claves');
  await page.waitForSelector('.rec-card h2');
  assert(page.url().endsWith('#/'), 'con clave válida entra a Para vos');

  console.log('Recomendaciones (arranque en frío)');
  assert(await page.isVisible('text=Enseñame tus gustos'), 'muestra el aviso para calificar las primeras');
  await page.waitForSelector('.rec-card .rbadge .tag');
  assert((await page.locator('.rec-card .rbadge').first().textContent()).includes('IMDb'), 'la tarjeta muestra la nota de IMDb');
  await shot('para-vos-inicio');

  const ratings = [5, 4.5, 4, 5, 3, 2.5, 5];
  const LEGEND_AT = 3;
  const CLASSIC_AT = 4;
  let legendTitle, classicTitle;
  for (const [i, r] of ratings.entries()) {
    const prev = await cardTitle();
    if (i === LEGEND_AT) legendTitle = prev;
    if (i === CLASSIC_AT) classicTitle = prev;
    await page.click('button[aria-label="Ya la vi"]');
    await page.waitForSelector('.sheet');
    if (i === 1) {
      await page.waitForTimeout(300);
      const b = await page.locator('.sheet .stars-input > span').nth(3).boundingBox();
      await page.mouse.click(b.x + b.width * 0.25, b.y + b.height / 2);
      await page.click('.sheet .legend-btn:not(.classic)');
      await page.click('.sheet .legend-btn.classic');
      await shot('calificar');
      await page.click('.sheet .legend-btn:not(.classic)');
      await page.click('.sheet .legend-btn.classic');
    }
    await rateInSheet(r, i === LEGEND_AT, i === CLASSIC_AT);
    await waitNewCard(prev);
  }
  let s = await lib();
  const seenNow = Object.values(s.entries).filter((e) => e.status === 'seen');
  assert(seenNow.length === ratings.length, `${ratings.length} películas calificadas y guardadas`);
  assert(seenNow.some((e) => e.rating === 4.5) && seenNow.some((e) => e.rating === 2.5), 'se guardan las medias estrellas (4,5 y 2,5)');
  const leg = seenNow.find((e) => e.legend);
  assert(leg && leg.snap.title === legendTitle && leg.rating === 5, `«${legendTitle}» quedó marcada como Leyenda`);
  const cla = seenNow.filter((e) => e.classic);
  assert(cla.length === 1 && cla[0].snap.title === classicTitle && cla[0].rating === 3 && !cla[0].legend, `«${classicTitle}» quedó como Clásico con sus 3 estrellas (sin ser Leyenda)`);

  let prev = await cardTitle();
  await page.click('button[aria-label="Quiero verla"]');
  await waitNewCard(prev);
  assert((await page.locator('.toast').textContent()).includes('Quiero ver'), 'aviso de «agregada a Quiero ver»');
  prev = await cardTitle();
  await page.click('button[aria-label="No me interesa"]');
  await waitNewCard(prev);

  // Deslizar a la derecha = Quiero verla
  prev = await cardTitle();
  const box = await page.locator('.rec-card').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + 200);
  await page.mouse.down();
  for (let x = 0; x <= 220; x += 20) await page.mouse.move(box.x + box.width / 2 + x, box.y + 205);
  await page.mouse.up();
  await waitNewCard(prev);
  s = await lib();
  assert(Object.values(s.entries).some((e) => e.status === 'want' && e.snap.title === prev), `deslizar a la derecha agrega «${prev}» a Quiero ver`);

  // Deshacer
  prev = await cardTitle();
  await page.click('button[aria-label="Quiero verla"]');
  await waitNewCard(prev);
  await page.click('.toast button:has-text("Deshacer")');
  await page.waitForTimeout(300);
  s = await lib();
  assert(!Object.values(s.entries).some((e) => e.snap.title === prev), 'Deshacer revierte la última acción');

  prev = await cardTitle();
  await page.click('button[aria-label="Ahora no"]');
  await waitNewCard(prev);
  ok('«Ahora no» pasa a la siguiente sin marcarla');

  await page.click('button[aria-label="Actualizar recomendaciones"]');
  await page.waitForTimeout(600);
  await page.waitForSelector('.rec-card .reason');
  const reason = await page.locator('.rec-card .reason').textContent();
  assert(!(await page.isVisible('text=Enseñame tus gustos')), 'con 5+ calificaciones desaparece el aviso inicial');
  ok(`motivo de la recomendación: «${reason}»`);
  await shot('para-vos-personalizado');

  console.log('Filtro de géneros en recomendaciones');
  await page.click('.chips >> text=Ciencia ficción');
  await page.waitForTimeout(400);
  if (await page.isVisible('.rec-card')) {
    await page.click('.rec-card h2');
    await page.waitForSelector('.head h1');
    const genres = await page.locator('.genre-tags span').allTextContents();
    assert(genres.includes('Ciencia ficción'), `la recomendación filtrada es de ciencia ficción (${genres.join(', ')})`);
    await page.goBack();
  }
  await page.click('.chips >> text=Todos los géneros');

  console.log('Explorar');
  await page.click('.tabbar >> text=Explorar');
  await page.waitForSelector('.grid .mcard');
  await page.waitForSelector('.grid .rbadge .tag');
  await shot('explorar');
  await page.click('.chips >> text=Ciencia ficción');
  await page.waitForTimeout(500);
  const sci = await page.locator('.grid .mcard .t').allTextContents();
  assert(sci.includes('Matrix') && !sci.includes('Titanic'), `filtrar por género: ${sci.length} de ciencia ficción`);
  await page.click('button:has-text("Filtros")');
  await page.waitForSelector('.panel');
  await page.waitForSelector('.panel .chip img');
  await shot('explorar-filtros');
  await page.click('.panel >> text=Limpiar filtros');
  await page.click('.panel >> text=Listo');
  await page.fill('input[aria-label="Buscar"]', 'darin');
  await page.waitForSelector('.pcard:has-text("Ricardo Darín")');
  ok('buscar encuentra personas');
  await page.fill('input[aria-label="Buscar"]', 'matrix');
  await page.waitForSelector('.grid .mcard:has-text("Matrix")');
  await shot('buscar');

  console.log('Ficha');
  await page.click('.grid .mcard >> text=Matrix');
  await page.waitForSelector('.head h1:has-text("Matrix")');
  await page.waitForSelector('.head .rbadge .tag');
  const badge = await page.locator('.head .rbadge').textContent();
  assert(badge.includes('IMDb') && badge.includes('8.3'), `nota IMDb en la ficha (${badge})`);
  assert(await page.isVisible('text=Lana Wachowski'), 'muestra la dirección');
  assert(await page.isVisible('.people >> text=Keanu Reeves'), 'muestra el reparto');
  assert((await page.getAttribute('a:has-text("Ver tráiler")', 'href')).includes('youtube.com/watch'), 'botón de tráiler a YouTube');
  assert((await page.locator('.prov-logos img').count()) > 0, 'muestra dónde verla');
  await shot('ficha', true);
  const wasWant = await page.getAttribute('.sbtn.want', 'aria-pressed');
  await page.click('.status-btns >> text=Quiero verla');
  assert((await page.getAttribute('.sbtn.want', 'aria-pressed')) !== wasWant, 'el botón «Quiero verla» de la ficha alterna el estado');
  await page.click('.toast button:has-text("Deshacer")');
  assert((await page.getAttribute('.sbtn.want', 'aria-pressed')) === wasWant, 'Deshacer en la ficha vuelve al estado anterior');

  console.log('Persona');
  await page.click('.people >> text=Keanu Reeves');
  await page.waitForSelector('.topbar h1:has-text("Keanu Reeves")');
  await page.click('button:has-text("Actor favorito")');
  assert((await page.getAttribute('button:has-text("Actor favorito")', 'aria-pressed')) === 'true', 'marcar actor favorito');
  await shot('persona');

  console.log('Mis pelis');
  await page.goto(BASE + '#/mis');
  await page.waitForSelector('.group-head');
  await shot('mis-vistas');
  assert((await page.locator('.group').first().getAttribute('data-group')) === 'L', 'las leyendas aparecen primero en «Mis favoritas»');
  assert((await page.locator('.group[data-group="L"] .mrow .t').first().textContent()) === legendTitle, 'la leyenda es la #1 del ranking');
  assert((await page.locator('.group[data-group="4.5"] .mrow').count()) === 1, 'grupo propio para 4,5 estrellas');
  assert((await page.locator('.group[data-group="3"] .classic-tag').count()) === 1, 'el clásico muestra su medalla y sigue en su grupo de estrellas');
  await page.click('.chips .chip:has-text("Clásicos")');
  const onlyClassics = await page.locator('.mrow .t').allTextContents();
  assert(onlyClassics.length === 1 && onlyClassics[0] === classicTitle, 'el filtro «Clásicos» muestra solo los clásicos');
  await page.click('.chips .chip:has-text("Clásicos")');
  const groupRows = page.locator('.group[data-group="5"] .mrow');
  const before = await groupRows.locator('.t').allTextContents();
  assert(before.length >= 2, `grupo de 5 estrellas con ${before.length} películas`);
  const h1 = await groupRows.nth(1).locator('.handle').boundingBox();
  const h0 = await groupRows.nth(0).locator('.handle').boundingBox();
  await page.mouse.move(h1.x + h1.width / 2, h1.y + h1.height / 2);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(h1.x + h1.width / 2, h1.y + h1.height / 2 - ((h1.y - h0.y + 10) * i) / 12);
  await page.mouse.up();
  await page.waitForTimeout(400);
  const after = await groupRows.locator('.t').allTextContents();
  assert(after[0] === before[1] && after[1] === before[0], `arrastrar reordena dentro del grupo: «${after[0]}» ahora es la #1`);
  s = await lib();
  const firstKey = s.order.find((k) => s.entries[k]?.rating === 5 && !s.entries[k]?.legend);
  assert(s.entries[firstKey].snap.title === before[1], 'el nuevo orden queda guardado');
  await shot('mis-vistas-reordenadas');

  await page.selectOption('select[aria-label="Ordenar"]', 'imdb');
  const imdbVals = await page.locator('.mrow .rbadge').allTextContents();
  const nums = imdbVals.map((t) => parseFloat(t.replace(/[^\d.]/g, '')));
  assert(nums.every((n, i) => i === 0 || n <= nums[i - 1]), 'ordenar por nota de IMDb');
  await page.selectOption('select[aria-label="Ordenar"]', 'fav');

  // Cambiar calificación mueve de grupo
  await groupRows.nth(0).locator('button[aria-label="Cambiar calificación"]').click();
  await rateInSheet(3.5);
  await page.waitForTimeout(500);
  s = await lib();
  assert(Object.values(s.entries).find((e) => e.snap.title === before[1]).rating === 3.5, 'cambiar la calificación desde la lista (a 3,5)');
  assert((await page.locator('.group[data-group="3.5"] .mrow .t').allTextContents()).includes(before[1]), 'al cambiar la nota pasa al grupo nuevo');

  await page.click('.segmented >> text=Quiero ver');
  await page.waitForSelector('.mrow');
  await shot('quiero-ver');

  console.log('Con quién verla');
  const wantRows = page.locator('.mrow');
  assert((await wantRows.count()) >= 2, `${await wantRows.count()} películas en Quiero ver`);
  const t0 = await wantRows.nth(0).locator('.t').textContent();
  const t1 = await wantRows.nth(1).locator('.t').textContent();
  await wantRows.nth(0).locator('.with-line').click();
  await page.waitForSelector('.sheet input[aria-label="Nueva etiqueta"]');
  for (const name of ['Belén', 'Familia']) {
    await page.fill('.sheet input[aria-label="Nueva etiqueta"]', name);
    await page.click('.sheet button:has-text("Agregar")');
  }
  await page.fill('.sheet input[aria-label="Nueva etiqueta"]', '  belén ');
  await page.click('.sheet button:has-text("Agregar")');
  assert((await page.locator('.sheet .tag-grid .chip').count()) === 2, 'no se duplica una etiqueta escrita distinto («belén» = «Belén»)');
  assert((await page.locator('.sheet .tag-grid .chip[aria-pressed="true"]').count()) === 2, 'las etiquetas nuevas quedan elegidas');
  await shot('con-quien');
  await page.click('.sheet button:has-text("Listo")');
  await wantRows.nth(1).locator('.with-line').click();
  await page.click('.sheet .tag-grid .chip:has-text("Familia")');
  await page.click('.sheet button:has-text("Listo")');
  await page.waitForTimeout(300);
  assert((await wantRows.nth(0).locator('.with-line').textContent()).includes('Belén · Familia'), `«${t0}»: con Belén y Familia`);
  assert((await wantRows.nth(1).locator('.with-line').textContent()).includes('Familia'), `«${t1}»: con Familia`);
  await shot('quiero-ver-etiquetas');

  const filterChip = (name) => page.locator('[aria-label="Filtrar por con quién verla"] .chip', { hasText: name });
  await filterChip('Belén').click();
  assert((await wantRows.count()) === 1, 'filtrar por Belén muestra 1');
  await filterChip('Familia').click();
  assert((await wantRows.count()) === 2, 'filtrar por Familia muestra 2');
  await filterChip('Sin asignar').click();
  assert((await wantRows.count()) === 0 && (await page.isVisible('text=No hay películas con esos filtros')), 'filtrar «Sin asignar» muestra 0');
  await filterChip('Cualquiera').click();

  await wantRows.nth(0).locator('.with-line').click();
  await page.click('.sheet >> text=Editar etiquetas');
  const belen = page.locator('.sheet input[aria-label="Nombre de la etiqueta Belén"]');
  await belen.fill('Belu');
  await belen.press('Enter');
  page.once('dialog', (d) => d.accept());
  await page.click('.sheet button[aria-label="Borrar la etiqueta Familia"]');
  await page.click('.sheet button:has-text("Volver")');
  await page.click('.sheet button:has-text("Listo")');
  s = await lib();
  const tagged = Object.values(s.entries).filter((e) => e.withWho?.length);
  assert(JSON.stringify(s.companions) === '["Belu"]' && tagged.length === 1 && tagged[0].withWho.join() === 'Belu', 'renombrar y borrar etiquetas actualiza todas las películas');

  await page.click('.mrow >> nth=0 >> button:has-text("La vi")');
  await rateInSheet(4);
  await page.waitForTimeout(300);
  s = await lib();
  assert(Object.values(s.entries).find((e) => e.snap.title === t0)?.withWho?.[0] === 'Belu', 'al marcarla como vista conserva con quién');
  await page.click('.segmented >> text=Quiero ver');

  console.log('Favoritos');
  await page.click('.tabbar >> text=Favoritos');
  await page.waitForSelector('.mrow:has-text("Keanu Reeves")');
  ok('Keanu Reeves aparece en mis favoritos');
  const autoCount = await page.locator('section:has-text("Según tus calificaciones") .mrow').count();
  assert(autoCount > 0, `${autoCount} actores sugeridos según calificaciones`);
  await shot('favoritos-actores');
  await page.click('.segmented >> text=Directores');
  await page.waitForSelector('section:has-text("Según tus calificaciones") .mrow');
  await shot('favoritos-directores');

  console.log('Cartelera');
  await page.click('.tabbar >> text=Cartelera');
  await page.waitForSelector('.mrow:has-text("La última función")');
  await shot('cartelera');
  await page.click('.segmented >> text=Próximos estrenos');
  await page.waitForSelector('.mrow:has-text("Marea alta")');
  assert(await page.isVisible('text=Estrena'), 'próximos estrenos con fecha');
  assert(!(await page.isVisible('.mrow:has-text("La última función")')), 'próximos estrenos no incluye lo que ya está en cines');

  console.log('Series');
  await page.click('.tabbar >> text=Explorar');
  await page.fill('input[aria-label="Buscar"]', '');
  await page.click('.segmented >> text=Series');
  await page.waitForSelector('.grid .mcard:has-text("Breaking Bad")');
  await page.click('.grid .mcard >> text=Breaking Bad');
  await page.waitForSelector('.head h1:has-text("Breaking Bad")');
  assert(await page.isVisible('text=Creada por'), 'las series muestran «Creada por»');
  assert(await page.isVisible('text=temporadas'), 'las series muestran temporadas');
  await shot('serie');

  console.log('Ajustes y respaldo');
  await page.goto(BASE + '#/ajustes');
  await page.waitForSelector('text=Respaldo');
  await shot('ajustes', true);
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Exportar")')]);
  const backup = JSON.parse(readFileSync(await dl.path(), 'utf8'));
  s = await lib();
  assert(Object.keys(backup.entries).length === Object.keys(s.entries).length && !JSON.stringify(backup).includes('test-key'), 'el respaldo exporta todo y no incluye las claves');

  await page.reload();
  await page.goto(BASE + '#/mis');
  await page.waitForSelector('.group-head');
  ok('los datos persisten al recargar');

  // Importar el respaldo en un celular "nuevo"
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
  await ctx2.route('https://**/*', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{}' }));
  const p2 = await ctx2.newPage();
  await p2.goto(BASE);
  await p2.evaluate(() => localStorage.setItem('butaca-library', JSON.stringify({ state: { settings: { tmdbKey: 'test-key' } }, version: 1 })));
  await p2.goto(BASE + '#/ajustes');
  await p2.reload();
  await p2.setInputFiles('input[type=file]', await dl.path());
  await p2.waitForTimeout(400);
  const imported = await p2.evaluate(() => JSON.parse(localStorage.getItem('butaca-library')).state);
  assert(Object.keys(imported.entries).length === Object.keys(s.entries).length && imported.order.length === s.order.length, 'importar el respaldo en otro celular');
  await ctx2.close();
} catch (e) {
  console.error('\n' + e.message);
  await page.screenshot({ path: `${SHOTS}/error.png` });
  process.exitCode = 1;
} finally {
  const real = errors.filter((e) => !/401|Failed to load resource/.test(e));
  if (real.length) {
    console.error('\nErrores en consola:\n' + real.join('\n'));
    process.exitCode = 1;
  } else console.log('\nSin errores de JavaScript en la consola.');
  await browser.close();
  server.kill();
  process.exit(process.exitCode ?? 0);
}
