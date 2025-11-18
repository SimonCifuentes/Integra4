// src/features/resenas/hooks.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMutation, useQuery } from "@tanstack/react-query";
import { ResenasAPI, type Resena } from "./api";
import { http } from "@/src/services/http";
import type { RatingCancha } from "./utils";

export const hooks = {
  useCreateResena() {
    return useMutation({
      mutationFn: ResenasAPI.create,
    });
  },

  useUpdateResena() {
    return useMutation({
      mutationFn: (args: {
        id_resena: number;
        calificacion?: number;
        comentario?: string;
      }) => ResenasAPI.update(args.id_resena, args),
    });
  },

  useRatingsPromedioCanchas() {
  return useQuery<RatingCancha[]>({
    queryKey: ["ratings_promedio_canchas"],
    queryFn: async () => {
      const { data } = await http.get("/resenas/promedio/canchas");
      const arr: any[] = Array.isArray(data)
        ? data
        : data?.data ?? data?.items ?? [];
      return arr as RatingCancha[];
    },
  });
},

  useMiResenaPorCancha(id_cancha?: number) {
    return useQuery<Resena[]>({
      queryKey: ["mi-resena-cancha", id_cancha],
      enabled: !!id_cancha,
      queryFn: async () => {
        const { data } = await ResenasAPI.getMiasPorCancha(id_cancha!);
        const arr: any[] = Array.isArray(data)
          ? data
          : data?.data ?? data?.items ?? [];
        return arr as Resena[];
      },
    });
  },
};
