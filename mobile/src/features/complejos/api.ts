/* eslint-disable @typescript-eslint/no-explicit-any */
import { http } from "@/src/services/http";
// Si en tu proyecto tienes definido el path base en R (por ejemplo R.api.complejos = "/api/v1/complejos"),
// úsalo. Si no, dejamos el string directo.
import { R } from "@/src/config/routes";

/**
 * Tipos que reflejan el backend
 * (mirrors de ComplejoOut y ComplejosListOut del backend)
 */
export interface ComplejoDTO {
  id_complejo: number;
  id_dueno: number;
  nombre: string;
  direccion: string | null;
  comuna: string | null;
  id_comuna: number | null;
  latitud: number | null;
  longitud: number | null;
  descripcion: string | null;
  activo: boolean;
  rating_promedio: number | null;
  total_resenas: number;
  distancia_km: number | null;
}

export interface ComplejosListDTO {
  items: ComplejoDTO[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * Parámetros que podemos mandar al /complejos
 *
 * Caso 1: Bounds (prioridad más alta)
 *   ne_lat, ne_lon, sw_lat, sw_lon
 *
 * Caso 2: Radio
 *   lat, lon, max_km
 *
 * Otros filtros:
 *   q, comuna, id_comuna, deporte
 *
 * Orden/paginación:
 *   sort_by: "distancia" | "rating" | "nombre" | "recientes"
 *   order:   "asc" | "desc"
 *   page, page_size
 */
export interface NearbyParams {
  // --- texto / filtros básicos ---
  q?: string;
  comuna?: string;
  id_comuna?: number;
  deporte?: string;

  // --- radio clásico ---
  lat?: number;
  lon?: number;
  max_km?: number;

  // --- bounds del viewport del mapa ---
  ne_lat?: number;
  ne_lon?: number;
  sw_lat?: number;
  sw_lon?: number;

  // --- orden / paginación ---
  sort_by?: "distancia" | "rating" | "nombre" | "recientes";
  order?: "asc" | "desc";
  page?: number;
  page_size?: number;
}

/**
 * Helper para armar querystring ignorando los undefined/null
 */
function buildQuery(params: Record<string, any>): string {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" // evita enviar vacío tipo q=""
    ) {
      search.append(key, String(value));
    }
  });

  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Llama al backend:
 *   GET /api/v1/complejos?...query...
 *
 * Este método ya soporta:
 *  - bounds (ne_lat, ne_lon, sw_lat, sw_lon)
 *  - radio (lat, lon, max_km)
 *  - filtros comunes
 *  - orden, paginación
 *
 * Devuelve lo mismo que el backend: { items, total, page, page_size }
 */
async function listNearby(params: NearbyParams): Promise<ComplejosListDTO> {
  // Ajusta esta baseURL si en tu proyecto R ya tiene el path de complejos.
  // Ejemplo si tienes algo tipo R.api.complejos = "/api/v1/complejos":
  // const basePath = R.api.complejos;
  // Si NO tienes eso en R aún, puedes dejarlo fijo:
  const basePath =
    // @ts-expect-error preferimos usar R si existe
    (R?.api?.complejos as string) || "/api/v1/complejos";

  const qs = buildQuery({
    q: params.q,
    comuna: params.comuna,
    id_comuna: params.id_comuna,
    deporte: params.deporte,

    lat: params.lat,
    lon: params.lon,
    max_km: params.max_km,

    ne_lat: params.ne_lat,
    ne_lon: params.ne_lon,
    sw_lat: params.sw_lat,
    sw_lon: params.sw_lon,

    sort_by: params.sort_by,
    order: params.order,
    page: params.page,
    page_size: params.page_size,
  });

  // asumimos que http.get<T>(url) devuelve data ya tipada
  const data = await http.get<ComplejosListDTO>(`${basePath}${qs}`);
  return data;
}

export const api = {
  listNearby,
};
