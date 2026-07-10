import { Tabs } from 'expo-router';
import { colors } from '@/lib/theme';
import { TabBarIcon, TabName } from '@/components/TabBarIcon';

// Renderizadores estables (fuera del componente) para no recrear el icono
// en cada render — evita remontar la barra y silencia el aviso del linter.
const icon = (name: TabName) =>
  function TabBarIconRender({ color }: { color: string }) {
    return <TabBarIcon name={name} color={color} />;
  };

const HomeIcon = icon('home');
const ExercisesIcon = icon('dumbbell');
const RoutinesIcon = icon('routines');
const WodsIcon = icon('wods');
const HistoryIcon = icon('progress');

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
