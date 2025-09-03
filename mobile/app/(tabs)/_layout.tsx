// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { AuthGate } from '../../src/utils/guards';

export default function TabsLayout() {
  return (
    <AuthGate>
      <Tabs>
        <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
      </Tabs>
    </AuthGate>
  );
}
