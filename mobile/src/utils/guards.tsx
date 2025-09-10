import { useEffect } from 'react';
import { useAuth } from '@/src/stores/auth';
import { router } from 'expo-router';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { isHydrated, user } = useAuth();
  useEffect(() => {
    if (isHydrated && !user) router.replace('/(auth)/login');
  }, [isHydrated, user]);
  if (!isHydrated) return null;
  return <>{children}</>;
}

export function RoleGate({ roles, children }: { roles: string[]; children: React.ReactNode }) {
  const { user } = useAuth();
  useEffect(() => {
    if (user && !roles.includes(user.rol)) router.replace('/(tabs)');
  }, [user]);
  return <>{children}</>;
}
