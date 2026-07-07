import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Plan, Routine, RoutineExercise, WorkoutSession } from '@/lib/types';
import { StorageKeys, loadJSON, saveJSON, makeId } from '@/lib/storage';

/** Datos para guardar un plan semanal como bloque. */
export interface NewPlanInput {
  name: string;
  goal: string;
  days: number;
  age: number;
  restDays: number;
  schedule: string[];
  warmup: string;
  dayRoutines: { name: string; exercises: RoutineExercise[] }[];
}

interface StoreValue {
  ready: boolean;
  routines: Routine[];
  sessions: WorkoutSession[];
  plans: Plan[];
  addRoutine: (input: Omit<Routine, 'id' | 'createdAt'>) => Routine;
  updateRoutine: (routine: Routine) => void;
  deleteRoutine: (id: string) => void;
  addPlan: (input: NewPlanInput) => void;
  deletePlan: (id: string) => void;
  addSession: (input: Omit<WorkoutSession, 'id'>) => WorkoutSession;
  deleteSession: (id: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);

  // Carga inicial desde almacenamiento local.
  useEffect(() => {
    (async () => {
      const [r, s, p] = await Promise.all([
        loadJSON<Routine[]>(StorageKeys.routines, []),
        loadJSON<WorkoutSession[]>(StorageKeys.sessions, []),
        loadJSON<Plan[]>(StorageKeys.plans, []),
      ]);
      setRoutines(r);
      setSessions(s);
      setPlans(p);
      setReady(true);
    })();
  }, []);

  // Persiste automáticamente cada cambio (tras la carga inicial).
  useEffect(() => {
    if (ready) saveJSON(StorageKeys.routines, routines);
  }, [routines, ready]);

  useEffect(() => {
    if (ready) saveJSON(StorageKeys.sessions, sessions);
  }, [sessions, ready]);

  useEffect(() => {
    if (ready) saveJSON(StorageKeys.plans, plans);
  }, [plans, ready]);

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      routines,
      sessions,
      plans,
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
        };
        setPlans((prev) => [plan, ...prev]);
      },
      deletePlan: (id) => {
        setPlans((prev) => prev.filter((p) => p.id !== id));
        setRoutines((prev) => prev.filter((r) => r.planId !== id));
      },
      addSession: (input) => {
        const session: WorkoutSession = { ...input, id: makeId() };
        setSessions((prev) => [session, ...prev]);
        return session;
      },
      deleteSession: (id) => {
        setSessions((prev) => prev.filter((s) => s.id !== id));
      },
    }),
    [ready, routines, sessions, plans]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider');
  return ctx;
}
