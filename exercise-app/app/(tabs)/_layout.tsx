import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/lib/theme';

/** Icono de pestaña basado en emoji para evitar dependencias de fuentes de iconos. */
function TabIcon({ emoji, color }: { emoji: string; color: string }) {
  return <Text style={{ fontSize: 20, color, opacity: 1 }}>{emoji}</Text>;
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.text,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Ejercicios',
          tabBarIcon: ({ color }) => <TabIcon emoji="💪" color={color} />,
        }}
      />
      <Tabs.Screen
        name="routines"
        options={{
          title: 'Rutinas',
          tabBarIcon: ({ color }) => <TabIcon emoji="📋" color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Registro',
          tabBarIcon: ({ color }) => <TabIcon emoji="📈" color={color} />,
        }}
      />
      <Tabs.Screen
        name="timer"
        options={{
          title: 'Temporizador',
          tabBarIcon: ({ color }) => <TabIcon emoji="⏱️" color={color} />,
        }}
      />
    </Tabs>
  );
}
