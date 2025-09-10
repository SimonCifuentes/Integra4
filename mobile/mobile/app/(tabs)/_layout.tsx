// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import { AuthGate } from '../../src/utils/guards';

export default function TabsLayout() {
  return (
    <AuthGate>
      <Tabs>
        <Tabs.Screen name="index" options={{ title: 'Inicio' }} />
        <Tabs.Screen name='complejos' options={{title: 'Complejos'}} />
        <Tabs.Screen name='explore' options={{title: 'Explore'}} />
        <Tabs.Screen name='perfil' options={{title: 'Perfil'}} />
        <Tabs.Screen name='grupos' options={{title: 'Grupos'}} />
        
      </Tabs>
    </AuthGate>
  );
}
