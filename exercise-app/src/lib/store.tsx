import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { BodyEntry, Cycle, Plan, Routine, RoutineExercise, WorkoutSession } from '@/lib/types';
import { StorageKeys, loadJSON, saveJSON, makeId } from '@/lib/storage';
import { WeightUnit } from '@/lib/units';

/** Datos para guardar un plan (semanal/bisemanal/mensual) como bloque. */
export interface NewPlanInput {
  name: string;
  goal: string;
  days: number;
  age: number;
  restDays: number;
  schedule: string[];
  warmup: string;
  cycle: Cycle;
  weeks: number;
  dayRoutines: { name: string; exercises: RoutineExercise[]; week: number }[];
}

interface StoreValue {
  ready: boolean;
  routines: Routine[];
  sessions: WorkoutSession[];
  plans: Plan[];
  activePlanId: string | null;
  remindersEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  onboarded: boolean;
  setOnboarded: (v: boolean) => void;
  /** Altura en cm (para IMC). */
  height: number | null;
  setHeight: (cm: number | null) => void;
  /** Meta de peso corporal en kg. */
  weightGoal: number | null;
  setWeightGoal: (kg: number | null) => void;
  /** Metas de fuerza: e1RM objetivo (kg) por ejercicio. */
  strengthGoals: Record<string, number>;
  setStrengthGoal: (exerciseId: string, kg: number | null) => void;
  body: BodyEntry[];
  unit: WeightUnit;
  setUnit: (u: WeightUnit) => void;
  addBodyEntry: (input: Omit<BodyEntry, 'id'>) => void;
  deleteBodyEntry: (id: string) => void;
  addRoutine: (input: Omit<Routine, 'id' | 'createdAt'>) => Routine;
  updateRoutine: (routine: Routine) => void;
  deleteRoutine: (id: string) => void;
  addPlan: (input: NewPlanInput) => Plan;
  deletePlan: (id: string) => void;
  renamePlan: (id: string, name: string) => void;
  updatePlan: (plan: Plan) => void;
  duplicatePlan: (id: string) => void;
  /** Intercambia un día del plan con su vecino dentro de la misma semana. */
  movePlanDay: (planId: string, routineId: string, dir: -1 | 1) => void;
  setActivePlan: (id: string | null) => void;
  setRemindersEnabled: (v: boolean) => void;
  setReminderHour: (h: number) => void;
  setReminderMinute: (m: number) => void;
  addSession: (input: Omit<WorkoutSession, 'id'>) => WorkoutSession;
  deleteSession: (id: string) => void;
  clearAllSessions: () => void;
  clearBodyData: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [remindersEnabled, setRemindersEnabledState] = useState(false);
  const [reminderHour, setReminderHourState] = useState(18);
  const [reminderMinute, setReminderMinuteState] = useState(0);
  const [onboarded, setOnboardedState] = useState(true); // asume true hasta cargar
  const [height, setHeightState] = useState<number | null>(null);
  const [weightGoal, setWeightGoalState] = useState<number | null>(null);
  const [strengthGoals, setStrengthGoals] = useState<Record<string, number>>({});
  const [body, setBody] = useState<BodyEntry[]>([]);
  const [unit, setUnitState] = useState<WeightUnit>('kg');

  // Carga inicial desde almacenamiento local.
  useEffect(() => {
    (async () => {
      const [r, s, p, active, rem, hour, bodyData, unitData, minuteData, onboardedData, heightData, goalData, sGoals] = await Promise.all([
        loadJSON<Routine[]>(StorageKeys.routines, []),
        loadJSON<WorkoutSession[]>(StorageKeys.sessions, []),
        loadJSON<Plan[]>(StorageKeys.plans, []),
        loadJSON<string | null>(StorageKeys.activePlan, null),
        loadJSON<boolean>(StorageKeys.reminders, false),
        loadJSON<number>(StorageKeys.reminderHour, 18),
        loadJSON<BodyEntry[]>(StorageKeys.body, []),
        loadJSON<WeightUnit>(StorageKeys.unit, 'kg'),
        loadJSON<number>(StorageKeys.reminderMinute, 0),
        loadJSON<boolean>(StorageKeys.onboarded, false),
        loadJSON<number | null>(StorageKeys.height, null),
        loadJSON<number | null>(StorageKeys.weightGoal, null),
        loadJSON<Record<string, number>>(StorageKeys.strengthGoals, {}),
      ]);
      setRoutines(r);
      setSessions(s);
      setPlans(p);
      setActivePlanId(active);
      setRemindersEnabledState(rem);
      setReminderHourState(hour);
      setReminderMinuteState(minuteData);
      setOnboardedState(onboardedData);
      setHeightState(heightData);
      setWeightGoalState(goalData);
      setStrengthGoals(sGoals);
      setBody(bodyData);
      setUnitState(unitData === 'lb' ? 'lb' : 'kg');
      setReady(true);
    })();
  }, []);

  // Persistencia automática (tras la carga inicial).
  useEffect(() => {
    if (ready) saveJSON(StorageKeys.routines, routines);
  }, [routines, ready]);
  useEffect(() => {
    if (ready) saveJSON(StorageKeys.sessions, sessions);
  }, [sessions, ready]);
  useEffect(() => {
    if (ready) saveJSON(StorageKeys.plans, plans);
  }, [plans, ready]);
  useEffect(() => {
    if (ready) saveJSON(StorageKeys.activePlan, activePlanId);
  }, [activePlanId, ready]);
  useEffect(() => {
    if (ready) saveJSON(StorageKeys.reminders, remindersEnabled);
  }, [remindersEnabled, ready]);
  useEffect(() => {
    if (ready) saveJSON(StorageKeys.reminderHour, reminderHour);
  }, [reminderHour, ready]);
  useEffect(() => {
    if (ready) saveJSON(StorageKeys.body, body);
  }, [body, ready]);
  useEffect(() => {
    if (ready) saveJSON(StorageKeys.unit, unit);
  }, [unit, ready]);
  useEffect(() => {
    if (ready) saveJSON(StorageKeys.reminderMinute, reminderMinute);
  }, [reminderMinute, ready]);
  useEffect(() => {
    if (ready) saveJSON(StorageKeys.onboarded, onboarded);
  }, [onboarded, ready]);
  useEffect(() => {
    if (ready) saveJSON(StorageKeys.height, height);
  }, [height, ready]);
  useEffect(() => {
    if (ready) saveJSON(StorageKeys.weightGoal, weightGoal);
  }, [weightGoal, ready]);
  useEffect(() => {
    if (ready) saveJSON(StorageKeys.strengthGoals, strengthGoals);
  }, [strengthGoals, ready]);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      routines,
      sessions,
      plans,
      activePlanId,
      remindersEnabled,
      reminderHour,
      reminderMinute,
      onboarded,
      setOnboarded: (v) => setOnboardedState(v),
      height,
      setHeight: (cm) => setHeightState(cm),
      weightGoal,
      setWeightGoal: (kg) => setWeightGoalState(kg),
      strengthGoals,
      setStrengthGoal: (exerciseId, kg) => {
        setStrengthGoals((prev) => {
          const next = { ...prev };
          if (kg == null || kg <= 0) delete next[exerciseId];
          else next[exerciseId] = kg;
          return next;
        });
      },
      body,
      unit,
      setUnit: (u) => setUnitState(u),
      addBodyEntry: (input) => {
        const entry: BodyEntry = { ...input, id: makeId() };
        setBody((prev) => [entry, ...prev]);
      },
      deleteBodyEntry: (id) => {
        setBody((prev) => prev.filter((e) => e.id !== id));
      },
      addRoutine: (input) => {
        const routine: Routine = { ...input, id: makeId(), createdAt: Date.now() };
        setRoutines((prev) => [routine, ...prev]);
        return routine;
      },
      updateRoutine: (routine) => {
        setRoutines((prev) => prev.map((r) => (r.id === routine.id ? routine : r)));
      },
      deleteRoutine: (id) => {
        setRoutines((prev) => prev.filter((r) => r.id !== id));
      },
      addPlan: (input) => {
        const planId = makeId();
        const now = Date.now();
        const created: Routine[] = input.dayRoutines.map((d, i) => ({
          id: `${planId}-${i}`,
          name: d.name,
          exercises: d.exercises,
          createdAt: now,
          planId,
          week: d.week,
        }));
        setRoutines((prev) => [...created, ...prev]);
        const plan: Plan = {
          id: planId,
          name: input.name,
          goal: input.goal,
          days: input.days,
          age: input.age,
          createdAt: now,
          routineIds: created.map((r) => r.id),
          restDays: input.restDays,
          schedule: input.schedule,
          warmup: input.warmup,
          cycle: input.cycle,
          weeks: input.weeks,
        };
        setPlans((prev) => [plan, ...prev]);
        setActivePlanId(plan.id);
        return plan;
      },
      deletePlan: (id) => {
        setPlans((prev) => prev.filter((p) => p.id !== id));
        setRoutines((prev) => prev.filter((r) => r.planId !== id));
        setActivePlanId((prev) => (prev === id ? null : prev));
      },
      renamePlan: (id, name) => {
        setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
      },
      updatePlan: (plan) => {
        setPlans((prev) => prev.map((p) => (p.id === plan.id ? plan : p)));
      },
      duplicatePlan: (id) => {
        setPlans((prevPlans) => {
          const src = prevPlans.find((p) => p.id === id);
          if (!src) return prevPlans;
          const newId = makeId();
          const now = Date.now();
          setRoutines((prevRoutines) => {
            const srcRoutines = src.routineIds
              .map((rid) => prevRoutines.find((r) => r.id === rid))
              .filter(Boolean) as Routine[];
            const copies = srcRoutines.map((r, i) => ({
              ...r,
              id: `${newId}-${i}`,
              planId: newId,
              createdAt: now,
            }));
            return [...copies, ...prevRoutines];
          });
          const copy: Plan = {
            ...src,
            id: newId,
            name: `${src.name} (copia)`,
            createdAt: now,
            routineIds: src.routineIds.map((_, i) => `${newId}-${i}`),
          };
          return [copy, ...prevPlans];
        });
      },
      movePlanDay: (planId, routineId, dir) => {
        const plan = plans.find((p) => p.id === planId);
        const target = routines.find((r) => r.id === routineId);
        if (!plan || !target) return;
        const week = target.week ?? 1;
        // Posiciones (en routineIds) de los días de esa misma semana, en orden.
        const sameWeek = plan.routineIds
          .map((rid, idx) => ({ rid, idx }))
          .filter(({ rid }) => {
            const rr = routines.find((r) => r.id === rid);
            return (rr?.week ?? 1) === week;
          });
        const pos = sameWeek.findIndex((x) => x.rid === routineId);
        const swap = pos + dir;
        if (pos < 0 || swap < 0 || swap >= sameWeek.length) return;
        const a = sameWeek[pos].idx;
        const b = sameWeek[swap].idx;
        const newIds = [...plan.routineIds];
        [newIds[a], newIds[b]] = [newIds[b], newIds[a]];
        setPlans((prev) =>
          prev.map((p) => (p.id === planId ? { ...p, routineIds: newIds } : p))
        );
        // Renumera "Día N" según la nueva posición dentro de la semana.
        const orderedWeekIds = newIds.filter((rid) => {
          const rr = routines.find((r) => r.id === rid);
          return (rr?.week ?? 1) === week;
        });
        setRoutines((prev) =>
          prev.map((r) => {
            const idx = orderedWeekIds.indexOf(r.id);
            if (idx < 0 || !/Día \d+/.test(r.name)) return r;
            return { ...r, name: r.name.replace(/Día \d+/, `Día ${idx + 1}`) };
          })
        );
      },
      setActivePlan: (id) => setActivePlanId(id),
      setRemindersEnabled: (v) => setRemindersEnabledState(v),
      setReminderHour: (h) => setReminderHourState(h),
      setReminderMinute: (m) => setReminderMinuteState(Math.max(0, Math.min(59, m))),
      addSession: (input) => {
        const session: WorkoutSession = { ...input, id: makeId() };
        setSessions((prev) => [session, ...prev]);
        return session;
      },
      deleteSession: (id) => {
        setSessions((prev) => prev.filter((s) => s.id !== id));
      },
      clearAllSessions: () => {
        setSessions([]);
      },
      clearBodyData: () => {
        setBody([]);
        setHeightState(null);
        setWeightGoalState(null);
      },
    }),
    [ready, routines, sessions, plans, activePlanId, remindersEnabled, reminderHour, reminderMinute, onboarded, height, weightGoal, strengthGoals, body, unit]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider');
  return ctx;
}
