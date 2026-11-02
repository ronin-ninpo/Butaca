# Butaca — guía para trabajar en el proyecto

App web instalable (PWA) de películas y series al estilo del viejo Flixster, para uso personal y de amigos. Se publica en https://ronin-ninpo.github.io/Butaca/ con GitHub Pages: cada push a `main` compila y publica solo (`.github/workflows/deploy.yml`).

## Comandos

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # chequea tipos (tsc) y genera dist/
npm run test:e2e   # prueba de punta a punta con TMDB/OMDb simulados
npm run test:sync  # cuenta, sincronización y Comunidad contra los emuladores de Firebase
```

- Las pruebas usan Playwright con Chromium y corren sobre `dist/` (hacer `npm run build` antes). Si no está instalado: `npm i -D playwright && npx playwright install chromium`.
- `test:sync` necesita los emuladores andando en otra terminal (requiere Java 21): `npx firebase-tools emulators:start --only auth,firestore --project demo-butaca`. Usan `firestore.rules` del repo.
- Las pruebas son el control de calidad: correr las dos antes de subir cambios de lógica. Ninguna toca servicios reales.

## Cómo está armado

- React 18 + TypeScript + Vite, `vite-plugin-pwa`, rutas con `createHashRouter` (todo cuelga de `#/`, por eso funciona en la subcarpeta de GitHub Pages). Estado con zustand.
- `src/lib/store.ts`: listas del usuario (persistidas en `localStorage`, clave `butaca-library`). Cada título es un `Entry` con `status` (`want` | `seen` | `skip` | `later`), estrellas de 0,5 a 5, marcas `legend`/`classic`/`rewatch`, ganas 1–3 (`desire`), etiquetas de con quién (`withWho`), reflexión (`review`, `reviewShared`) y `updatedAt` para sincronizar.
- `src/lib/tmdb.ts` y `src/lib/omdb.ts`: datos de películas (cada usuario carga sus propias claves en Ajustes; no hay claves en el código). Caché en IndexedDB (`src/lib/cache.ts`).
- `src/lib/recommend.ts`: recomendaciones de «Para vos» a partir de calificaciones, leyendas, favoritos y géneros.
- `src/lib/sync.ts` + `src/lib/syncMerge.ts`: cuenta con email y contraseña y sincronización con Firebase (Auth + Firestore). Firebase se carga recién cuando hay sesión.
- `src/lib/social.ts`: Comunidad (perfiles públicos opcionales, personas, recomendaciones entre usuarios, reflexiones compartidas).
- Pantallas en `src/screens/`, componentes en `src/components/`, estilos en `src/styles.css` (tema oscuro, variables en `:root`).

## Firebase

- Proyecto `butaca-27341` (plan gratuito). La configuración web está en `src/lib/sync.ts` y no es secreta.
- Datos: `users/{uid}` y `users/{uid}/entries/*` (privados), `profiles/{uid}` y `profiles/{uid}/data/library` (perfil público), `inbox/{uid}/items/*` (recomendaciones recibidas).
- **Las reglas viven en `firestore.rules`, pero Firebase no las toma del repo:** si se cambian, hay que pegarlas a mano en la consola (Firestore → Reglas → Publicar) y avisarle al usuario.

## Preferencias del usuario

- Toda la interfaz en español rioplatense (voseo), con textos claros para alguien que no programa.
- **Nada de APIs pagas** (se descartó una búsqueda por descripción con IA por ese motivo).
- En la PC está bien que la app ocupe todo el ancho.
- Privacidad: nunca mostrar email, claves ni la lista de «Quiero ver» en el perfil público; lo social es opcional.
- Antes de subir: `npm run build` y las pruebas. Los commits los firma el usuario (`ronin-ninpo`, email `347563427+ronin-ninpo@users.noreply.github.com`), no su Gmail.
