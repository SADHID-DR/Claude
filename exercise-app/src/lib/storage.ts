import AsyncStorage from '@react-native-async-storage/async-storage';

/** Claves de persistencia local. */
export const StorageKeys = {
  routines: 'exercise-app/routines',
  sessions: 'exercise-app/sessions',
  plans: 'exercise-app/plans',
  activePlan: 'exercise-app/activePlan',
  reminders: 'exercise-app/reminders',
  reminderHour: 'exercise-app/reminderHour',
  body: 'exercise-app/body',
  unit: 'exercise-app/unit',
} as const;

export async function loadJSON<T>(key: string, fallback: T): Promise<T> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function saveJSON<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Silencioso: si falla el almacenamiento no bloqueamos la UI.
  }
}

/** Genera un id simple y único para entidades locales. */
export function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
