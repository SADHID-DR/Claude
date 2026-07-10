import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/lib/theme';

/** Icono de pestaña basado en emoji para evitar dependencias de fuentes. */
function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 20, color }}>{emoji}</Text>;
}

// Renderizadores estables (fuera del componente) para no recrear el icono
// en cada render — evita remontar la barra y silencia el aviso del linter.
const icon = (emoji: string) =>
  function TabBarIcon({ color }: { color: string }) {
    return <TabIcon emoji={emoji} color={color} />;
  };

const HomeIcon = icon('🏠');
const ExercisesIcon = icon('💪');
const RoutinesIcon = icon('📋');
const WodsIcon = icon('🔥');
const HistoryIcon = icon('📈');

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 6,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hoy',
          headerShown: false,
          tabBarIcon: HomeIcon,
        }}
      />
      <Tabs.Screen
        name="exercises"
        options={{
          title: 'Ejercicios',
          tabBarIcon: ExercisesIcon,
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: 'Rutinas',
          tabBarIcon: RoutinesIcon,
        }}
      />
      <Tabs.Screen
        name="wods"
        options={{
          title: 'WODs',
          tabBarIcon: WodsIcon,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Progreso',
          tabBarIcon: HistoryIcon,
        }}
      />
    </Tabs>
  );
}
