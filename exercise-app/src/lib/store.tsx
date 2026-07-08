import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Cycle, Plan, Routine, RoutineExercise, WorkoutSession } from '@/lib/types';
import { StorageKeys, loadJSON, saveJSON, makeId } from '@/lib/storage';

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
  addRoutine: (input: Omit<Routine, 'id' | 'createdAt'>) => Routine;
  updateRoutine: (routine: Routine) => void;
  deleteRoutine: (id: string) => void;
  addPlan: (input: NewPlanInput) => Plan;
  deletePlan: (id: string) => void;
  renamePlan: (id: string, name: string) => void;
  updatePlan: (plan: Plan) => void;
  duplicatePlan: (id: string) => void;
  setActivePlan: (id: string | null) => void;
  setRemindersEnabled: (v: boolean) => void;
  setReminderHour: (h: number) => void;
  addSession: (input: Omit<WorkoutSession, 'id'>) => WorkoutSession;
  deleteSession: (id: string) => void;
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

  // Carga inicial desde almacenamiento local.
  useEffect(() => {
    (async () => {
      const [r, s, p, active, rem, hour] = await Promise.all([
        loadJSON<Routine[]>(StorageKeys.routines, []),
        loadJSON<WorkoutSession[]>(StorageKeys.sessions, []),
        loadJSON<Plan[]>(StorageKeys.plans, []),
        loadJSON<string | null>(StorageKeys.activePlan, null),
        loadJSON<boolean>(StorageKeys.reminders, false),
        loadJSON<number>(StorageKeys.reminderHour, 18),
      ]);
      setRoutines(r);
      setSessions(s);
      setPlans(p);
      setActivePlanId(active);
      setRemindersEnabledState(rem);
      setReminderHourState(hour);
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

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      routines,
      sessions,
      plans,
      activePlanId,
      remindersEnabled,
      reminderHour,
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
      setActivePlan: (id) => setActivePlanId(id),
      setRemindersEnabled: (v) => setRemindersEnabledState(v),
      setReminderHour: (h) => setReminderHourState(h),
      addSession: (input) => {
        const session: WorkoutSession = { ...input, id: makeId() };
        setSessions((prev) => [session, ...prev]);
        return session;
      },
      deleteSession: (id) => {
        setSessions((prev) => prev.filter((s) => s.id !== id));
      },
    }),
    [ready, routines, sessions, plans, activePlanId, remindersEnabled, reminderHour]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider');
  return ctx;
}
