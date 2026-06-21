import { doc, getDoc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { Project, Contractor, GeneralPriceGuide, UserBaseEntry, AuditLogEntry } from './types';
import { INITIAL_GENERAL_PRICE_GUIDE } from './data';
import { savePendingUpload } from './offlineSync';

const FILE_SIZE_THRESHOLD = 50000; // 50KB roughly

const fastHash = (str: string) => {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    hash = Math.imul(31, hash) + str.charCodeAt(i) | 0;
  }
  return hash.toString(16);
};

export const loadGlobalUsers = async (): Promise<UserBaseEntry[]> => {
  try {
    const colRef = collection(db, 'system', 'config', 'authorizedUsers');
    const snap = await getDocs(colRef);
    const users: UserBaseEntry[] = [];
    snap.forEach(docSnap => {
      users.push(docSnap.data() as UserBaseEntry);
    });
    return users;
  } catch (e) {
    console.error("Error loading global users:", e);
    return [];
  }
};

export const saveGlobalUser = async (user: UserBaseEntry) => {
  try {
    if (!user.email) return;
    const docRef = doc(db, 'system', 'config', 'authorizedUsers', user.email.toLowerCase());
    await setDoc(docRef, user);
  } catch (e) {
    console.error("Error saving global user:", e);
  }
};

export const deleteGlobalUser = async (email: string) => {
  try {
    if (!email) return;
    const docRef = doc(db, 'system', 'config', 'authorizedUsers', email.toLowerCase());
    await deleteDoc(docRef);
  } catch(e) {
    console.error("Error deleting global user:", e);
  }
};

const fetchAndConvertBlobToBase64 = async (url: string): Promise<string> => {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

// Load main user data
export const loadUserData = async (uid: string): Promise<{ 
  projects: Project[]; 
  contractors: Contractor[]; 
  generalPriceGuide: GeneralPriceGuide; 
  includeItbisInNet: boolean; 
} | null> => {
  try {
    const contractorsSnap = await getDocs(collection(db, `users/${uid}/contractors`));
    const projectsSnap = await getDocs(collection(db, `users/${uid}/projects`));
    const sheetsSnap = await getDocs(collection(db, `users/${uid}/sheets`));
    const paramsSnap = await getDoc(doc(db, `users/${uid}/config/params`));
    const priceGuideSnap = await getDoc(doc(db, `users/${uid}/config/priceGuide`));

    // Fallback: Check if we have legacy monolithic data if new structure is empty
    if (contractorsSnap.empty && projectsSnap.empty) {
      const oldDocRef = doc(db, 'users', uid, 'data', 'main');
      const oldDocSnap = await getDoc(oldDocRef);
      if (oldDocSnap.exists()) {
        const oldData = oldDocSnap.data() as any;
        // Migrate legacy monolithic document to new collection structure
        await saveUserData(uid, oldData);
        return oldData;
      }
      return null;
    }

    const contractors: Contractor[] = [];
    contractorsSnap.forEach(d => contractors.push(d.data() as Contractor));

    const sheets: any[] = [];
    sheetsSnap.forEach(d => sheets.push(d.data()));

    const projects: Project[] = [];
    projectsSnap.forEach(d => {
      const p = d.data() as Project;
      p.sheets = sheets.filter(s => s.projectId === p.id);
      projects.push(p);
    });

    const includeItbisInNet = paramsSnap.exists() ? paramsSnap.data().includeItbisInNet : true;
    const generalPriceGuide = priceGuideSnap.exists() ? (priceGuideSnap.data() as GeneralPriceGuide) : { ...INITIAL_GENERAL_PRICE_GUIDE };

    const data = { projects, contractors, generalPriceGuide, includeItbisInNet };

    // Reconstruct base64 strings from storage URLs
    if (data.generalPriceGuide?.fileStorageUrl) {
      try {
        data.generalPriceGuide.fileBase64 = await fetchAndConvertBlobToBase64(data.generalPriceGuide.fileStorageUrl);
        (data.generalPriceGuide as any)._hash = fastHash(data.generalPriceGuide.fileBase64);
      } catch (e) {
        console.error("Failed to load price guide from storage", e);
      }
    }

    for (const p of data.projects) {
      if (p.params?.logoStorageUrl) {
        try {
           p.params.companyLogo = await fetchAndConvertBlobToBase64(p.params.logoStorageUrl);
           (p.params as any)._hash = fastHash(p.params.companyLogo);
        } catch (e) {
           console.error("Failed to load company logo from storage", e);
        }
      }
    }

    for (const c of data.contractors) {
      if (c.agreements) {
        for (const a of c.agreements) {
          if (a.fileStorageUrl) {
            try {
               a.fileBase64 = await fetchAndConvertBlobToBase64(a.fileStorageUrl);
               (a as any)._hash = fastHash(a.fileBase64);
            } catch (e) {
               console.error("Failed to load agreement from storage", e);
            }
          }
        }
      }
    }

    return data;
  } catch (error) {
    console.error("Error loading user data from Firestore:", error);
    return null;
  }
};

// Save main user data
export const saveUserData = async (uid: string, data: { 
  projects: Project[]; 
  contractors: Contractor[]; 
  generalPriceGuide: GeneralPriceGuide; 
  includeItbisInNet: boolean; 
}) => {
  try {
    // Create clean copies for Firestore storage
    const cleanProjects = JSON.parse(JSON.stringify(data.projects)) as Project[];
    const cleanContractors = JSON.parse(JSON.stringify(data.contractors)) as Contractor[];
    const cleanPriceGuide = JSON.parse(JSON.stringify(data.generalPriceGuide)) as GeneralPriceGuide;

    // Process Price Guide
    if (cleanPriceGuide.fileBase64 && cleanPriceGuide.fileBase64.length > FILE_SIZE_THRESHOLD) {
       const currentHash = fastHash(cleanPriceGuide.fileBase64);
       if ((data.generalPriceGuide as any)._hash !== currentHash) {
         try {
           const storageRef = ref(storage, `users/${uid}/priceGuide/file`);
           await uploadString(storageRef, cleanPriceGuide.fileBase64, 'data_url');
           const url = await getDownloadURL(storageRef);
           cleanPriceGuide.fileStorageUrl = url;
           (data.generalPriceGuide as any)._hash = currentHash;
         } catch (e) {
           console.warn("Storage upload failed, queueing for later.", e);
           await savePendingUpload({ type: 'priceGuide', uid, base64Data: cleanPriceGuide.fileBase64 });
         }
       }
       cleanPriceGuide.fileBase64 = "";
       delete (cleanPriceGuide as any)._hash;
    }

    // Process Projects
    for (const p of cleanProjects) {
      if (p.params?.companyLogo && p.params.companyLogo.length > FILE_SIZE_THRESHOLD) {
         const currentHash = fastHash(p.params.companyLogo);
         const originalProject = data.projects.find(op => op.id === p.id);
         if (originalProject && (originalProject.params as any)._hash !== currentHash) {
           try {
             const storageRef = ref(storage, `users/${uid}/projects/${p.id}/logo`);
             await uploadString(storageRef, p.params.companyLogo, 'data_url');
             const url = await getDownloadURL(storageRef);
             p.params.logoStorageUrl = url;
             (originalProject.params as any)._hash = currentHash;
           } catch (e) {
             console.warn("Storage upload failed, queueing for later.", e);
             await savePendingUpload({ type: 'projectLogo', uid, id: p.id, base64Data: p.params.companyLogo });
           }
         }
         p.params.companyLogo = "";
         delete (p.params as any)._hash;
      }
    }

    // Process Contractors
    for (const c of cleanContractors) {
      if (c.agreements) {
        for (const a of c.agreements) {
           if (a.fileBase64 && a.fileBase64.length > FILE_SIZE_THRESHOLD) {
             const currentHash = fastHash(a.fileBase64);
             const originalContractor = data.contractors.find(oc => oc.id === c.id);
             const originalAgreement = originalContractor?.agreements?.find(oa => oa.id === a.id);
             
             if (originalAgreement && (originalAgreement as any)._hash !== currentHash) {
               try {
                 const storageRef = ref(storage, `users/${uid}/agreements/${c.id}/${a.id}`);
                 await uploadString(storageRef, a.fileBase64, 'data_url');
                 const url = await getDownloadURL(storageRef);
                 a.fileStorageUrl = url;
                 (originalAgreement as any)._hash = currentHash;
               } catch (e) {
                 console.warn("Storage upload failed, queueing for later.", e);
                 await savePendingUpload({ type: 'agreementFile', uid, id: c.id, subId: a.id, base64Data: a.fileBase64 });
               }
             }
             a.fileBase64 = "";
             delete (a as any)._hash;
           }
        }
      }
    }

    // Prepare writes
    const operations: Promise<void>[] = [];
    
    const projectIds = new Set(cleanProjects.map(p => p.id));
    const sheetIds = new Set(cleanProjects.flatMap(p => (p.sheets || []).map(s => s.id)));
    const contractorIds = new Set(cleanContractors.map(c => c.id));

    // Get current IDs to detect deletions
    const existingProjects = await getDocs(collection(db, `users/${uid}/projects`));
    const existingSheets = await getDocs(collection(db, `users/${uid}/sheets`));
    const existingContractors = await getDocs(collection(db, `users/${uid}/contractors`));

    // Delete removed elements
    existingProjects.docs.forEach(d => { if (!projectIds.has(d.id)) operations.push(deleteDoc(d.ref)); });
    existingSheets.docs.forEach(d => { if (!sheetIds.has(d.id)) operations.push(deleteDoc(d.ref)); });
    existingContractors.docs.forEach(d => { if (!contractorIds.has(d.id)) operations.push(deleteDoc(d.ref)); });

    // Save active elements
    cleanContractors.forEach(c => operations.push(setDoc(doc(db, `users/${uid}/contractors/${c.id}`), c)));
    cleanProjects.forEach(p => {
      const sheets = p.sheets || [];
      const projectWithoutSheets = { ...p };
      delete (projectWithoutSheets as any).sheets;
      operations.push(setDoc(doc(db, `users/${uid}/projects/${p.id}`), projectWithoutSheets));
      
      sheets.forEach(s => {
         operations.push(setDoc(doc(db, `users/${uid}/sheets/${s.id}`), { ...s, projectId: p.id }));
      });
    });

    operations.push(setDoc(doc(db, `users/${uid}/config/params`), { includeItbisInNet: data.includeItbisInNet }));
    operations.push(setDoc(doc(db, `users/${uid}/config/priceGuide`), cleanPriceGuide));

    await Promise.all(operations);

  } catch (error) {
    console.warn("Firestore save failed or pending offline.", error);
  }
};

// Load users DB
export const loadUsersDb = async (uid: string): Promise<UserBaseEntry[] | null> => {
  try {
    const usersSnap = await getDocs(collection(db, `users/${uid}/systemUsers`));
    
    // Fallback config from legacy structure
    if (usersSnap.empty) {
      const docRef = doc(db, 'users', uid, 'meta', 'usersDb');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().users) {
        const legacyUsers = docSnap.data().users as UserBaseEntry[];
        await saveUsersDb(uid, legacyUsers); // Migrate it
        return legacyUsers;
      }
      return null;
    }
    
    const users: UserBaseEntry[] = [];
    usersSnap.forEach(d => users.push(d.data() as UserBaseEntry));
    return users;
  } catch (error) {
    console.error("Error loading users db from Firestore:", error);
    return null;
  }
};

// Save users DB
export const saveUsersDb = async (uid: string, usersArray: UserBaseEntry[]) => {
  try {
    const colRef = collection(db, `users/${uid}/systemUsers`);
    
    // To sync deletions exactly, we will get current IDs and delete missing ones
    const currentSnap = await getDocs(colRef);
    const incomingIds = new Set(usersArray.map(u => u.id));
    
    const operations: Promise<void>[] = [];
    
    currentSnap.forEach(d => {
      if (!incomingIds.has(d.id)) {
        operations.push(deleteDoc(d.ref));
      }
    });
    
    usersArray.forEach(user => {
      // make sure the custom ID is used as the doc id
      operations.push(setDoc(doc(db, `users/${uid}/systemUsers/${user.id}`), user));
    });
    
    await Promise.all(operations);
  } catch (error) {
    console.error("Error saving users db to Firestore:", error);
  }
};

// Load Audit Logs
export const loadAuditLogs = async (uid: string): Promise<AuditLogEntry[] | null> => {
  try {
    const docRef = doc(db, 'users', uid, 'meta', 'auditLogs');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data().logs || null;
    }
    return null;
  } catch (error) {
    console.error("Error loading audit logs from Firestore:", error);
    return null;
  }
};

// Save Audit Logs
export const saveAuditLogs = async (uid: string, logsArray: AuditLogEntry[]) => {
  try {
    const docRef = doc(db, 'users', uid, 'meta', 'auditLogs');
    await setDoc(docRef, { logs: logsArray.slice(0, 500) }); // keep max 500
  } catch (error) {
    console.error("Error saving audit logs to Firestore:", error);
  }
};
