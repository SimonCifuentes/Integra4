// src/complejos/api.ts
import { http } from "@/src/services/http";
import { R } from "@/src/config/routes";

// Tipos de datos
export type Complejo = {
  id_complejo: number;
  nombre: string;
  direccion: string;
  comuna: string;
  latitud: number;
  longitud: number;
  descripcion?: string;
  rating_promedio?: number;
  total_resenas?: number;
  distancia_km?: number | null;
};

export const api = {
  // 🔹 Endpoint: obtener todos los complejos (puede recibir lat/lon/radio opcionales)
  listar: async (params?: { lat?: number; lon?: number; max_km?: number }) => {
    const { data } = await http.get(R.complejos.list, { params });
    // Garantiza que siempre devuelva un array
    return Array.isArray(data) ? data : data?.items || [];
  },

  // 🔹 Endpoint: complejos cercanos (usa el endpoint del backend /complejos)
  cercanos: async (lat: number, lon: number, radioKm: number = 5) => {
    const { data } = await http.get(R.complejos.list, {
      params: { lat, lon, max_km: radioKm },
    });
    // Asegura retorno tipo array
    return Array.isArray(data) ? data : data?.items || [];
  },
};
