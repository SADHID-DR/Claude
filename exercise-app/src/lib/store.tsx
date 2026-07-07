import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Routine, WorkoutSession } from '@/lib/types';
import { StorageKeys, loadJSON, saveJSON, makeId } from '@/lib/storage';

interface StoreValue {
  ready: boolean;
  routines: Routine[];
  sessions: WorkoutSession[];
  addRoutine: (input: Omit<Routine, 'id' | 'createdAt'>) => Routine;
  updateRoutine: (routine: Routine) => void;
  deleteRoutine: (id: string) => void;
  addSession: (input: Omit<WorkoutSession, 'id'>) => WorkoutSession;
  deleteSession: (id: string) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);

  // Carga inicial desde almacenamiento local.
  useEffect(() => {
    (async () => {
      const [r, s] = await Promise.all([
        loadJSON<Routine[]>(StorageKeys.routines, []),
        loadJSON<WorkoutSession[]>(StorageKeys.sessions, []),
      ]);
      setRoutines(r);
      setSessions(s);
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

  const value = useMemo<StoreValue>(
    () => ({
      ready,
      routines,
      sessions,
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
      addSession: (input) => {
        const session: WorkoutSession = { ...input, id: makeId() };
        setSessions((prev) => [session, ...prev]);
        return session;
      },
      deleteSession: (id) => {
        setSessions((prev) => prev.filter((s) => s.id !== id));
      },
    }),
    [ready, routines, sessions]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de StoreProvider');
  return ctx;
}
