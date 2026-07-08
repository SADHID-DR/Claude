import * as Notifications from 'expo-notifications';
import { Plan } from '@/lib/types';

/** Etiqueta de día → weekday de expo (1 = domingo ... 7 = sábado). */
const LABEL_TO_WEEKDAY: Record<string, number> = {
  Dom: 1,
  Lun: 2,
  Mar: 3,
  Mié: 4,
  Jue: 5,
  Vie: 6,
  Sáb: 7,
};

/** Pide permiso de notificaciones (idempotente). */
export async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    const req = await Notifications.requestPermissionsAsync();
    return req.granted;
  } catch {
    return false;
  }
}

/**
 * Programa recordatorios semanales para los días de entrenamiento del plan
 * activo, a una hora dada. Cancela los anteriores primero.
 */
export async function scheduleReminders(
  plan: Plan,
  hour = 18,
  minute = 0
): Promise<boolean> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    const ok = await ensurePermission();
    if (!ok) return false;
    for (const label of plan.schedule) {
      const weekday = LABEL_TO_WEEKDAY[label];
      if (!weekday) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '¡Toca entrenar! 💪',
          body: `Hoy tienes sesión de tu plan "${plan.name}". ¡Vamos!`,
        },
        // Disparador semanal (se repite cada semana ese día a esa hora).
        trigger: { weekday, hour, minute, repeats: true } as Notifications.NotificationTriggerInput,
      });
    }
    return true;
  } catch {
    return false;
  }
}

/** Cancela todos los recordatorios programados. */
export async function cancelReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignorar
  }
}
