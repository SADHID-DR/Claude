/**
 * Real-time Firestore synchronization service
 * - Escucha cambios en tiempo real desde Firestore
 * - Detecta conflictos cuando hay cambios concurrentes
 * - Sincroniza automáticamente cambios offline → online
 * - Mantiene la app siempre actualizada
 */

import {
  collection,
  doc,
  onSnapshot,
  getDocs,
  DocumentSnapshot,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Project, Contractor, GeneralPriceGuide } from './types';

interface SyncConflict {
  type: 'project' | 'contractor' | 'priceGuide';
  id: string;
  localTimestamp: number;
  remoteTimestamp: number;
  remoteName?: string;
}

class RealtimeSyncService {
  private unsubscribers: (() => void)[] = [];
  private remoteDataCache: {
    projects: Map<string, { data: Project; timestamp: number }>;
    contractors: Map<string, { data: Contractor; timestamp: number }>;
    priceGuide: { data: GeneralPriceGuide; timestamp: number } | null;
  } = {
    projects: new Map(),
    contractors: new Map(),
    priceGuide: null,
  };

  /**
   * Inicializa listeners en tiempo real para cambios remotos
   */
  startRealtimeSync(
    onProjectsChange: (projects: Project[], conflicts: SyncConflict[]) => void,
    onContractorsChange: (contractors: Contractor[], conflicts: SyncConflict[]) => void,
    onPriceGuideChange: (guide: GeneralPriceGuide, conflicts: SyncConflict[]) => void,
    onConflict: (conflicts: SyncConflict[]) => void
  ): void {
    const user = auth.currentUser;
    if (!user) {
      console.warn('[RealtimeSync] No user logged in');
      return;
    }

    const uid = user.uid;

    // Escuchar proyectos en tiempo real
    const projectsCollRef = collection(db, 'users', uid, 'projects');
    const unsubProjects = onSnapshot(
      projectsCollRef,
      (snapshot) => {
        const projects: Project[] = [];
        const conflicts: SyncConflict[] = [];

        snapshot.docs.forEach((docSnap) => {
          const project = docSnap.data() as Project;
          const timestamp = (docSnap.metadata.hasPendingWrites
            ? Date.now()
            : new Date((docSnap.data() as any).updatedAt || Date.now()).getTime());

          // Guardar en cache para detectar conflictos
          this.remoteDataCache.projects.set(project.id, {
            data: project,
            timestamp,
          });

          projects.push(project);
        });

        onProjectsChange(projects, conflicts);
      },
      (error) => {
        console.error('[RealtimeSync] Projects listener error:', error);
      }
    );

    // Escuchar contratistas en tiempo real
    const contractorsCollRef = collection(db, 'users', uid, 'contractors');
    const unsubContractors = onSnapshot(
      contractorsCollRef,
      (snapshot) => {
        const contractors: Contractor[] = [];
        const conflicts: SyncConflict[] = [];

        snapshot.docs.forEach((docSnap) => {
          const contractor = docSnap.data() as Contractor;
          const timestamp = (docSnap.metadata.hasPendingWrites
            ? Date.now()
            : new Date((docSnap.data() as any).updatedAt || Date.now()).getTime());

          this.remoteDataCache.contractors.set(contractor.id, {
            data: contractor,
            timestamp,
          });

          contractors.push(contractor);
        });

        onContractorsChange(contractors, conflicts);
      },
      (error) => {
        console.error('[RealtimeSync] Contractors listener error:', error);
      }
    );

    // Escuchar General Price Guide en tiempo real
    const priceGuideRef = doc(db, 'users', uid, 'settings', 'generalPriceGuide');
    const unsubPriceGuide = onSnapshot(
      priceGuideRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const guide = docSnap.data() as GeneralPriceGuide;
          const timestamp = (docSnap.metadata.hasPendingWrites
            ? Date.now()
            : new Date((docSnap.data() as any).updatedAt || Date.now()).getTime());

          this.remoteDataCache.priceGuide = { data: guide, timestamp };
          onPriceGuideChange(guide, []);
        }
      },
      (error) => {
        console.error('[RealtimeSync] Price Guide listener error:', error);
      }
    );

    this.unsubscribers = [unsubProjects, unsubContractors, unsubPriceGuide];
  }

  /**
   * Detects conflicts between local and remote data
   */
  detectConflicts(
    localProjects: Project[],
    localContractors: Contractor[],
    localPriceGuide: GeneralPriceGuide,
    localTimestamps: {
      projects: Map<string, number>;
      contractors: Map<string, number>;
      priceGuide: number;
    }
  ): SyncConflict[] {
    const conflicts: SyncConflict[] = [];

    // Check projects
    localProjects.forEach((proj) => {
      const remote = this.remoteDataCache.projects.get(proj.id);
      const localTs = localTimestamps.projects.get(proj.id) || 0;

      if (remote && remote.timestamp > localTs) {
        conflicts.push({
          type: 'project',
          id: proj.id,
          localTimestamp: localTs,
          remoteTimestamp: remote.timestamp,
          remoteName: remote.data.name,
        });
      }
    });

    // Check contractors
    localContractors.forEach((cont) => {
      const remote = this.remoteDataCache.contractors.get(cont.id);
      const localTs = localTimestamps.contractors.get(cont.id) || 0;

      if (remote && remote.timestamp > localTs) {
        conflicts.push({
          type: 'contractor',
          id: cont.id,
          localTimestamp: localTs,
          remoteTimestamp: remote.timestamp,
          remoteName: remote.data.name,
        });
      }
    });

    // Check price guide
    if (this.remoteDataCache.priceGuide) {
      if (this.remoteDataCache.priceGuide.timestamp > localTimestamps.priceGuide) {
        conflicts.push({
          type: 'priceGuide',
          id: 'general',
          localTimestamp: localTimestamps.priceGuide,
          remoteTimestamp: this.remoteDataCache.priceGuide.timestamp,
        });
      }
    }

    return conflicts;
  }

  /**
   * Get the latest remote data for a specific item
   */
  getRemoteData(
    type: 'project' | 'contractor',
    id: string
  ): any {
    if (type === 'project') {
      return this.remoteDataCache.projects.get(id)?.data;
    } else if (type === 'contractor') {
      return this.remoteDataCache.contractors.get(id)?.data;
    }
    return null;
  }

  /**
   * Stop all real-time listeners
   */
  stopRealtimeSync(): void {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers = [];
    this.remoteDataCache = {
      projects: new Map(),
      contractors: new Map(),
      priceGuide: null,
    };
  }

  /**
   * Check if currently online and Firestore is accessible
   */
  async checkOnlineStatus(): Promise<boolean> {
    try {
      // Try a simple query to check connectivity
      await getDocs(collection(db, 'system'));
      return true;
    } catch (error: any) {
      return error?.code !== 'network-error';
    }
  }
}

export const realtimeSyncService = new RealtimeSyncService();
