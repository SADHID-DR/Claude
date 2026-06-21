import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc,
  getDocs, 
  onSnapshot, 
  query, 
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Project, Contractor, GeneralPriceGuide } from './types';
import { set, del } from 'idb-keyval';

// The local storage keys
const STORAGE_KEY_PROJECTS = 'nom_construction_v2_projects';
const STORAGE_KEY_CONTRACTORS = 'nom_construction_contractors';
const STORAGE_KEY_GENERAL_PRICE_GUIDE = 'nom_construction_general_price_guide';

function stableStringify(obj: any): string {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(stableStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  let result = '{';
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    result += `"${key}":${stableStringify(obj[key])}`;
    if (i < keys.length - 1) result += ',';
  }
  result += '}';
  return result;
}

export function generateChecksumSync(obj: any): string {
  const objForHash = { ...obj };
  delete objForHash.checksum;
  delete objForHash.updatedAt;
  const str = stableStringify(objForHash);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

class SyncService {
  private unsubscribeProjects: (() => void) | null = null;
  private unsubscribeContractors: (() => void) | null = null;

  async wipeLocal() {
    try {
      await del(STORAGE_KEY_PROJECTS);
      await del(STORAGE_KEY_CONTRACTORS);
      await del(STORAGE_KEY_GENERAL_PRICE_GUIDE);
    } catch (e) {
      console.error("Local wipe error:", e);
    }
  }

  async saveLocal(projects: Project[], contractors: Contractor[], priceGuide: GeneralPriceGuide) {
    try {
      await set(STORAGE_KEY_PROJECTS, projects);
      await set(STORAGE_KEY_CONTRACTORS, contractors);
      await set(STORAGE_KEY_GENERAL_PRICE_GUIDE, priceGuide);
      
      // Clear out the old bloated localStorage items to fix QuotaExceededError
      localStorage.removeItem(STORAGE_KEY_PROJECTS);
      localStorage.removeItem(STORAGE_KEY_CONTRACTORS);
      localStorage.removeItem(STORAGE_KEY_GENERAL_PRICE_GUIDE);
    } catch (e) {
      console.error("Local save error:", e);
    }
  }

  // Uses Firestore with offline persistence. 
  // It transparently handles offline caching and syncing when back online.
  async pushToCloud(projects: Project[], contractors: Contractor[], priceGuide: GeneralPriceGuide) {
    const user = auth.currentUser;
    if (!user) return; // Cannot push without being authenticated

    const uid = user.uid;
    const batch = writeBatch(db);

    // Deep copy to prevent mutating local state
    const cleanProjects = JSON.parse(JSON.stringify(projects)) as Project[];
    const cleanContractors = JSON.parse(JSON.stringify(contractors)) as Contractor[];

    // Strip large logos
    cleanProjects.forEach(p => {
      if (p.params && p.params.companyLogo && p.params.companyLogo.length > 300000) {
        p.params.companyLogo = "";
      }
    });

    // Strip large agreements
    cleanContractors.forEach(c => {
      if (c.agreements) {
        c.agreements.forEach(a => {
           if (a.fileBase64 && a.fileBase64.length > 100000) {
             a.fileBase64 = "";
           }
        });
      }
    });

    // Save projects
    cleanProjects.forEach(p => {
      const pRef = doc(db, 'users', uid, 'projects', p.id);
      const checksum = generateChecksumSync(p);
      batch.set(pRef, { ...p, checksum, updatedAt: serverTimestamp() }, { merge: true });
    });

    // Save contractors
    cleanContractors.forEach(c => {
      const cRef = doc(db, 'users', uid, 'contractors', c.id);
      const checksum = generateChecksumSync(c);
      batch.set(cRef, { ...c, checksum, updatedAt: serverTimestamp() }, { merge: true });
    });

    // Save general price guide
    const settingsRef = doc(db, 'users', uid, 'settings', 'generalPriceGuide');
    const priceGuideChecksum = generateChecksumSync(priceGuide);
    batch.set(settingsRef, { ...priceGuide, checksum: priceGuideChecksum, updatedAt: serverTimestamp() }, { merge: true });

    await batch.commit();
  }

  startCloudSync(
    onProjectsUpdate: (projects: Project[]) => void,
    onContractorsUpdate: (contractors: Contractor[]) => void,
    onPriceGuideUpdate: (guide: GeneralPriceGuide) => void
  ) {
    const user = auth.currentUser;
    if (!user) return;
    
    const uid = user.uid;

    if (this.unsubscribeProjects) this.unsubscribeProjects();
    if (this.unsubscribeContractors) this.unsubscribeContractors();

    const projectsRef = collection(db, 'users', uid, 'projects');
    this.unsubscribeProjects = onSnapshot(query(projectsRef), (snapshot) => {
      const cloudProjects = snapshot.docs.map(doc => doc.data() as Project).filter(p => {
        const storedChecksum = (p as any).checksum;
        if (storedChecksum) {
          const expected = generateChecksumSync(p);
          if (storedChecksum !== expected) {
            console.error(`[Security] Data corruption detected for Project ${p.id}. Checksum mismatch.`);
            return false;
          }
        }
        return true;
      });
      onProjectsUpdate(cloudProjects);
    });

    const contractorsRef = collection(db, 'users', uid, 'contractors');
    this.unsubscribeContractors = onSnapshot(query(contractorsRef), (snapshot) => {
      const cloudContractors = snapshot.docs.map(doc => doc.data() as Contractor).filter(c => {
        const storedChecksum = (c as any).checksum;
        if (storedChecksum) {
          const expected = generateChecksumSync(c);
          if (storedChecksum !== expected) {
            console.error(`[Security] Data corruption detected for Contractor ${c.id}. Checksum mismatch.`);
            return false;
          }
        }
        return true;
      });
      onContractorsUpdate(cloudContractors);
    });
    
    const priceGuideRef = doc(db, 'users', uid, 'settings', 'generalPriceGuide');
    onSnapshot(priceGuideRef, (docSnap) => {
      if (docSnap.exists()) {
        const guide = docSnap.data() as GeneralPriceGuide;
        const storedChecksum = (guide as any).checksum;
        if (storedChecksum) {
          const expected = generateChecksumSync(guide);
          if (storedChecksum !== expected) {
            console.error(`[Security] Data corruption detected for General Price Guide. Checksum mismatch.`);
            return;
          }
        }
        onPriceGuideUpdate(guide);
      }
    });
  }

  stopCloudSync() {
    if (this.unsubscribeProjects) {
      this.unsubscribeProjects();
      this.unsubscribeProjects = null;
    }
    if (this.unsubscribeContractors) {
      this.unsubscribeContractors();
      this.unsubscribeContractors = null;
    }
  }

  async deleteProject(id: string) {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'projects', id));
    } catch (e) {
      console.error("Cloud project delete error:", e);
    }
  }

  async deleteContractor(id: string) {
    const user = auth.currentUser;
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'users', user.uid, 'contractors', id));
    } catch (e) {
      console.error("Cloud contractor delete error:", e);
    }
  }

  async wipeDatabase() {
    const user = auth.currentUser;
    if (!user) return;
    try {
      const qProj = query(collection(db, 'users', user.uid, 'projects'));
      const projSnap = await getDocs(qProj);
      projSnap.forEach(async (d) => {
        await deleteDoc(doc(db, 'users', user.uid, 'projects', d.id));
      });

      const qCont = query(collection(db, 'users', user.uid, 'contractors'));
      const contSnap = await getDocs(qCont);
      contSnap.forEach(async (d) => {
        await deleteDoc(doc(db, 'users', user.uid, 'contractors', d.id));
      });
      // Optionally could delete generalPriceGuide, but might not be necessary.
      console.log('Database wiped for user:', user.uid);
    } catch (e) {
      console.error("Wipe Database error:", e);
    }
  }

}

export const syncService = new SyncService();
