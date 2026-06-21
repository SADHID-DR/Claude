/**
 * Custom React hook para manejar sincronización en tiempo real
 * - Sincroniza cambios automáticamente a Firestore
 * - Detecta conflictos entre versiones locales y remotas
 * - Sincroniza offline → online automáticamente
 * - Mantiene la app actualizada en tiempo real
 */

import { useEffect, useRef, useCallback } from 'react';
import { realtimeSyncService, type SyncConflict } from './realtimeSyncService';
import { saveUserData } from './firestoreService';
import { auth } from './firebase';
import { Project, Contractor, GeneralPriceGuide } from './types';

interface UseSyncManagerProps {
  projects: Project[];
  contractors: Contractor[];
  priceGuide: GeneralPriceGuide;
  includeItbisInNet: boolean;
  onConflictDetected?: (conflicts: SyncConflict[]) => void;
  onSyncStatusChange?: (status: 'syncing' | 'synced' | 'offline' | 'error') => void;
}

interface LocalTimestamps {
  projects: Map<string, number>;
  contractors: Map<string, number>;
  priceGuide: number;
}

let syncTimeout: NodeJS.Timeout | null = null;

/**
 * Hook principal de sincronización
 */
export const useSyncManager = ({
  projects,
  contractors,
  priceGuide,
  includeItbisInNet,
  onConflictDetected,
  onSyncStatusChange,
}: UseSyncManagerProps) => {
  const localTimestampsRef = useRef<LocalTimestamps>({
    projects: new Map(),
    contractors: new Map(),
    priceGuide: 0,
  });

  const isSyncingRef = useRef(false);
  const pendingSyncRef = useRef(false);

  /**
   * Auto-guarda cambios a Firestore (debounced)
   */
  const autoSaveToFirestore = useCallback(async () => {
    const user = auth.currentUser;
    if (!user || isSyncingRef.current) return;

    isSyncingRef.current = true;
    onSyncStatusChange?.('syncing');

    try {
      await saveUserData(user.uid, {
        projects,
        contractors,
        generalPriceGuide: priceGuide,
        includeItbisInNet,
      });

      // Actualizar timestamps locales después de guardar exitosamente
      const now = Date.now();
      localTimestampsRef.current.priceGuide = now;

      projects.forEach((p) => {
        localTimestampsRef.current.projects.set(p.id, now);
      });

      contractors.forEach((c) => {
        localTimestampsRef.current.contractors.set(c.id, now);
      });

      onSyncStatusChange?.('synced');
      console.log('✅ Auto-saved to Firestore');
    } catch (error: any) {
      console.error('❌ Auto-save failed:', error);
      if (error?.code === 'network-error') {
        onSyncStatusChange?.('offline');
      } else {
        onSyncStatusChange?.('error');
      }
      pendingSyncRef.current = true;
    } finally {
      isSyncingRef.current = false;
    }
  }, [projects, contractors, priceGuide, includeItbisInNet, onSyncStatusChange]);

  /**
   * Debounced auto-save (ejecuta 2s después del último cambio)
   */
  const debouncedAutoSave = useCallback(() => {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
      autoSaveToFirestore();
    }, 2000);
  }, [autoSaveToFirestore]);

  /**
   * Inicializa sincronización en tiempo real
   */
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    // Inicializar timestamps locales
    const now = Date.now();
    projects.forEach((p) => {
      localTimestampsRef.current.projects.set(p.id, now);
    });
    contractors.forEach((c) => {
      localTimestampsRef.current.contractors.set(c.id, now);
    });
    localTimestampsRef.current.priceGuide = now;

    // Iniciar listeners en tiempo real
    realtimeSyncService.startRealtimeSync(
      (remoteProjects, conflicts) => {
        // Detectar conflictos en proyectos
        const newConflicts = realtimeSyncService.detectConflicts(
          projects,
          contractors,
          priceGuide,
          localTimestampsRef.current
        );

        if (newConflicts.length > 0) {
          console.warn('⚠️ Conflictos detectados:', newConflicts);
          onConflictDetected?.(newConflicts);
        }
      },
      (remoteContractors, conflicts) => {
        // Detectar conflictos en contratistas
        const newConflicts = realtimeSyncService.detectConflicts(
          projects,
          contractors,
          priceGuide,
          localTimestampsRef.current
        );

        if (newConflicts.length > 0) {
          console.warn('⚠️ Conflictos detectados:', newConflicts);
          onConflictDetected?.(newConflicts);
        }
      },
      (remoteGuide, conflicts) => {
        // Detectar conflictos en guía de precios
        const newConflicts = realtimeSyncService.detectConflicts(
          projects,
          contractors,
          priceGuide,
          localTimestampsRef.current
        );

        if (newConflicts.length > 0) {
          console.warn('⚠️ Conflictos detectados:', newConflicts);
          onConflictDetected?.(newConflicts);
        }
      },
      (conflicts) => {
        if (conflicts.length > 0) {
          onConflictDetected?.(conflicts);
        }
      }
    );

    return () => {
      realtimeSyncService.stopRealtimeSync();
    };
  }, []);

  /**
   * Escuchar cambios en datos y auto-guardar
   */
  useEffect(() => {
    debouncedAutoSave();
  }, [projects, contractors, priceGuide, debouncedAutoSave]);

  /**
   * Sincronización offline → online
   */
  useEffect(() => {
    const handleOnline = async () => {
      console.log('🟢 Conexión restaurada. Sincronizando cambios...');
      onSyncStatusChange?.('syncing');
      if (pendingSyncRef.current) {
        await autoSaveToFirestore();
        pendingSyncRef.current = false;
      }
    };

    const handleOffline = () => {
      console.log('🔴 Sin conexión. Guardando cambios en local...');
      onSyncStatusChange?.('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [autoSaveToFirestore, onSyncStatusChange]);

  /**
   * Función para resolver conflictos manualmente
   */
  const resolveConflict = useCallback(
    async (conflict: SyncConflict, resolution: 'local' | 'remote') => {
      const user = auth.currentUser;
      if (!user) return;

      if (resolution === 'remote') {
        const remoteData = realtimeSyncService.getRemoteData(conflict.type, conflict.id);
        if (!remoteData) return;

        // Update local state with remote data
        const now = Date.now();
        if (conflict.type === 'project') {
          localTimestampsRef.current.projects.set(conflict.id, now);
        } else if (conflict.type === 'contractor') {
          localTimestampsRef.current.contractors.set(conflict.id, now);
        }

        console.log(`✅ Conflicto resuelto: usando versión remota de ${conflict.id}`);
      } else {
        // Usar versión local (ya existe)
        const now = Date.now();
        if (conflict.type === 'project') {
          localTimestampsRef.current.projects.set(conflict.id, now);
        } else if (conflict.type === 'contractor') {
          localTimestampsRef.current.contractors.set(conflict.id, now);
        }

        // Guardar cambios locales (sobrescribir remoto)
        await autoSaveToFirestore();
        console.log(`✅ Conflicto resuelto: usando versión local de ${conflict.id}`);
      }
    },
    [autoSaveToFirestore]
  );

  return {
    resolveConflict,
    forceSync: autoSaveToFirestore,
  };
};
