import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  AppState,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Vibration,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '@/lib/store';
import { getExerciseById, EXERCISES } from '@/data/exercises';
import { lastWeightFor, doubleProgression } from '@/lib/coach';
import { detectNewPRs, e1rmFor } from '@/lib/strength';
import { estimateKcal } from '@/lib/stats';
import { WARMUPS, WarmupItem, recommendedWarmup } from '@/data/warmups';
import { fmtWeight, toDisplay, toKg } from '@/lib/units';
import { notifySuccess, tapMedium } from '@/lib/haptics';
import { initSounds, playTick, playGo, unloadSounds } from '@/lib/sound';
import { LoggedSet, RoutineExercise } from '@/lib/types';
import { Button, Card } from '@/components/ui';
import { ExerciseDemo } from '@/components/ExerciseDemo';
import { Confetti } from '@/components/Confetti';
import { colors, radius, spacing } from '@/lib/theme';

/** Formatea segundos como mm:ss. */
function fmt(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { routines, sessions, addSession, unit, setUnit, body } = useStore();
  const routine = routines.find((r) => r.id === id);

  const [elapsed, setElapsed] = useState(0);
  const started = useRef(Date.now());

  // Cronómetro de la sesión.
  useEffect(() => {
    const t = setInterval(() => {
      setElapsed(Math.floor((Date.now() - started.current) / 1000));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  // Estado editable de cada serie: weight/reps por (ejercicio, serie).
  // El peso se pre-rellena con lo que usaste la última vez (coach).
  const initialSets = useMemo<Record<string, { weight: string; reps: string; rir: string }>>(() => {
    const map: Record<string, { weight: string; reps: string; rir: string }> = {};
    routine?.exercises.forEach((re) => {
      // Doble progresión: la app decide el peso de hoy según tu última sesión.
      const presc = doubleProgression(sessions, re.exerciseId, re.reps);
      const prefill =
        presc.weightKg != null
          ? String(Math.round(toDisplay(presc.weightKg, unit) * 10) / 10)
          : '';
      for (let s = 0; s < re.sets; s++) {
        map[`${re.exerciseId}-${s}`] = { weight: prefill, reps: String(re.reps), rir: '' };
      }
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routine, sessions, unit]);

  const [sets, setSets] = useState(initialSets);
  const [done, setDone] = useState<Record<string, boolean>>({});
  // Series cuyo peso el usuario editó a mano (no se sobrescriben al autorrellenar).
  const [weightEdited, setWeightEdited] = useState<Record<string, boolean>>({});

  // Cómo te sentiste + nota del entreno.
  const [feeling, setFeeling] = useState<number | null>(null);
  const [note, setNote] = useState('');

  // Descanso automático entre series. Se basa en la HORA REAL de fin
  // (endAt), así el conteo sigue correcto aunque se apague la pantalla.
  const [rest, setRest] = useState<{ endAt: number; total: number } | null>(null);
  const [remaining, setRemaining] = useState(0);
  const lastBeep = useRef(-1);

  // Demostración de técnica desplegada (solo una a la vez, por rendimiento).
  const [demoFor, setDemoFor] = useState<string | null>(null);

  // Lista de ejercicios de la sesión (editable: se puede cambiar un ejercicio
  // por otro relacionado sin tocar la rutina guardada). Se rehace si cambia
  // la rutina cargada.
  const [list, setList] = useState<RoutineExercise[]>(() => routine?.exercises ?? []);
  useEffect(() => {
    if (routine) setList(routine.exercises);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routine?.id]);
  // Índice del ejercicio cuyo selector de reemplazo está abierto.
  const [swapFor, setSwapFor] = useState<number | null>(null);
  // Confeti al finalizar.
  const [celebrate, setCelebrate] = useState(false);

  // Calentamiento (≤15 min): recomendado por el coach, personalizable.
  const [warmupOn, setWarmupOn] = useState(true);
  const [warmupItems, setWarmupItems] = useState<WarmupItem[]>(() =>
    routine ? recommendedWarmup(routine) : []
  );
  const [warmupDone, setWarmupDone] = useState<Record<string, boolean>>({});
  const [showWuLib, setShowWuLib] = useState(false);
  const [wuDemo, setWuDemo] = useState<string | null>(null);
  // Descanso personalizado por ejercicio (override del default de la rutina).
  const [restOverride, setRestOverride] = useState<Record<string, number>>({});

  const toggleWuItem = (item: WarmupItem) => {
    setWarmupItems((prev) =>
      prev.some((w) => w.id === item.id)
        ? prev.filter((w) => w.id !== item.id)
        : [...prev, item]
    );
  };

  const totalSets = list.reduce((n, re) => n + re.sets, 0);
  const doneCount = Object.values(done).filter(Boolean).length;

  // Precarga los sonidos del descanso.
  useEffect(() => {
    initSounds();
    return () => {
      unloadSounds();
    };
  }, []);

  // Cuenta atrás del descanso, con aviso sonoro en los últimos 5 s.
  // Calcula el tiempo restante desde la hora real, no sumando tics: si la
  // pantalla se apaga y vuelve, el temporizador muestra el valor correcto
  // (o ya ha terminado) en vez de "congelarse".
  useEffect(() => {
    if (!rest) return;
    let finished = false;
    const tick = () => {
      const rem = Math.max(0, Math.round((rest.endAt - Date.now()) / 1000));
      setRemaining(rem);
      if (rem > 0 && rem <= 5 && lastBeep.current !== rem) {
        lastBeep.current = rem;
        Vibration.vibrate(120);
        playTick();
      }
      if (rem <= 0 && !finished) {
        finished = true;
        Vibration.vibrate([0, 200, 100, 400]);
        playGo();
        setTimeout(() => setRest(null), 900);
      }
    };
    tick();
    const iv = setInterval(tick, 250);
    // Al volver de segundo plano (pantalla bloqueada), re-sincroniza al instante.
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') tick();
    });
    return () => {
      clearInterval(iv);
      sub.remove();
    };
  }, [rest]);

  const toggleDone = (key: string, restSeconds: number) => {
    tapMedium();
    setDone((prev) => {
      const nowDone = !prev[key];
      // Al completar una serie, arranca el descanso automáticamente.
      if (nowDone && restSeconds > 0) {
        lastBeep.current = -1;
        setRemaining(restSeconds);
        setRest({ endAt: Date.now() + restSeconds * 1000, total: restSeconds });
      }
      return { ...prev, [key]: nowDone };
    });
  };

  if (!routine) {
    return (
      <View style={styles.container}>
        <Text style={styles.notFound}>Rutina no encontrada.</Text>
      </View>
    );
  }

  const update = (key: string, field: 'weight' | 'reps' | 'rir', value: string) => {
    setSets((prev) => {
      const next = { ...prev, [key]: { ...prev[key], [field]: value } };
      // Peso igual por defecto: al escribirlo en una serie, las siguientes
      // series de ESE ejercicio que no hayas tocado a mano toman el mismo peso.
      if (field === 'weight' && value.trim() !== '') {
        const sep = key.lastIndexOf('-');
        const exId = key.slice(0, sep);
        const idx = parseInt(key.slice(sep + 1), 10);
        Object.keys(next).forEach((k) => {
          const kSep = k.lastIndexOf('-');
          if (k.slice(0, kSep) !== exId) return;
          const kIdx = parseInt(k.slice(kSep + 1), 10);
          if (kIdx > idx && !weightEdited[k]) {
            next[k] = { ...next[k], weight: value };
          }
        });
      }
      return next;
    });
    if (field === 'weight') {
      setWeightEdited((prev) => ({ ...prev, [key]: true }));
    }
  };

  // Cambia el ejercicio de un slot por otro relacionado, conservando el
  // esquema (series/reps/descanso) y migrando las celdas ya escritas.
  const swapExercise = (index: number, newId: string) => {
    const old = list[index];
    if (!old || old.exerciseId === newId) {
      setSwapFor(null);
      return;
    }
    setList((prev) => {
      const copy = [...prev];
      copy[index] = { ...old, exerciseId: newId };
      return copy;
    });
    setSets((prev) => {
      const next = { ...prev };
      const last = lastWeightFor(sessions, newId);
      const prefill =
        last != null && last > 0 ? String(Math.round(toDisplay(last, unit) * 10) / 10) : '';
      for (let s = 0; s < old.sets; s++) {
        next[`${newId}-${s}`] = {
          weight: prefill,
          reps: prev[`${old.exerciseId}-${s}`]?.reps ?? String(old.reps),
          rir: prev[`${old.exerciseId}-${s}`]?.rir ?? '',
        };
        delete next[`${old.exerciseId}-${s}`];
      }
      return next;
    });
    setSwapFor(null);
  };

  const finish = () => {
    const logged: LoggedSet[] = [];
    list.forEach((re) => {
      for (let s = 0; s < re.sets; s++) {
        const entry = sets[`${re.exerciseId}-${s}`];
        const weightRaw = parseFloat((entry?.weight ?? '').replace(',', '.'));
        const reps = parseInt(entry?.reps ?? '', 10);
        const rirRaw = parseInt(entry?.rir ?? '', 10);
        if (!isNaN(reps) && reps > 0) {
          // Se guarda SIEMPRE en kg; si introduces libras, se convierte.
          logged.push({
            exerciseId: re.exerciseId,
            weight: isNaN(weightRaw) ? 0 : Math.round(toKg(weightRaw, unit) * 100) / 100,
            reps,
            rir: !isNaN(rirRaw) && rirRaw >= 0 && rirRaw <= 5 ? rirRaw : undefined,
          });
        }
      }
    });

    if (logged.length === 0) {
      Alert.alert('Sin series', 'Registra al menos una serie con repeticiones.');
      return;
    }

    // Detecta récords ANTES de guardar (compara contra el historial previo).
    const newPRs = detectNewPRs(sessions, logged);

    // Calorías estimadas con tu peso corporal más reciente (o 75 kg).
    const bodyKg = body.length > 0 ? [...body].sort((a, b) => b.date - a.date)[0].weight : 75;
    const kcal = estimateKcal(elapsed, routine.name, bodyKg);

    addSession({
      routineId: routine.id,
      routineName: routine.name,
      date: Date.now(),
      durationSeconds: elapsed,
      sets: logged,
      feeling: feeling ?? undefined,
      note: note.trim() || undefined,
      kcal,
    });
    notifySuccess();
    setCelebrate(true); // lluvia de confeti de celebración
    const vol = Math.round(logged.reduce((sum, s) => sum + s.weight * s.reps, 0));

    const prLines = newPRs
      .slice(0, 4)
      .map((p) => {
        const name = getExerciseById(p.exerciseId)?.name ?? 'Ejercicio';
        return `🏆 ${name}: ${fmtWeight(p.weight, unit)} × ${p.reps} (e1RM ${fmtWeight(p.e1rm, unit, { round: true })})`;
      })
      .join('\n');
    const volTxt = fmtWeight(vol, unit);

    Alert.alert(
      newPRs.length > 0 ? '¡NUEVO RÉCORD! 🎉' : '¡Entrenamiento guardado! 💪',
      newPRs.length > 0
        ? `${prLines}\n\n${logged.length} series · ${volTxt} · ≈${kcal} calorías.\n¡Estás más fuerte que nunca!`
        : `${logged.length} series · ${volTxt} · ≈${kcal} calorías quemadas.\n¡Bien hecho!`,
      [{ text: 'OK', onPress: () => router.replace('/(tabs)/history') }]
    );
  };

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Stack.Screen options={{ title: routine.name }} />

      <Card style={styles.timerCard}>
        <Text style={styles.timerLabel}>Tiempo de sesión</Text>
        <Text style={styles.timer}>{fmt(elapsed)}</Text>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${totalSets > 0 ? (doneCount / totalSets) * 100 : 0}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {doneCount}/{totalSets} series completadas
        </Text>
        <View style={styles.unitRow}>
          <Text style={styles.unitLabel}>Peso en</Text>
          {(['kg', 'lb'] as const).map((u) => (
            <Pressable
              key={u}
              onPress={() => setUnit(u)}
              style={[styles.unitPill, unit === u && styles.unitPillOn]}
            >
              <Text style={[styles.unitPillText, unit === u && styles.unitPillTextOn]}>
                {u}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      {/* Calentamiento del día (≤15 min), recomendado por el coach */}
      <Card style={{ marginBottom: spacing.sm }}>
        <View style={styles.exHeader}>
          <Text style={[styles.exName, { flex: 1 }]}>🔥 Calentamiento · ≤15 min</Text>
          <Pressable
            onPress={() => setWarmupOn((v) => !v)}
            style={[styles.wuToggle, warmupOn && styles.wuToggleOn]}
            hitSlop={6}
          >
            <Text style={[styles.wuToggleText, warmupOn && styles.wuToggleTextOn]}>
              {warmupOn ? 'ON' : 'OFF'}
            </Text>
          </Pressable>
        </View>
        {warmupOn ? (
          <>
            <Text style={styles.wuHint}>Recomendado para este día. Marca al completar.</Text>
            {warmupItems.map((w) => {
              const isDone = !!warmupDone[w.id];
              const demoEx = w.exerciseId ? getExerciseById(w.exerciseId) : undefined;
              return (
                <View key={w.id}>
                  <View style={styles.wuRow}>
                    <Pressable
                      onPress={() => {
                        tapMedium();
                        setWarmupDone((prev) => ({ ...prev, [w.id]: !prev[w.id] }));
                      }}
                      style={[styles.wuCheck, isDone && styles.wuCheckOn]}
                      hitSlop={6}
                    >
                      {isDone ? <Text style={styles.wuCheckMark}>✓</Text> : null}
                    </Pressable>
                    <Text style={[styles.wuName, isDone && styles.wuNameDone]}>{w.name}</Text>
                    <Text style={styles.wuDose}>{w.dose}</Text>
                    {demoEx ? (
                      <Pressable
                        onPress={() => setWuDemo((prev) => (prev === w.id ? null : w.id))}
                        hitSlop={8}
                      >
                        <Text style={styles.wuEye}>👁</Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {wuDemo === w.id && demoEx ? (
                    <View style={styles.wuDemoWrap}>
                      <ExerciseDemo exercise={demoEx} size={130} />
                    </View>
                  ) : null}
                </View>
              );
            })}
            <Pressable onPress={() => setShowWuLib((v) => !v)} style={styles.wuLibBtn} hitSlop={6}>
              <Text style={styles.wuLibBtnText}>
                {showWuLib ? '▲ Ocultar biblioteca' : '✎ Elegir ejercicios de calentamiento'}
              </Text>
            </Pressable>
            {showWuLib ? (
              <View style={styles.wuLib}>
                {WARMUPS.map((w) => {
                  const on = warmupItems.some((x) => x.id === w.id);
                  return (
                    <Pressable key={w.id} onPress={() => toggleWuItem(w)} style={styles.wuLibRow}>
                      <Text style={[styles.wuLibAdd, on && { color: colors.primary }]}>
                        {on ? '✓' : '＋'}
                      </Text>
                      <Text style={[styles.wuName, { flex: 1 }]}>{w.name}</Text>
                      <Text style={styles.wuKind}>{w.kind}</Text>
                      <Text style={styles.wuDose}>{w.dose}</Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </>
        ) : null}
      </Card>

      {list.map((re, exIndex) => {
        const ex = getExerciseById(re.exerciseId);
        // Ejercicios relacionados: mismo grupo muscular (excluye el actual).
        const related = ex
          ? EXERCISES.filter((e) => e.muscle === ex.muscle && e.id !== ex.id)
          : [];
        return (
          <Card key={`${exIndex}-${re.exerciseId}`} style={{ marginBottom: spacing.sm }}>
            <View style={styles.exHeader}>
              <Text style={[styles.exName, { flex: 1 }]}>{ex?.name ?? 'Ejercicio'}</Text>
              {ex ? (
                <Pressable
                  onPress={() => setSwapFor((prev) => (prev === exIndex ? null : exIndex))}
                  style={[styles.demoBtn, swapFor === exIndex && styles.swapBtnOn]}
                  hitSlop={6}
                >
                  <Text
                    style={[styles.demoBtnText, swapFor === exIndex && styles.swapBtnTextOn]}
                  >
                    🔀 Cambiar
                  </Text>
                </Pressable>
              ) : null}
              {ex ? (
                <Pressable
                  onPress={() =>
                    setDemoFor((prev) => (prev === re.exerciseId ? null : re.exerciseId))
                  }
                  style={[styles.demoBtn, demoFor === re.exerciseId && styles.demoBtnOn]}
                  hitSlop={6}
                >
                  <Text
                    style={[
                      styles.demoBtnText,
                      demoFor === re.exerciseId && styles.demoBtnTextOn,
                    ]}
                  >
                    👁 Técnica
                  </Text>
                </Pressable>
              ) : null}
            </View>
            {swapFor === exIndex && ex ? (
              <View style={styles.swapBox}>
                <Text style={styles.swapTitle}>
                  Cambiar por otro de {ex.muscle.toLowerCase()}:
                </Text>
                <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled>
                  {related.map((alt) => (
                    <Pressable
                      key={alt.id}
                      onPress={() => swapExercise(exIndex, alt.id)}
                      style={styles.swapOption}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.swapOptName}>{alt.name}</Text>
                        <Text style={styles.swapOptEquip}>
                          {alt.category} · {alt.equipment}
                        </Text>
                      </View>
                      <Text style={styles.swapPick}>Elegir</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            ) : null}
            {ex && demoFor === re.exerciseId ? (
              <ExerciseDemo exercise={ex} size={140} />
            ) : null}
            <View style={styles.exMetaRow}>
              <Text style={styles.exMeta}>Objetivo: {re.sets}×{re.reps}</Text>
              <View style={styles.restEditRow}>
                <Text style={styles.restEditLabel}>Descanso:</Text>
                <TextInput
                  value={String(restOverride[re.exerciseId] ?? re.restSeconds)}
                  onChangeText={(v) => {
                    const num = parseInt(v, 10);
                    setRestOverride((prev) => {
                      if (isNaN(num) || num === re.restSeconds) {
                        const next = { ...prev };
                        delete next[re.exerciseId];
                        return next;
                      }
                      return { ...prev, [re.exerciseId]: num };
                    });
                  }}
                  keyboardType="number-pad"
                  style={styles.restInput}
                  maxLength={3}
                />
                <Text style={styles.restUnit}>s</Text>
              </View>
            </View>
            {(() => {
              const presc = doubleProgression(sessions, re.exerciseId, re.reps);
              const txt =
                presc.weightKg == null
                  ? lastWeightFor(sessions, re.exerciseId) === 0
                    ? 'A peso corporal: si lo dominas, añade carga.'
                    : 'Primera vez: elige un peso con el que completes las reps con buena técnica.'
                  : presc.levelUp
                    ? `⬆️ ¡Objetivo cumplido la última vez! Hoy sube a ${fmtWeight(presc.weightKg, unit, { round: true })} (ya prescrito).`
                    : `Repite ${fmtWeight(presc.weightKg, unit)} hasta completar ${re.sets}×${re.reps}; entonces te subo el peso.`;
              return <Text style={styles.coachHint}>🎯 {txt}</Text>;
            })()}
            {(() => {
              const e1 = e1rmFor(sessions, re.exerciseId);
              return e1 != null ? (
                <Text style={styles.e1rmHint}>
                  💪 1RM estimado: {fmtWeight(e1, unit, { round: true })} — supera tu mejor
                  serie y hay récord
                </Text>
              ) : null;
            })()}

            <View style={styles.headerRow}>
              <Text style={[styles.colHead, styles.colSet]}>Serie</Text>
              <Text style={[styles.colHead, styles.colInput]}>Peso ({unit})</Text>
              <Text style={[styles.colHead, styles.colInput]}>Reps</Text>
              <Text style={[styles.colHead, styles.colRir]}>RIR</Text>
              <Text style={[styles.colHead, styles.colCheck]}>✓</Text>
            </View>

            {Array.from({ length: re.sets }).map((_, s) => {
              const key = `${re.exerciseId}-${s}`;
              const isDone = !!done[key];
              return (
                <View key={key} style={[styles.setRow, isDone && styles.setRowDone]}>
                  <Text style={[styles.colSet, styles.setIndex]}>{s + 1}</Text>
                  <TextInput
                    value={sets[key]?.weight ?? ''}
                    onChangeText={(v) => update(key, 'weight', v)}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.cellInput, styles.colInput]}
                  />
                  <TextInput
                    value={sets[key]?.reps ?? ''}
                    onChangeText={(v) => update(key, 'reps', v)}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.cellInput, styles.colInput]}
                  />
                  <TextInput
                    value={sets[key]?.rir ?? ''}
                    onChangeText={(v) => update(key, 'rir', v)}
                    keyboardType="number-pad"
                    maxLength={1}
                    placeholder="–"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.cellInput, styles.colRir]}
                  />
                  <Pressable
                    onPress={() => toggleDone(key, restOverride[re.exerciseId] ?? re.restSeconds)}
                    style={({ pressed }) => [
                      styles.checkBox,
                      isDone && styles.checkBoxDone,
                      styles.colCheck,
                      pressed && { transform: [{ scale: 0.86 }] },
                    ]}
                  >
                    <Text style={[styles.checkMark, isDone && styles.checkMarkDone]}>✓</Text>
                  </Pressable>
                </View>
              );
            })}
          </Card>
        );
      })}

      <Card style={styles.feelingCard}>
        <Text style={styles.feelingTitle}>¿Cómo fue el entreno?</Text>
        <View style={styles.feelingRow}>
          {['😫', '😕', '😐', '🙂', '💪'].map((emoji, i) => {
            const val = i + 1;
            const on = feeling === val;
            return (
              <Pressable
                key={val}
                onPress={() => setFeeling(on ? null : val)}
                style={[styles.feelingBtn, on && styles.feelingBtnOn]}
              >
                <Text style={styles.feelingEmoji}>{emoji}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder="Notas: cómo te sentiste, pesos, molestias…"
          placeholderTextColor={colors.textMuted}
          multiline
          style={styles.noteInput}
        />
      </Card>

      <Button title="✔ Finalizar y guardar" onPress={finish} style={{ marginVertical: spacing.md }} />
      </ScrollView>

      {/* Descanso automático flotante */}
      {rest ? (
        <View style={styles.restBanner}>
          <View style={styles.restRow}>
            <View>
              <Text style={styles.restLabel}>DESCANSO</Text>
              <Text
                style={[styles.restTime, remaining <= 5 && styles.restTimeAlert]}
              >
                {fmt(Math.max(0, remaining))}
              </Text>
            </View>
            <View style={styles.restActions}>
              <Button
                title="+15s"
                variant="ghost"
                onPress={() =>
                  setRest((p) => (p ? { endAt: p.endAt + 15000, total: p.total + 15 } : p))
                }
              />
              <Button title="Saltar" onPress={() => setRest(null)} />
            </View>
          </View>
          <View style={styles.restBar}>
            <View
              style={[
                styles.restBarFill,
                { width: `${rest.total > 0 ? (Math.max(0, remaining) / rest.total) * 100 : 0}%` },
                remaining <= 5 && { backgroundColor: colors.streak },
              ]}
            />
          </View>
        </View>
      ) : null}

      <Confetti run={celebrate} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.md, paddingBottom: 120 },
  restBanner: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primaryDark,
    padding: spacing.md,
  },
  restRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  restLabel: { color: colors.textMuted, fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  restTime: {
    color: colors.primary,
    fontSize: 34,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
  },
  restTimeAlert: { color: colors.streak },
  restActions: { flexDirection: 'row', gap: spacing.sm },
  restBar: {
    height: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 3,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  restBarFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 3 },
  timerCard: { alignItems: 'center', marginBottom: spacing.md },
  timerLabel: { color: colors.textMuted, fontSize: 13 },
  timer: { color: colors.primary, fontSize: 40, fontWeight: '900', fontVariant: ['tabular-nums'] },
  progressTrack: {
    width: '100%',
    height: 8,
    backgroundColor: colors.surfaceAlt,
    borderRadius: 4,
    marginTop: spacing.sm,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: colors.primary, borderRadius: 4 },
  progressText: { color: colors.textMuted, fontSize: 12, marginTop: spacing.xs, fontWeight: '700' },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.sm },
  unitLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  unitPill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitPillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  unitPillText: { color: colors.textMuted, fontSize: 13, fontWeight: '800' },
  unitPillTextOn: { color: '#08130c' },
  exHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  wuToggle: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  wuToggleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  wuToggleText: { color: colors.textMuted, fontSize: 12, fontWeight: '900' },
  wuToggleTextOn: { color: '#08130c' },
  wuHint: { color: colors.textMuted, fontSize: 12, marginTop: 2, marginBottom: spacing.xs },
  wuRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  wuCheck: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wuCheckOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  wuCheckMark: { color: '#08130c', fontWeight: '900', fontSize: 13 },
  wuName: { color: colors.text, fontSize: 14, fontWeight: '600', flex: 1 },
  wuNameDone: { color: colors.textMuted, textDecorationLine: 'line-through' },
  wuDose: { color: colors.accent, fontSize: 12, fontWeight: '800' },
  wuEye: { fontSize: 16 },
  wuDemoWrap: { alignItems: 'center', marginTop: spacing.sm, paddingVertical: spacing.sm },
  wuLibBtn: { marginTop: spacing.xs, paddingVertical: spacing.xs },
  wuLibBtnText: { color: colors.accent, fontSize: 13, fontWeight: '800' },
  wuLib: {
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginTop: spacing.xs,
  },
  wuLibRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  wuLibAdd: { color: colors.textMuted, fontSize: 16, fontWeight: '900', width: 20, textAlign: 'center' },
  wuKind: { color: colors.textMuted, fontSize: 11 },
  exName: { color: colors.text, fontSize: 16, fontWeight: '800' },
  demoBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
  },
  demoBtnOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  demoBtnText: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  demoBtnTextOn: { color: colors.accent },
  swapBtnOn: { borderColor: colors.warn, backgroundColor: '#2b2413' },
  swapBtnTextOn: { color: colors.warn },
  swapBox: {
    marginTop: spacing.sm,
    backgroundColor: colors.bgElevated,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warn,
    padding: spacing.sm,
  },
  swapTitle: { color: colors.text, fontSize: 13, fontWeight: '800', marginBottom: spacing.xs },
  swapOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  swapOptName: { color: colors.text, fontSize: 14, fontWeight: '700' },
  swapOptEquip: { color: colors.textMuted, fontSize: 12, marginTop: 1 },
  swapPick: { color: colors.warn, fontSize: 13, fontWeight: '800' },
  exMeta: { color: colors.textMuted, fontSize: 13 },
  exMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  restEditRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  restEditLabel: { color: colors.textMuted, fontSize: 12, fontWeight: '600' },
  restInput: {
    backgroundColor: colors.bgElevated,
    color: colors.text,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 2,
    paddingHorizontal: 4,
    textAlign: 'center',
    width: 40,
    fontSize: 13,
  },
  restUnit: { color: colors.textMuted, fontSize: 12, fontWeight: '600', width: 14 },
  coachHint: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  e1rmHint: {
    color: colors.streak,
    fontSize: 12,
    lineHeight: 17,
    marginTop: -4,
    marginBottom: spacing.sm,
  },
  headerRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.xs },
  colHead: { color: colors.textMuted, fontSize: 12, fontWeight: '700' },
  colSet: { width: 40, textAlign: 'center' },
  colInput: { flex: 1, textAlign: 'center' },
  colRir: { width: 44, textAlign: 'center' },
  colCheck: { width: 40, textAlign: 'center' },
  setRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.xs,
    borderRadius: radius.sm,
    paddingVertical: 2,
  },
  setRowDone: { backgroundColor: colors.primarySoft },
  setIndex: { color: colors.text, fontWeight: '700' },
  cellInput: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    fontSize: 15,
  },
  checkBox: {
    height: 34,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBoxDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: colors.surfaceAlt, fontSize: 16, fontWeight: '900' },
  checkMarkDone: { color: '#08130c' },
  feelingCard: { marginTop: spacing.sm },
  feelingTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: spacing.sm },
  feelingRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  feelingBtn: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feelingBtnOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  feelingEmoji: { fontSize: 24 },
  noteInput: {
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 15,
    minHeight: 70,
    textAlignVertical: 'top',
  },
  notFound: { color: colors.textMuted, padding: spacing.xl, textAlign: 'center' },
});
