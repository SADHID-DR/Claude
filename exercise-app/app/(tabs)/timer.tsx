import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, Vibration, View } from 'react-native';
import { Button } from '@/components/ui';
import { colors, radius, spacing } from '@/lib/theme';

const PRESETS = [30, 45, 60, 90, 120, 180];

function fmt(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function TimerScreen() {
  const [mode, setMode] = useState<'countdown' | 'stopwatch'>('countdown');

  // Cuenta atrás (descanso).
  const [target, setTarget] = useState(60);
  const [remaining, setRemaining] = useState(60);

  // Cronómetro.
  const [elapsed, setElapsed] = useState(0);

  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clear = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => clear, []);

  useEffect(() => {
    if (!running) {
      clear();
      return;
    }
    intervalRef.current = setInterval(() => {
      if (mode === 'countdown') {
        setRemaining((prev) => {
          if (prev <= 1) {
            Vibration.vibrate(600);
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      } else {
        setElapsed((prev) => prev + 1);
      }
    }, 1000);
    return clear;
  }, [running, mode]);

  const selectPreset = (seconds: number) => {
    setTarget(seconds);
    setRemaining(seconds);
    setRunning(false);
  };

  const reset = () => {
    setRunning(false);
    if (mode === 'countdown') setRemaining(target);
    else setElapsed(0);
  };

  const display = mode === 'countdown' ? remaining : elapsed;
  const progress =
    mode === 'countdown' && target > 0 ? remaining / target : 0;

  return (
    <View style={styles.container}>
      <View style={styles.modeSwitch}>
        <Pressable
          onPress={() => {
            setMode('countdown');
            setRunning(false);
          }}
          style={[styles.modeBtn, mode === 'countdown' && styles.modeBtnActive]}
        >
          <Text style={[styles.modeText, mode === 'countdown' && styles.modeTextActive]}>
            Descanso
          </Text>
        </Pressable>
        <Pressable
          onPress={() => {
            setMode('stopwatch');
            setRunning(false);
          }}
          style={[styles.modeBtn, mode === 'stopwatch' && styles.modeBtnActive]}
        >
          <Text style={[styles.modeText, mode === 'stopwatch' && styles.modeTextActive]}>
            Cronómetro
          </Text>
        </Pressable>
      </View>

      <View style={styles.display}>
        <Text style={styles.time}>{fmt(display)}</Text>
        {mode === 'countdown' ? (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>
        ) : null}
      </View>

      {mode === 'countdown' ? (
        <View style={styles.presets}>
          {PRESETS.map((p) => (
            <Pressable
              key={p}
              onPress={() => selectPreset(p)}
              style={[styles.preset, target === p && styles.presetActive]}
            >
              <Text style={[styles.presetText, target === p && styles.presetTextActive]}>
                {p}s
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <View style={styles.controls}>
        <Button
          title={running ? '⏸ Pausar' : '▶ Iniciar'}
          onPress={() => setRunning((r) => !r)}
          style={{ flex: 1 }}
        />
        <Button title="↺ Reiniciar" variant="ghost" onPress={reset} style={{ flex: 1 }} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modeBtn: { flex: 1, paddingVertical: spacing.sm, borderRadius: radius.sm, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.primary },
  modeText: { color: colors.textMuted, fontWeight: '700' },
  modeTextActive: { color: '#0b1220' },
  display: { alignItems: 'center', marginVertical: spacing.xl },
  time: {
    color: colors.text,
    fontSize: 84,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  progressTrack: {
    width: '80%',
    height: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    marginTop: spacing.md,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  preset: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  presetText: { color: colors.textMuted, fontWeight: '700' },
  presetTextActive: { color: '#0b1220' },
  controls: { flexDirection: 'row', gap: spacing.sm, marginTop: 'auto' },
});
