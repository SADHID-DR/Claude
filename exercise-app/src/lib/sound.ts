import { Audio } from 'expo-av';

/**
 * Reproductor de sonidos del temporizador. Precarga los beeps una vez y los
 * reutiliza para que suenen sin retardo. Tolerante a fallos (si el dispositivo
 * no puede reproducir, no rompe la app).
 */
let tick: Audio.Sound | null = null;
let go: Audio.Sound | null = null;
let ready = false;

export async function initSounds(): Promise<void> {
  if (ready) return;
  try {
    // Suena aunque el móvil esté en modo silencio.
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    const t = await Audio.Sound.createAsync(require('../../assets/beep.wav'));
    const g = await Audio.Sound.createAsync(require('../../assets/beep-go.wav'));
    tick = t.sound;
    go = g.sound;
    ready = true;
  } catch {
    // Silencioso: seguimos con vibración si el audio falla.
  }
}

async function replay(sound: Audio.Sound | null) {
  if (!sound) return;
  try {
    await sound.replayAsync();
  } catch {
    // ignorar
  }
}

/** Beep corto de cuenta atrás (últimos segundos). */
export const playTick = () => replay(tick);

/** Beep final (fin del descanso). */
export const playGo = () => replay(go);

/** Libera los recursos de audio. */
export async function unloadSounds(): Promise<void> {
  try {
    await tick?.unloadAsync();
    await go?.unloadAsync();
  } catch {
    // ignorar
  }
  tick = null;
  go = null;
  ready = false;
}
