// Datos de prueba y un TMDB/OMDb simulado para correr la app sin internet.
const P = (id, name) => ({ id, name });
const people = {
  wachowskiL: P(9339, 'Lana Wachowski'), wachowskiLi: P(9340, 'Lilly Wachowski'), keanu: P(6384, 'Keanu Reeves'), fishburne: P(2975, 'Laurence Fishburne'),
  moss: P(530, 'Carrie-Anne Moss'), weaving: P(1331, 'Hugo Weaving'), lasseter: P(7879, 'John Lasseter'), hanks: P(31, 'Tom Hanks'), allen: P(12898, 'Tim Allen'),
  coppola: P(1776, 'Francis Ford Coppola'), brando: P(3084, 'Marlon Brando'), pacino: P(1158, 'Al Pacino'), caan: P(3085, 'James Caan'),
  zemeckis: P(24, 'Robert Zemeckis'), fox: P(521, 'Michael J. Fox'), lloyd: P(1062, 'Christopher Lloyd'), cameron: P(2710, 'James Cameron'),
  dicaprio: P(6193, 'Leonardo DiCaprio'), winslet: P(204, 'Kate Winslet'), bong: P(21684, 'Bong Joon-ho'), song: P(20738, 'Song Kang-ho'),
  szifron: P(1006721, 'Damián Szifron'), darin: P(69310, 'Ricardo Darín'), rivas: P(1052109, 'Érica Rivas'), sbaraglia: P(59129, 'Leonardo Sbaraglia'),
  campanella: P(1001001, 'Juan José Campanella'), villamil: P(1001005, 'Soledad Villamil'), francella: P(1001006, 'Guillermo Francella'),
  nolan: P(525, 'Christopher Nolan'), mcconaughey: P(10297, 'Matthew McConaughey'), hathaway: P(1813, 'Anne Hathaway'), chastain: P(83002, 'Jessica Chastain'),
  jgl: P(24045, 'Joseph Gordon-Levitt'), page: P(27578, 'Elliot Page'), tarantino: P(138, 'Quentin Tarantino'), travolta: P(8891, 'John Travolta'),
  jackson: P(2231, 'Samuel L. Jackson'), thurman: P(139, 'Uma Thurman'), wright: P(32, 'Robin Wright'), bale: P(3894, 'Christian Bale'), ledger: P(1810, 'Heath Ledger'),
  darabont: P(4027, 'Frank Darabont'), robbins: P(504, 'Tim Robbins'), freeman: P(192, 'Morgan Freeman'), miyazaki: P(608, 'Hayao Miyazaki'),
  rscott: P(578, 'Ridley Scott'), crowe: P(934, 'Russell Crowe'), phoenix: P(73421, 'Joaquin Phoenix'), spielberg: P(488, 'Steven Spielberg'),
  neill: P(4783, 'Sam Neill'), dern: P(4784, 'Laura Dern'), goldblum: P(4785, 'Jeff Goldblum'), villeneuve: P(137427, 'Denis Villeneuve'),
  chalamet: P(1190668, 'Timothée Chalamet'), zendaya: P(505710, 'Zendaya'), murphy: P(2037, 'Cillian Murphy'), blunt: P(5081, 'Emily Blunt'),
  gerwig: P(45400, 'Greta Gerwig'), robbie: P(234352, 'Margot Robbie'), gosling: P(30614, 'Ryan Gosling'), pjackson: P(108, 'Peter Jackson'),
  wood: P(109, 'Elijah Wood'), mckellen: P(1327, 'Ian McKellen'), scorsese: P(1032, 'Martin Scorsese'), deniro: P(380, 'Robert De Niro'),
  liotta: P(11477, 'Ray Liotta'), mann: P(1001010, 'Kelsey Mann'), poehler: P(56322, 'Amy Poehler'), fincher: P(7467, 'David Fincher'),
  pitt: P(287, 'Brad Pitt'), norton: P(819, 'Edward Norton'), gilligan: P(66633, 'Vince Gilligan'), cranston: P(17419, 'Bryan Cranston'),
  paul: P(84497, 'Aaron Paul'), benioff: P(9813, 'David Benioff'), weiss: P(228068, 'D. B. Weiss'), clarke: P(1223786, 'Emilia Clarke'),
  harington: P(239019, 'Kit Harington'), duffer: P(1179422, 'Matt Duffer'), ryder: P(10205, 'Winona Ryder'), harbour: P(35029, 'David Harbour'),
  mazin: P(1001020, 'Craig Mazin'), pascal: P(1253360, 'Pedro Pascal'), ramsey: P(1001021, 'Bella Ramsey'), dirA: P(1001030, 'Lucía Puenzo'),
  dirB: P(1001031, 'Mariano Cohn'), actA: P(1001032, 'Dolores Fonzi'), actB: P(1001033, 'Peter Lanzani'),
};
const { wachowskiL, wachowskiLi, keanu, fishburne, moss, weaving } = people;
const p = people;

const M = (id, title, original, date, genres, director, cast, overview, score, votes, pop) => ({
  type: 'movie', id, title, original, date, genres, directors: [].concat(director), cast, overview, score, votes, pop,
});
const today = new Date();
const plus = (d) => new Date(today.getTime() + d * 86400000).toISOString().slice(0, 10);

export const movies = [
  M(603, 'Matrix', 'The Matrix', '1999-03-31', [28, 878], [wachowskiL, wachowskiLi], [keanu, fishburne, moss, weaving], 'Un programador que de noche es hacker descubre, de la mano de un grupo de rebeldes, que el mundo en el que vive no es lo que parece.', 8.2, 26000, 90),
  M(862, 'Toy Story', 'Toy Story', '1995-11-22', [16, 35, 10751], p.lasseter, [p.hanks, p.allen], 'Los juguetes de Andy cobran vida cuando nadie los ve. La llegada de un flamante guardián espacial pone en jaque el lugar de Woody como el favorito.', 8.0, 18000, 80),
  M(238, 'El padrino', 'The Godfather', '1972-03-14', [18, 80], p.coppola, [p.brando, p.pacino, p.caan], 'La historia de los Corleone, una poderosa familia de la mafia neoyorquina, y del hijo menor que nunca quiso formar parte del negocio familiar.', 8.7, 20000, 85),
  M(105, 'Volver al futuro', 'Back to the Future', '1985-07-03', [12, 35, 878], p.zemeckis, [p.fox, p.lloyd], 'Un adolescente viaja accidentalmente treinta años al pasado en un auto convertido en máquina del tiempo y debe encontrar la forma de volver.', 8.3, 19000, 70),
  M(597, 'Titanic', 'Titanic', '1997-11-18', [18, 10749], p.cameron, [p.dicaprio, p.winslet], 'A bordo del transatlántico más famoso de la historia, un joven artista sin dinero y una muchacha de la alta sociedad se conocen y se enamoran.', 7.9, 24000, 95),
  M(496243, 'Parásitos', '기생충', '2019-05-30', [35, 53, 18], p.bong, [p.song], 'Una familia sin trabajo empieza a infiltrarse, uno por uno, en la vida de una familia adinerada.', 8.5, 17000, 60),
  M(265195, 'Relatos salvajes', 'Relatos salvajes', '2014-08-21', [18, 53, 35], p.szifron, [p.darin, p.rivas, p.sbaraglia], 'Seis historias independientes sobre personas que, empujadas al límite, pierden el control.', 8.1, 4000, 40),
  M(25376, 'El secreto de sus ojos', 'El secreto de sus ojos', '2009-08-13', [80, 18, 9648], p.campanella, [p.darin, p.villamil, p.francella], 'Un empleado judicial retirado decide escribir una novela sobre un caso que lo marcó hace veinticinco años y que nunca pudo olvidar.', 7.9, 3000, 35),
  M(157336, 'Interestelar', 'Interstellar', '2014-11-05', [12, 18, 878], p.nolan, [p.mcconaughey, p.hathaway, p.chastain], 'Con la Tierra al borde del colapso, un grupo de exploradores emprende un viaje a través de un agujero de gusano en busca de un nuevo hogar para la humanidad.', 8.4, 35000, 120),
  M(27205, 'El origen', 'Inception', '2010-07-15', [28, 878, 12], p.nolan, [p.dicaprio, p.jgl, p.page], 'Un ladrón especializado en robar secretos de la mente mientras la gente sueña recibe un encargo distinto: implantar una idea.', 8.4, 36000, 110),
  M(680, 'Tiempos violentos', 'Pulp Fiction', '1994-09-10', [53, 80], p.tarantino, [p.travolta, p.jackson, p.thurman], 'Las vidas de dos sicarios, un boxeador, un mafioso y su esposa se cruzan en una serie de historias de violencia y humor negro en Los Ángeles.', 8.5, 27000, 75),
  M(13, 'Forrest Gump', 'Forrest Gump', '1994-06-23', [35, 18, 10749], p.zemeckis, [p.hanks, p.wright], 'Un hombre bondadoso de Alabama atraviesa, casi sin proponérselo, algunos de los momentos más importantes de la historia de su país.', 8.5, 27000, 85),
  M(155, 'Batman: El caballero de la noche', 'The Dark Knight', '2008-07-16', [18, 28, 80, 53], p.nolan, [p.bale, p.ledger], 'Batman enfrenta a un nuevo y caótico enemigo que pone a prueba los límites entre la justicia y la venganza en Ciudad Gótica.', 8.5, 32000, 100),
  M(278, 'Sueños de libertad', 'The Shawshank Redemption', '1994-09-23', [18, 80], p.darabont, [p.robbins, p.freeman], 'Un banquero condenado a cadena perpetua forja una amistad duradera con otro preso mientras intenta mantener la esperanza.', 8.7, 27000, 90),
  M(129, 'El viaje de Chihiro', '千と千尋の神隠し', '2001-07-20', [16, 10751, 14], p.miyazaki, [], 'Una niña queda atrapada en un mundo mágico de espíritus y debe trabajar en una casa de baños para encontrar la manera de rescatar a sus padres.', 8.5, 16000, 70),
  M(98, 'Gladiador', 'Gladiator', '2000-05-01', [28, 18, 12], p.rscott, [p.crowe, p.phoenix], 'Un general romano traicionado y reducido a la esclavitud se convierte en gladiador y busca justicia en el corazón del Imperio.', 8.2, 19000, 80),
  M(329, 'Jurassic Park', 'Jurassic Park', '1993-06-11', [12, 878], p.spielberg, [p.neill, p.dern, p.goldblum], 'Un grupo de expertos visita un parque temático en una isla donde se recrearon dinosaurios a partir de ADN antiguo.', 7.9, 16000, 75),
  M(693134, 'Duna: Parte dos', 'Dune: Part Two', '2024-02-27', [878, 12], p.villeneuve, [p.chalamet, p.zendaya], 'Paul Atreides se une a los Fremen del desierto de Arrakis mientras busca su lugar en una guerra que puede cambiar el destino del universo.', 8.1, 6000, 150),
  M(872585, 'Oppenheimer', 'Oppenheimer', '2023-07-19', [18, 36], p.nolan, [p.murphy, p.blunt], 'La historia del físico J. Robert Oppenheimer y su papel en el desarrollo de la bomba atómica durante la Segunda Guerra Mundial.', 8.1, 9000, 140),
  M(346698, 'Barbie', 'Barbie', '2023-07-19', [35, 12], p.gerwig, [p.robbie, p.gosling], 'Barbie vive feliz en Barbieland hasta que empieza a hacerse preguntas que la llevan al mundo real.', 7.0, 9000, 130),
  M(120, 'El Señor de los Anillos: La Comunidad del Anillo', 'The Lord of the Rings: The Fellowship of the Ring', '2001-12-18', [12, 14, 28], p.pjackson, [p.wood, p.mckellen], 'Un joven hobbit recibe un anillo de poder y emprende, junto a ocho compañeros, un peligroso viaje para destruirlo.', 8.4, 24000, 95),
  M(769, 'Buenos muchachos', 'GoodFellas', '1990-09-12', [18, 80], p.scorsese, [p.deniro, p.liotta], 'Desde chico, Henry Hill soñó con ser un gánster. Tres décadas dentro de la mafia de Nueva York.', 8.5, 12000, 55),
  M(1022789, 'Intensa-Mente 2', 'Inside Out 2', '2024-06-11', [16, 10751, 35], p.mann, [p.poehler], 'Riley entra en la adolescencia y en su mente aparecen emociones nuevas que no están dispuestas a compartir el espacio.', 7.6, 5000, 160),
  M(550, 'El club de la pelea', 'Fight Club', '1999-10-15', [18], p.fincher, [p.pitt, p.norton], 'Un oficinista insomne y un carismático vendedor de jabón fundan un club clandestino que se transforma en algo mucho más grande.', 8.4, 29000, 80),
  M(9000001, 'La última función', 'La última función', plus(-10), [18, 35], p.dirA, [p.actA, p.darin], 'El dueño de un viejo cine de barrio organiza una despedida a lo grande antes de que cierre para siempre.', 7.4, 120, 50),
  M(9000002, 'Ruta 40', 'Ruta 40', plus(-3), [12, 18], p.dirB, [p.actB, p.francella], 'Dos hermanos que no se hablan hace años recorren el país de punta a punta para cumplir el último deseo de su padre.', 7.1, 80, 45),
  M(9000003, 'Marea alta', 'Marea alta', plus(9), [53, 9648], p.dirA, [p.actA], 'En un pueblo costero aislado por una tormenta, la desaparición de una turista despierta viejas sospechas.', 0, 0, 40),
  M(9000004, 'Código Andino', 'Código Andino', plus(23), [28, 878], p.dirB, [p.actB, p.sbaraglia], 'Una ingeniera descubre que un observatorio en la cordillera recibe señales que nadie puede explicar.', 0, 0, 38),
];

const T = (id, title, original, date, genres, creators, cast, overview, score, votes, pop) => ({
  type: 'tv', id, title, original, date, genres, directors: creators, cast, overview, score, votes, pop,
});
export const series = [
  T(1396, 'Breaking Bad', 'Breaking Bad', '2008-01-20', [18, 80], [p.gilligan], [p.cranston, p.paul], 'Un profesor de química con problemas económicos toma una decisión que cambiará su vida para siempre.', 8.9, 14000, 200),
  T(1399, 'Game of Thrones', 'Game of Thrones', '2011-04-17', [10765, 18, 10759], [p.benioff, p.weiss], [p.clarke, p.harington], 'Nueve familias nobles luchan por el control de los Siete Reinos de Poniente mientras una amenaza olvidada regresa.', 8.4, 23000, 250),
  T(66732, 'Stranger Things', 'Stranger Things', '2016-07-15', [18, 10765, 9648], [p.duffer], [p.ryder, p.harbour], 'Cuando un chico desaparece en un pequeño pueblo, sus amigos, su familia y la policía se ven envueltos en un misterio extraordinario.', 8.6, 18000, 220),
  T(100088, 'The Last of Us', 'The Last of Us', '2023-01-15', [18], [p.mazin], [p.pascal, p.ramsey], 'Años después de una pandemia que arrasó con la civilización, un sobreviviente acepta escoltar a una adolescente a través de un país devastado.', 8.6, 5000, 180),
];

const all = [...movies, ...series];
const slug = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const raw = (x) => ({
  id: x.id,
  media_type: x.type,
  [x.type === 'movie' ? 'title' : 'name']: x.title,
  [x.type === 'movie' ? 'original_title' : 'original_name']: x.original,
  [x.type === 'movie' ? 'release_date' : 'first_air_date']: x.date,
  poster_path: `/poster~${slug(x.title)}.jpg`,
  backdrop_path: `/backdrop~${slug(x.title)}.jpg`,
  overview: x.overview,
  genre_ids: x.genres,
  vote_average: x.score,
  vote_count: x.votes,
  popularity: x.pop,
});

const GENRES_MOVIE = [[28, 'Acción'], [12, 'Aventura'], [16, 'Animación'], [35, 'Comedia'], [80, 'Crimen'], [99, 'Documental'], [18, 'Drama'], [10751, 'Familia'], [14, 'Fantasía'], [36, 'Historia'], [27, 'Terror'], [10402, 'Música'], [9648, 'Misterio'], [10749, 'Romance'], [878, 'Ciencia ficción'], [10770, 'Película de TV'], [53, 'Suspenso'], [10752, 'Bélica'], [37, 'Western']];
const GENRES_TV = [[10759, 'Acción y Aventura'], [16, 'Animación'], [35, 'Comedia'], [80, 'Crimen'], [99, 'Documental'], [18, 'Drama'], [10751, 'Familia'], [10762, 'Kids'], [9648, 'Misterio'], [10763, 'News'], [10764, 'Reality'], [10765, 'Ciencia ficción y fantasía'], [10766, 'Soap'], [10767, 'Talk'], [10768, 'Bélica y política'], [37, 'Western']];
const genreName = new Map([...GENRES_MOVIE, ...GENRES_TV]);

const paged = (items, page = 1, extra = {}) => {
  const per = 20;
  const p = Math.max(1, Number(page) || 1);
  return { page: p, results: items.slice((p - 1) * per, p * per).map(raw), total_pages: Math.max(1, Math.ceil(items.length / per)), total_results: items.length, ...extra };
};

const PROVIDERS = [
  [8, 'Netflix'], [119, 'Amazon Prime Video'], [337, 'Disney Plus'], [1899, 'Max'], [350, 'Apple TV+'], [531, 'Paramount Plus'], [167, 'Claro video'], [3, 'Google Play Movies'],
].map(([id, name], i) => ({ provider_id: id, provider_name: name, logo_path: `/logo~${slug(name)}.jpg`, display_priority: i, display_priorities: { AR: i } }));

function details(x, params) {
  const crew = x.type === 'movie' ? x.directors.map((d) => ({ ...d, profile_path: `/person~${slug(d.name)}.jpg`, job: 'Director', department: 'Directing' })) : [];
  const cast = x.cast.map((c, i) => ({ ...c, profile_path: `/person~${slug(c.name)}.jpg`, character: `Personaje ${i + 1}`, order: i }));
  const recs = all.filter((y) => y.type === x.type && y.id !== x.id && y.genres.some((g) => x.genres.includes(g)));
  const out = {
    ...raw(x),
    genres: x.genres.map((g) => ({ id: g, name: genreName.get(g) })),
    runtime: x.type === 'movie' ? 100 + (x.id % 60) : undefined,
    episode_run_time: x.type === 'tv' ? [50] : undefined,
    number_of_seasons: x.type === 'tv' ? 1 + (x.id % 7) : undefined,
    number_of_episodes: x.type === 'tv' ? 10 + (x.id % 60) : undefined,
    status: x.type === 'tv' ? (x.id === 1396 || x.id === 1399 ? 'Ended' : 'Returning Series') : 'Released',
    last_air_date: x.type === 'tv' ? '2019-05-19' : undefined,
    tagline: x.id === 603 ? 'Bienvenido al mundo real.' : '',
    imdb_id: x.type === 'movie' ? `tt${String(x.id).padStart(7, '0')}` : undefined,
    created_by: x.type === 'tv' ? x.directors.map((d) => ({ ...d, profile_path: `/person~${slug(d.name)}.jpg` })) : undefined,
  };
  const append = String(params.get('append_to_response') ?? '').split(',');
  if (append.includes('credits')) out.credits = { cast, crew };
  if (append.includes('aggregate_credits')) out.aggregate_credits = { cast: cast.map((c) => ({ ...c, roles: [{ character: c.character, episode_count: 10 }] })), crew: [] };
  if (append.includes('videos')) out.videos = { results: [{ key: 'dQw4w9WgXcQ', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'es', name: 'Tráiler oficial' }] };
  if (append.includes('watch/providers'))
    out['watch/providers'] = { results: x.id % 5 === 0 ? {} : { AR: { link: 'https://www.themoviedb.org/', flatrate: PROVIDERS.slice(x.id % 4, (x.id % 4) + 2), rent: [PROVIDERS[7]], buy: [PROVIDERS[7]] } } };
  if (append.includes('release_dates')) out.release_dates = { results: [{ iso_3166_1: 'AR', release_dates: [{ certification: x.genres.includes(10751) ? 'ATP' : '+13', type: 3, release_date: x.date }] }] };
  if (append.includes('content_ratings')) out.content_ratings = { results: [{ iso_3166_1: 'AR', rating: '+16' }] };
  if (append.includes('translations'))
    out.translations = { translations: x.id === 680 ? [{ iso_639_1: 'es', iso_3166_1: 'AR', data: { title: 'Tiempos violentos', overview: '' } }] : [] };
  if (append.includes('alternative_titles')) out.alternative_titles = x.type === 'movie' ? { titles: [] } : { results: [] };
  if (append.includes('recommendations')) out.recommendations = paged(recs);
  if (append.includes('similar')) out.similar = paged([]);
  if (append.includes('external_ids')) out.external_ids = { imdb_id: `tt${String(x.id).padStart(7, '0')}` };
  return out;
}

function personDetails(id, params) {
  const person = Object.values(people).find((x) => x.id === id);
  if (!person) return null;
  const acting = all.filter((x) => x.cast.some((c) => c.id === id));
  const directing = all.filter((x) => x.directors.some((d) => d.id === id));
  const credits = {
    cast: acting.map((x) => ({ ...raw(x), character: 'Personaje' })),
    crew: directing.map((x) => ({ ...raw(x), job: x.type === 'movie' ? 'Director' : 'Creator', department: x.type === 'movie' ? 'Directing' : 'Writing' })),
  };
  const out = {
    id,
    name: person.name,
    biography: params.get('language') === 'en-US' ? 'Biography in English.' : id === 6384 ? 'Actor canadiense nacido en Beirut. Saltó a la fama en los años 90 y se convirtió en una de las caras más reconocidas del cine de acción.' : '',
    birthday: '1964-09-02',
    deathday: null,
    place_of_birth: 'Beirut, Líbano',
    profile_path: `/person~${slug(person.name)}.jpg`,
    known_for_department: directing.length > acting.length ? 'Directing' : 'Acting',
    gender: 2,
  };
  if (String(params.get('append_to_response') ?? '').includes('combined_credits')) out.combined_credits = credits;
  return { out, credits };
}

export function tmdbHandler(url, headers = {}) {
  const u = new URL(url);
  const key = u.searchParams.get('api_key');
  const bearer = headers.authorization;
  if (key !== 'test-key' && bearer !== 'Bearer eyJtest') return { status: 401, body: { status_message: 'Invalid API key' } };
  const path = u.pathname.replace(/^\/3/, '');
  const q = u.searchParams;
  let m;
  if (path === '/configuration') return { body: { images: {} } };
  if ((m = path.match(/^\/genre\/(movie|tv)\/list$/))) return { body: { genres: (m[1] === 'movie' ? GENRES_MOVIE : GENRES_TV).map(([id, name]) => ({ id, name })) } };
  if ((m = path.match(/^\/watch\/providers\/(movie|tv)$/))) return { body: { results: PROVIDERS } };
  if ((m = path.match(/^\/discover\/(movie|tv)$/))) {
    let items = (m[1] === 'movie' ? movies : series).filter((x) => x.votes > 0);
    const g = q.get('with_genres');
    if (g) {
      const ids = g.split(/[,|]/).map(Number);
      items = items.filter((x) => (g.includes(',') ? ids.every((i) => x.genres.includes(i)) : ids.some((i) => x.genres.includes(i))));
    }
    const sort = q.get('sort_by') ?? 'popularity.desc';
    const by = sort.startsWith('vote_average') ? 'score' : sort.startsWith('vote_count') ? 'votes' : sort.includes('date') ? 'date' : 'pop';
    items = [...items].sort((a, b) => (by === 'date' ? b.date.localeCompare(a.date) : b[by] - a[by]));
    return { body: paged(items, q.get('page')) };
  }
  if (path === '/trending/all/week') return { body: paged([...all].filter((x) => x.votes > 0).sort((a, b) => b.pop - a.pop)) };
  if (path === '/movie/now_playing') return { body: paged(movies.filter((x) => x.date <= plus(0) && x.date >= plus(-40)), q.get('page'), { dates: { minimum: plus(-40), maximum: plus(0) } }) };
  if (path === '/movie/upcoming') return { body: paged(movies.filter((x) => x.date > plus(0)), q.get('page')) };
  if (path === '/search/multi') {
    const term = slug(q.get('query') ?? '');
    const media = all.filter((x) => slug(x.title).includes(term) || slug(x.original).includes(term)).map(raw);
    const ppl = Object.values(people)
      .filter((x) => slug(x.name).includes(term))
      .map((x) => ({ id: x.id, media_type: 'person', name: x.name, profile_path: `/person~${slug(x.name)}.jpg`, known_for_department: 'Acting', popularity: 10 }));
    const results = [...media, ...ppl];
    return { body: { page: 1, results, total_pages: 1, total_results: results.length } };
  }
  if ((m = path.match(/^\/(movie|tv)\/(\d+)\/recommendations$/))) {
    const x = all.find((y) => y.type === m[1] && y.id === Number(m[2]));
    if (!x) return { status: 404, body: {} };
    return { body: paged(all.filter((y) => y.type === x.type && y.id !== x.id && y.votes > 0 && y.genres.some((g) => x.genres.includes(g)))) };
  }
  if ((m = path.match(/^\/(movie|tv)\/(\d+)\/external_ids$/))) return { body: { imdb_id: `tt${m[2].padStart(7, '0')}` } };
  if ((m = path.match(/^\/(movie|tv)\/(\d+)$/))) {
    const x = all.find((y) => y.type === m[1] && y.id === Number(m[2]));
    return x ? { body: details(x, q) } : { status: 404, body: {} };
  }
  if ((m = path.match(/^\/person\/(\d+)\/combined_credits$/))) {
    const r = personDetails(Number(m[1]), q);
    return r ? { body: r.credits } : { status: 404, body: {} };
  }
  if ((m = path.match(/^\/person\/(\d+)$/))) {
    const r = personDetails(Number(m[1]), q);
    return r ? { body: r.out } : { status: 404, body: {} };
  }
  return { status: 404, body: { status_message: 'mock: ruta no simulada ' + path } };
}

export function omdbHandler(url) {
  const u = new URL(url);
  if (u.searchParams.get('apikey') !== 'omdb-key') return { status: 401, body: { Response: 'False', Error: 'Invalid API key!' } };
  const id = Number((u.searchParams.get('i') ?? 'tt0').slice(2));
  const x = all.find((y) => y.id === id);
  const rating = x ? (x.score ? Math.min(9.3, x.score + 0.1).toFixed(1) : 'N/A') : '9.3';
  return { body: { Response: 'True', imdbRating: rating, imdbVotes: x ? (x.votes * 70).toLocaleString('en-US') : '3,000,000' } };
}

const hue = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
export function imageHandler(url) {
  const name = decodeURIComponent(url.split('/').pop() ?? '').replace(/\.jpg$/, '');
  const [kind, s = ''] = name.split('~');
  const h = hue(s);
  const words = s.split('-').filter(Boolean);
  const label = words.join(' ').toUpperCase();
  const lines = [];
  let cur = '';
  for (const w of label.split(' ')) {
    if ((cur + ' ' + w).trim().length > 12) {
      if (cur) lines.push(cur);
      cur = w;
    } else cur = (cur + ' ' + w).trim();
  }
  if (cur) lines.push(cur);
  const W = kind === 'backdrop' ? 780 : kind === 'logo' ? 92 : kind === 'person' ? 185 : 342;
  const H = kind === 'backdrop' ? 439 : kind === 'logo' ? 92 : kind === 'person' ? 278 : 513;
  const fs = kind === 'logo' ? 12 : kind === 'backdrop' ? 54 : 34;
  const text =
    kind === 'person'
      ? `<circle cx="${W / 2}" cy="${H * 0.38}" r="${W * 0.22}" fill="hsl(${h} 30% 75%)"/><rect x="${W * 0.2}" y="${H * 0.62}" width="${W * 0.6}" height="${H * 0.5}" rx="${W * 0.3}" fill="hsl(${h} 30% 75%)"/>`
      : lines
          .slice(0, 4)
          .map((l, i) => `<text x="50%" y="${H / 2 + (i - (Math.min(lines.length, 4) - 1) / 2) * fs * 1.15}" font-family="Arial Black,Arial" font-weight="900" font-size="${fs}" fill="rgba(255,255,255,.92)" text-anchor="middle" dominant-baseline="middle">${l}</text>`)
          .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${h} 55% 42%)"/><stop offset="1" stop-color="hsl(${(h + 50) % 360} 60% 18%)"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/>${text}</svg>`;
  return { contentType: 'image/svg+xml', body: svg };
}
