import { http } from "@/src/services/http";

export type Cancha = {
  id: number;
  complejoId: number;         // id del complejo (si tu API devuelve otro nombre, mapea en el hook)
  complejoNombre?: string;    // opcional: nombre del complejo
  deporte: string;            // "Fútbol" | "Pádel" | ...
  tipo?: string;              // "Fútbol 5" | "Pádel" | ...
  superficie?: string;        // "Pasto sintético", etc.
  precioDesde?: number | null;
  disponibleHoy?: boolean;    // si tu API lo calcula, si no puedes omitirlo
  sector?: string;            // "Centro", etc.
};

export const CanchasAPI = {
  list: (params?: { q?: string; deporte?: string; sector?: string; fecha?: string }) =>
    http.get<Cancha[]>("/api/v1/canchas", { params }).then(r => r.data),
};
