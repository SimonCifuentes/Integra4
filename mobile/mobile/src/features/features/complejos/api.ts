import { api } from "@/src/lib/api";

export type Complejo = {
  id: number;
  nombre: string;
  direccion?: string;
  lat?: number; lng?: number;
  fotos?: string[];
};

export const ComplejosAPI = {
  list: (params?: { q?: string; limit?: number }) =>
    api.get<Complejo[]>("/complejos", { params }).then(r => r.data),

  byId: (id: number|string) =>
    api.get<Complejo>(`/complejos/${id}`).then(r => r.data),
};
