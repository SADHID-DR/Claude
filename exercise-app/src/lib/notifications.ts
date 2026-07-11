import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { Plan } from '@/lib/types';

// Muestra la notificación también con la app abierta.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// v2: Android congela la configuración de un canal al crearlo; para que el
// sonido + vibración a MÁXIMA importancia apliquen en instalaciones viejas
// hay que estrenar un id de canal nuevo.
const CHANNEL_ID = 'entrenos-v2';

/**
 * Canal Android de MÁXIMA importancia: imprescindible para que el aviso
 * suene, vibre y se refleje en el reloj (Wear OS solo muestra
 * notificaciones que llegan como heads-up al teléfono).
 */
async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Recordatorios de entrenamiento',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 300, 200, 300],
      enableVibrate: true,
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  } catch {
    // sin canal seguirá usando el por defecto
  }
}

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
    await ensureChannel();
    for (const label of plan.schedule) {
      const weekday = LABEL_TO_WEEKDAY[label];
      if (!weekday) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '¡Toca entrenar! 💪',
          body: `Hoy tienes sesión de tu plan "${plan.name}". ¡Vamos!`,
          sound: 'default',
          vibrate: [0, 300, 200, 300],
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        // Disparador semanal (se repite cada semana ese día a esa hora).
        trigger: {
          channelId: CHANNEL_ID,
          weekday,
          hour,
          minute,
          repeats: true,
        } as Notifications.NotificationTriggerInput,
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

/**
 * Envía una notificación de prueba en unos segundos. Si tienes un Galaxy Watch
 * emparejado, el aviso aparece también en el reloj (reflejo de notificaciones).
 */
export async function sendTestNotification(): Promise<boolean> {
  try {
    const ok = await ensurePermission();
    if (!ok) return false;
    await ensureChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Prueba de aviso ⌚',
        body: 'Si ves esto en tu reloj, ¡los recordatorios llegarán a tu muñeca!',
        sound: 'default',
        vibrate: [0, 300, 200, 300],
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: {
        channelId: CHANNEL_ID,
        seconds: 10,
      } as Notifications.NotificationTriggerInput,
    });
    return true;
  } catch {
    return false;
  }
}
