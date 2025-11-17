// src/features/resenas/api.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { http } from "@/src/services/http";

export type Resena = {
  id_resena: number;
  id_usuario: number;
  id_cancha: number;
  id_complejo?: number | null;
  calificacion: number;
  comentario: string | null;
  esta_activa?: boolean;
  created_at?: string;
  updated_at?: string | null;
};

export const ResenasAPI = {
  // POST /api/v1/resenas
  create(payload: {
    id_cancha: number;
    id_complejo?: number | null;
    calificacion: number;
    comentario?: string;
  }) {
    return http.post("/resenas", payload);
  },

  // PATCH /api/v1/resenas/{id_resena}
  update(
    id_resena: number,
    payload: { calificacion?: number; comentario?: string }
  ) {
    return http.patch(`/resenas/${id_resena}`, payload);
  },

  // GET /api/v1/resenas/mias?id_cancha=13  (nombre puede variar, ajusta si hace falta)
  getMiasPorCancha(id_cancha: number) {
    return http.get("/resenas/mias", { params: { id_cancha } });
  },
};
