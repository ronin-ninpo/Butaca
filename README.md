# Butaca 🎬

App para el celular (web instalable / PWA) para descubrir películas y series, al estilo del viejo Flixster:

- **Para vos**: recomendaciones según tus gustos, una por una, con tres botones (*Quiero verla*, *Ya la vi* con 1 a 5 estrellas, *No me interesa*). También se puede deslizar: a la derecha es *Quiero verla* y a la izquierda *Paso*. Cada recomendación explica por qué te la sugiere.
- **Explorar**: búsqueda de títulos y personas, y filtros por género, época, puntaje, plataforma y orden.
- **Cartelera**: lo que está en cines y los próximos estrenos en tu país.
- **Ficha**: título en español latino, sinopsis oficial sin spoilers, año, duración, calificación por edad, **nota de IMDb**, dirección, reparto, tráiler y dónde verla (Netflix, Prime, Disney+, Max, etc.).
- **Mis pelis**: vistas, *Quiero ver* y descartadas. Las vistas se ordenan por estrellas y **dentro de cada grupo de estrellas las podés arrastrar** para armar tu ranking.
- **Favoritos**: actores y directores marcados a mano, más un ranking automático según cómo calificaste lo que viste.
- **Cuenta opcional (email y contraseña)**: con sesión iniciada, listas, calificaciones, favoritos y claves se sincronizan entre la PC y el celular (Firebase). Sin cuenta, todo queda solo en el dispositivo. En Ajustes también hay respaldo para exportar e importar.
- Calificación de **½ a 5 estrellas** (1 a 10) y marca de **Leyenda** para las favoritas de siempre, que encabezan el ranking.

## Claves necesarias (gratis)

1. **TMDB** (obligatoria): creá una cuenta en https://www.themoviedb.org/signup, entrá a *Configuración → API* y pedí una clave "Developer". Sirve la *API Key* o el *Token de lectura*.
2. **OMDb** (opcional, para la nota de IMDb): https://www.omdbapi.com/apikey.aspx, plan FREE (1.000 consultas por día). Hay que activarla desde el mail. Sin esta clave la app muestra la nota de TMDB.

Las claves se cargan la primera vez que abrís la app y quedan solo en tu celular.

## Cuenta y sincronización (Firebase)

- Proyecto de Firebase: `butaca-27341` (plan gratuito Spark). La configuración web está en `src/lib/sync.ts`; no es secreta.
- **Authentication**: proveedor *Correo electrónico/contraseña* activado.
- **Firestore**: cada usuario guarda `users/{uid}` (orden del ranking, favoritos, ajustes y claves) y `users/{uid}/entries/{tipo:id}` (un documento por título). Las reglas de `firestore.rules` permiten leer y escribir solo al dueño; si se cambian, hay que pegarlas en la consola de Firebase (Firestore → Reglas).
- Al iniciar sesión se juntan las listas del dispositivo y de la nube (gana el cambio más reciente de cada título). Firebase se carga solo cuando hay sesión.

## Desarrollo

```bash
npm install
npm run dev        # servidor local
npm run build      # genera dist/ (lo que se publica)
npm run test:e2e   # prueba de punta a punta con TMDB/OMDb simulados (requiere build y Playwright)

# Sincronización entre dispositivos, contra los emuladores de Firebase (requiere Java):
npx firebase-tools emulators:start --only auth,firestore --project demo-butaca   # en otra terminal
npm run test:sync
```

## Publicar

`dist/` es un sitio estático: se puede subir a GitHub Pages, Netlify, Cloudflare Pages o Vercel. Usa rutas relativas y `#/` para la navegación, así que funciona en cualquier subcarpeta. Necesita HTTPS para poder instalarse en el celular.

**GitHub Pages:** el workflow `.github/workflows/deploy.yml` compila y publica en cada push a `main`. Hay que activar *Settings → Pages → Source: GitHub Actions* en el repositorio.

## Instalar en el celular

- **Android (Chrome):** abrí la página, menú ⋮ → *Instalar app*. Si aparece el botón *Instalar Butaca* en Ajustes, también sirve.
- **iPhone (Safari):** botón *Compartir* → *Agregar a inicio*.

---
Esta app usa la API de TMDB pero no está avalada ni certificada por TMDB. Disponibilidad en plataformas: JustWatch (vía TMDB). Nota de IMDb: OMDb API.
