import { useQuery } from "@tanstack/react-query";
import { CanchasAPI } from "./api";

export function useCanchas(filters?: Parameters<typeof CanchasAPI.list>[0]) {
  return useQuery({ queryKey:["canchas",filters], queryFn:()=>CanchasAPI.list(filters) });
}
