import { Stack } from "expo-router";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useAuth } from "@/src/stores/auth";
const qc = new QueryClient();
export default function RootLayout(){
  const hydrate = useAuth(s=>s.hydrate);
  useEffect(()=>{ hydrate(); },[]);
  return (
    <QueryClientProvider client={qc}>
      <Stack screenOptions={{ headerShown:false }} />
    </QueryClientProvider>
  );
}
