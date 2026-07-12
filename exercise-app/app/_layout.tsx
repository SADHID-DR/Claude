import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StoreProvider } from '@/lib/store';
import { colors, fonts } from '@/lib/theme';
import { fontAssets, installGlobalFont } from '@/lib/fonts';

SplashScreen.preventAutoHideAsync().catch(() => {});
// Barlow como fuente global (mapea fontWeight→familia). Se instala una vez.
installGlobalFont();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontAssets);

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  // No renderizamos hasta tener las fuentes (evita el "flash" con la del sistema).
  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg },
            headerTintColor: colors.text,
            headerTitleStyle: { fontFamily: fonts.display, fontSize: 20 },
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
          <Stack.Screen name="plan/edit/[id]" options={{ title: 'Editar plan', presentation: 'modal' }} />
          <Stack.Screen name="timer" options={{ title: 'Temporizador' }} />
        </Stack>
      </StoreProvider>
    </SafeAreaProvider>
  );
}
