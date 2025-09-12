import { http } from "@/src/services/http";

export type Complejo = {
  id: number;
  nombre: string;
  direccion?: string;
  comuna?: string;
  deportes?: string[];  // si tu API no lo trae, puedes calcularlo desde canchas
  rating?: number | null;
  canchas?: number | null; // total canchas (opcional)
  fotos?: string[];        // si manejas imágenes
};

export const ComplejosAPI = {
  list: (params?: { q?: string; deporte?: string; sector?: string }) =>
    http.get<Complejo[]>("/api/v1/complejos", { params }).then(r => r.data),
};
