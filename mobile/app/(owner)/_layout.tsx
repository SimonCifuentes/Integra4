// app/(owner)/_layout.tsx
import { Stack } from 'expo-router';
import { AuthGate, RoleGate } from '@/src/utils/guards';
export default function OwnerLayout() {
  return (
    <AuthGate>
      <RoleGate roles={['owner','admin','superadmin']}>
        <Stack screenOptions={{ headerShown:false }} />
      </RoleGate>
    </AuthGate>
  );
}
