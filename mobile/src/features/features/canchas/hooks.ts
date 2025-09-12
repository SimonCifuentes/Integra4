import { useQuery } from "@tanstack/react-query";
import { CanchasAPI } from "./api";

export const useCanchas = (params?: { q?: string; deporte?: string; sector?: string; fecha?: string }) =>
  useQuery({
    queryKey: ["canchas", params],
    queryFn: () => CanchasAPI.list(params),
  });
