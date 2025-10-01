﻿import { useQuery } from "@tanstack/react-query";
import { ComplejosAPI } from "./api";

export const useComplejos = (params?: { q?: string; deporte?: string; sector?: string }) =>
  useQuery({
    queryKey: ["complejos", params],
    queryFn: () => ComplejosAPI.list(params),
  });