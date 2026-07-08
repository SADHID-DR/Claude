import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StoreProvider } from '@/lib/store';
import { colors } from '@/lib/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.bg },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="exercise/[id]"
            options={{ title: 'Ejercicio', presentation: 'card' }}
          />
          <Stack.Screen
            name="routine/new"
            options={{ title: 'Nueva rutina', presentation: 'modal' }}
          />
          <Stack.Screen
            name="routine/generate"
            options={{ title: 'Generar plan', presentation: 'modal' }}
          />
          <Stack.Screen name="session/[id]" options={{ title: 'Entrenamiento' }} />
          <Stack.Screen name="wod/[id]" options={{ title: 'WOD' }} />
          <Stack.Screen name="plan/[id]" options={{ title: 'Calendario' }} />
          <Stack.Screen name="timer" options={{ title: 'Temporizador' }} />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
