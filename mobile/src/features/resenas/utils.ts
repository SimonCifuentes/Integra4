// src/features/resenas/utils.ts

export type RatingCancha = {
  id_cancha: number;
  promedio: number;
  total_resenas: number;
};

export type CanchaWithComplejo = {
  id_cancha: number;
  id_complejo: number | null;
};

export type RatingComplejo = {
  id_complejo: number;
  promedio: number;
  total_resenas: number;
};

/**
 * Calcula el rating promedio por complejo a partir de:
 *  - lista de canchas (id_cancha, id_complejo)
 *  - ratings por cancha (promedio, total_resenas)
 */
export function calcularRatingPorComplejo(
  canchas: CanchaWithComplejo[],
  ratings: RatingCancha[]
): Map<number, RatingComplejo> {
  const ratingsByCancha = new Map<number, RatingCancha>();
  ratings.forEach((r) => ratingsByCancha.set(r.id_cancha, r));

  const acumulado = new Map<
    number,
    { sumaPonderada: number; totalResenas: number }
  >();

  for (const cancha of canchas) {
    if (cancha.id_complejo == null) continue;

    const r = ratingsByCancha.get(cancha.id_cancha);
    if (!r || r.total_resenas <= 0) continue;

    const acc =
      acumulado.get(cancha.id_complejo) || {
        sumaPonderada: 0,
        totalResenas: 0,
      };

    acc.sumaPonderada += r.promedio * r.total_resenas;
    acc.totalResenas += r.total_resenas;

    acumulado.set(cancha.id_complejo, acc);
  }

  const result = new Map<number, RatingComplejo>();
  for (const [id_complejo, acc] of acumulado) {
    result.set(id_complejo, {
      id_complejo,
      promedio:
        acc.totalResenas > 0
          ? acc.sumaPonderada / acc.totalResenas
          : 0,
      total_resenas: acc.totalResenas,
    });
  }

  return result;
}
