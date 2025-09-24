/* eslint-disable @typescript-eslint/no-explicit-any */
import { http } from "@/src/services/http";
import { R } from "@/src/config/routes";

/** Tipos del BE (aceptamos variantes de nombre de campo) */
export type ComplejoBE = {
  id?: number | string;
  id_complejo?: number | string;
  nombre?: string;
  nombre_complejo?: string;
  direccion?: string;
  comuna?: string;
  sector?: string;
  deportes?: string[];
  rating?: number;
  canchas?: number;
  num_canchas?: number;
  courts_count?: number;
};

export type PagedResp<T> = {
  items: T[];
  total?: number;
  page?: number;
  page_size?: number;
};

export type ListComplejosDto = {
  page?: number;
  page_size?: number;
  q?: string;
  deporte?: string;
  sector?: string;
};

/** Normaliza una respuesta que puede venir como {items:[...]} o directamente [...] */
function normalizeList<T>(data: any): PagedResp<T> {
  if (Array.isArray(data)) return { items: data };
  if (data && Array.isArray(data.items)) return data as PagedResp<T>;
  return { items: [] };
}

export const ComplejosAPI = {
  /** GET lista de complejos */
  list: async (params: ListComplejosDto = {}) => {
    // Si en tus rutas ya existe R.complejos.list úsalo; si no, cambia aquí a la ruta real.
    const url = R?.complejos?.list ?? "/api/v1/complejos";
    const { data } = await http.get(url, { params });
    return normalizeList<ComplejoBE>(data);
  },

  /** GET detalle de un complejo */
  getById: async (id: number | string) => {
    const base = R?.complejos?.detail ?? "/api/v1/complejos";
    const { data } = await http.get(`${base}/${id}`);
    return data as ComplejoBE;
  },
};
