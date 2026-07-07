import * as Haptics from 'expo-haptics';

/**
 * Envoltorios de háptica tolerantes a fallos (algunos dispositivos o el
 * simulador no la soportan). Añaden ese "toque" de dopamina al interactuar.
 */
export const tapLight = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};

export const tapMedium = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};

export const notifySuccess = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
