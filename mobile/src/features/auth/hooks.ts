import { useMutation, useQuery } from "@tanstack/react-query";
import { AuthAPI } from "./api";

export function useMe() {
  return useQuery({ queryKey:["auth","me"], queryFn: AuthAPI.me });
}
export function useLogin() {
  return useMutation({ mutationFn: AuthAPI.login });
}
