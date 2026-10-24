/** Calificación en estrellas de 0,5 a 5 (en pasos de media estrella, o sea 1 a 10) + la marca de "Leyenda". */

const LABELS: Record<number, string> = {
  0.5: 'Pésima',
  1: 'Muy mala',
  1.5: 'Mala',
  2: 'Floja',
  2.5: 'Regular',
  3: 'Buena',
  3.5: 'Muy buena',
  4: 'Excelente',
  4.5: 'Brillante',
  5: 'Obra maestra',
};

export const ratingLabel = (r?: number) => (r ? LABELS[r] ?? '' : '');

/** 4.5 → "4,5" */
export const fmtRating = (r: number) => r.toLocaleString('es-AR', { maximumFractionDigits: 1 });

/** Promedio con un decimal: 4.333 → "4,3" */
export const fmtAvg = (r: number) => r.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

/** 4.5 → "★★★★½" */
export const starsText = (r: number) => '★'.repeat(Math.floor(r)) + (r % 1 ? '½' : '');

export const roundHalf = (x: number) => Math.min(5, Math.max(0.5, Math.round(x * 2) / 2));

/** Grupo de "Mis favoritas": las leyendas primero, después por estrellas, al final las sin calificar. */
export const groupOf = (e: { rating?: number; legend?: boolean }) => (e.legend ? 'L' : String(e.rating ?? 0));
export const GROUP_ORDER = ['L', '5', '4.5', '4', '3.5', '3', '2.5', '2', '1.5', '1', '0.5', '0'];
export const groupRank = (e: { rating?: number; legend?: boolean }) => (e.legend ? 11 : (e.rating ?? 0) * 2);

/** Peso de gusto para recomendaciones y favoritos: una leyenda cuenta un poco más que 5 estrellas. */
export const tasteScore = (e: { rating?: number; legend?: boolean }) => (e.rating ?? 0) + (e.legend ? 1 : 0);
