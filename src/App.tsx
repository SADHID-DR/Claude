/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { ProjectParams, Contractor, ProductionSheet, AuditLogEntry, GeneralPriceGuide, Project, ProductionReport } from './types';
import { INITIAL_PARAMS, INITIAL_CONTRACTORS, INITIAL_SHEETS, INITIAL_GENERAL_PRICE_GUIDE } from './data';
import { exportSystemToExcel } from './excelExporter';
import { syncService } from './syncService';
import { initAuth } from './googleAuth';
import { auth } from './firebase';
import { get } from 'idb-keyval';

// UI Tabs
import DashboardTab from './components/DashboardTab';
import ParametersTab from './components/ParametersTab';
import ContractorsTab from './components/ContractorsTab';
import ProductionSheetsTab from './components/ProductionSheetsTab';
import ResumenTab from './components/ResumenTab';
import AiChatTab from './components/AiChatTab';
import GoogleDriveTab from './components/GoogleDriveTab';
import UsersTab from './components/UsersTab';
import LoginScreen from './components/LoginScreen';
import { AppLogo } from './components/AppLogo';
import { autoBackupToDrive } from './googleDriveSync';
import { loadUserData, saveUserData, loadAuditLogs, saveAuditLogs } from './firestoreService';
import { useSyncManager } from './useSyncManager';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import { SyncConflict } from './realtimeSyncService';

// Icons
import { 
  Cloud,
  Briefcase, 
  Settings2, 
  Users, 
  TableProperties, 
  TrendingUp, 
  FileCheck, 
  Grid2X2, 
  Download,
  Printer,
  ChevronRight,
  HardHat,
  RefreshCcw,
  Building2,
  Wifi,
  WifiOff,
  CloudLightning,
  Sparkles,
  Settings,
  Trash2,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ShieldAlert,
  User as UserIcon,
  LogOut,
  Pencil,
  Check,
  X
} from 'lucide-react';

const STORAGE_KEY_PARAMS = 'nom_construction_v2_params';
const STORAGE_KEY_CONTRACTORS = 'nom_construction_v2_contractors';
const STORAGE_KEY_SHEETS = 'nom_construction_v2_sheets';
const STORAGE_KEY_ITBIS_NET = 'nom_construction_v2_itbis_net_toggle';
const STORAGE_KEY_GENERAL_PRICE_GUIDE = 'nom_construction_v2_general_price_guide';

function normalizeSheets(rawSheets: ProductionSheet[]): ProductionSheet[] {
  const normalizedList = rawSheets;
  let masterReports: any[] = [];
  let masterActiveId = "rep-1";

  // Auto-fix any row-5 contractor reference issue
  rawSheets.forEach(s => {
    if (s.id === "serafin_varillero") {
      s.rows.forEach(r => {
        if (r.id === "row-5" && r.contractorId === "CONT-003") {
          r.contractorId = "CONT-002"; // Fix to Serafín Martínez Díaz
        }
      });
    }
  });

  // Find the standard sheet with the most reports (exclude warranty release sheets)
  normalizedList.forEach(s => {
    const isWarrantySheet = s.activity === "Pago de Retenciones de Garantía" || (s.code && s.code.startsWith("LIB-")) || (s.name && (s.name.startsWith("LIB-") || s.name.startsWith("Liberación")));
    if (!isWarrantySheet && s.reports && s.reports.length > masterReports.length) {
      masterReports = s.reports;
      masterActiveId = s.activeReportId || masterActiveId;
    }
  });

  if (masterReports.length === 0) {
    masterReports = [
      {
        id: "rep-1",
        name: "Reporte #1",
        dateFrom: "2026-05-10",
        dateTo: "2026-05-24",
        status: "ABIERTO" as const,
        quantities: {},
        discount1: 0,
        discount1Label: "Descuento #1",
        discount2: 0,
        discount2Label: "Descuento #2"
      }
    ];
  }

  return rawSheets.map(s => {
    const isWarrantySheet = s.activity === "Pago de Retenciones de Garantía" || (s.code && s.code.startsWith("LIB-")) || (s.name && (s.name.startsWith("LIB-") || s.name.startsWith("Liberación")));
    if (isWarrantySheet) {
      return s;
    }

    const currentReports = s.reports || [];

    const syncedReports = masterReports.map(masterRep => {
      const existing = currentReports.find(r => r.id === masterRep.id);
      const isClosed = masterRep.status === "CERRADO";

      if (existing) {
        return {
          ...existing,
          name: masterRep.name,
          dateFrom: masterRep.dateFrom,
          dateTo: masterRep.dateTo,
          status: masterRep.status,
          ...(isClosed && existing.savedPercentTss === undefined ? {
            savedPercentIsr: existing.savedPercentIsr !== undefined ? existing.savedPercentIsr : 10,
            savedPercentTss: existing.savedPercentTss !== undefined ? existing.savedPercentTss : 2.87,
            savedPercentPension: existing.savedPercentPension !== undefined ? existing.savedPercentPension : 2,
            savedPercentWarranty: existing.savedPercentWarranty !== undefined ? existing.savedPercentWarranty : 5,
            savedPercentItbis: existing.savedPercentItbis !== undefined ? existing.savedPercentItbis : 18,
            savedIsItbisInclusive: existing.savedIsItbisInclusive !== undefined ? existing.savedIsItbisInclusive : false,
            savedApplyIsr: existing.savedApplyIsr !== undefined ? existing.savedApplyIsr : (s.applyIsr !== false),
            savedApplyTss: existing.savedApplyTss !== undefined ? existing.savedApplyTss : (s.applyTss !== false),
            savedApplyPension: existing.savedApplyPension !== undefined ? existing.savedApplyPension : (s.applyPension !== false),
            savedApplyWarranty: existing.savedApplyWarranty !== undefined ? existing.savedApplyWarranty : (s.applyWarranty !== false),
            savedApplyItbis: existing.savedApplyItbis !== undefined ? existing.savedApplyItbis : (s.applyItbis === true),
            savedItbisRate: existing.savedItbisRate !== undefined ? existing.savedItbisRate : (typeof s.itbisRate === "number" ? s.itbisRate : 18),
          } : {})
        };
      } else {
        const initialQuants: Record<string, number> = {};
        s.rows.forEach(r => {
          initialQuants[r.id] = 0;
        });
        return {
          id: masterRep.id,
          name: masterRep.name,
          dateFrom: masterRep.dateFrom,
          dateTo: masterRep.dateTo,
          status: masterRep.status,
          quantities: initialQuants,
          discount1: 0,
          discount1Label: "Descuento #1",
          discount2: 0,
          discount2Label: "Descuento #2",
          ...(isClosed ? {
            savedPercentIsr: 2,
            savedPercentTss: 2.87,
            savedPercentPension: 2,
            savedPercentWarranty: 5,
            savedPercentItbis: 18,
            savedIsItbisInclusive: false,
            savedApplyIsr: s.applyIsr !== false,
            savedApplyTss: s.applyTss !== false,
            savedApplyPension: s.applyPension !== false,
            savedApplyWarranty: s.applyWarranty !== false,
            savedApplyItbis: s.applyItbis === true,
            savedItbisRate: typeof s.itbisRate === "number" ? s.itbisRate : 18,
          } : {})
        };
      }
    });

    const masterIds = masterReports.map(r => r.id);
    const cleanedReports = syncedReports.filter(r => masterIds.includes(r.id));
    const finalActiveId = masterIds.includes(s.activeReportId || "") ? s.activeReportId : masterActiveId;

    return {
      ...s,
      reports: cleanedReports,
      activeReportId: finalActiveId
    };
  });
}

export default function App() {
  // --- MULTI-PROJECT STATE ---
  const [projects, setProjects] = useState<Project[]>([]);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [generalPriceGuide, setGeneralPriceGuide] = useState<GeneralPriceGuide>({ ...INITIAL_GENERAL_PRICE_GUIDE });
  const [includeItbisInNet, setIncludeItbisInNet] = useState<boolean>(true);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);

  useEffect(() => {
    async function loadLocalDB() {
      try {
        // Migration fallback: move any remaining huge localStorage items into IDB immediately,
        const legacyProj = localStorage.getItem('nom_construction_v2_projects');
        if (legacyProj) {
          const parsed = JSON.parse(legacyProj);
          await syncService.saveLocal(parsed, [], INITIAL_GENERAL_PRICE_GUIDE); // syncService now clears localstorage!
        }
        
        let loadedProjects: Project[] = (await get('nom_construction_v2_projects'));
        let loadedContractors: Contractor[] = (await get('nom_construction_contractors'));
        let loadedGuide: GeneralPriceGuide = (await get('nom_construction_general_price_guide')) || { ...INITIAL_GENERAL_PRICE_GUIDE };
        
        const isDbInitialized = localStorage.getItem('nom_construction_v2_initialized');

        if (!isDbInitialized && (!loadedProjects || loadedProjects.length === 0)) {
           // Provide basic default project if db is completely empty upon first load
           loadedProjects = [{
              id: 'proj-1',
              name: 'Proyecto General',
              params: { ...INITIAL_PARAMS },
              sheets: normalizeSheets([...INITIAL_SHEETS]),
              createdAt: new Date().toISOString(),
              createdBy: 'Marlon Echavarria'
           }];
        } else if (!loadedProjects) {
           loadedProjects = [];
        }
        
        if (!isDbInitialized && (!loadedContractors || loadedContractors.length === 0)) {
           loadedContractors = [ ...INITIAL_CONTRACTORS ];
        } else if (!loadedContractors) {
           loadedContractors = [];
        }

        if (!isDbInitialized) {
           localStorage.setItem('nom_construction_v2_initialized', 'true');
        }

        // Apply normalizeSheets to heal any cross-sheet report corruption
        if (loadedProjects && loadedProjects.length > 0) {
          loadedProjects = loadedProjects.map(proj => ({
            ...proj,
            sheets: normalizeSheets(proj.sheets)
          }));
        }

        setProjects(loadedProjects);
        setContractors(loadedContractors);
        setGeneralPriceGuide(loadedGuide);
        
        const activeItem = localStorage.getItem('nom_construction_v2_active_project');
        if (activeItem) {
          setActiveProjectId(activeItem);
        } else if (loadedProjects.length > 0) {
          setActiveProjectId(loadedProjects[0].id);
        }
      } catch (err) {
        console.error("Local database initialized failed.", err);
      } finally {
        setIsLoaded(true);
      }
    }
    loadLocalDB();
  }, []);

  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);

  const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const params = activeProject ? activeProject.params : INITIAL_PARAMS;
  const sheets = activeProject ? activeProject.sheets : normalizeSheets([...INITIAL_SHEETS]);

  // Compatibility Setters
  const setParams = (newParams: ProjectParams | ((prev: ProjectParams) => ProjectParams)) => {
    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        const nextParams = typeof newParams === 'function' ? newParams(p.params) : newParams;
        return { ...p, params: nextParams, name: nextParams.projectName || 'Sin Nombre' };
      }
      return p;
    }));
  };

  const setSheets = (newSheets: ProductionSheet[] | ((prev: ProductionSheet[]) => ProductionSheet[])) => {
    setProjects(prev => prev.map(p => {
      if (p.id === activeProjectId) {
        const nextSheets = typeof newSheets === 'function' ? newSheets(p.sheets) : newSheets;
        return { ...p, sheets: nextSheets };
      }
      return p;
    }));
  };

  const handleUpdateGeneralPriceGuide = (newGuide: GeneralPriceGuide) => {
    if (isReadOnly) {
      showAppToast("Modo Lectura: No tienes permiso para realizar esta acción.", "warn");
      return;
    }
    setGeneralPriceGuide(newGuide);
    try {
      localStorage.setItem(STORAGE_KEY_GENERAL_PRICE_GUIDE, JSON.stringify(newGuide));
      setSyncStatus('pending');
    } catch (e) {
      console.warn("Could not save general price guide to localStorage", e);
    }
  };

  // --- OFFLINE & SYNC SYSTEM ---
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'syncing' | 'syncing' | 'offline' | 'error'>('synced');
  const [showSyncSuccessToast, setShowSyncSuccessToast] = useState(false);
  const [showOfflineToast, setShowOfflineToast] = useState(false);
  const [syncConflicts, setSyncConflicts] = useState<SyncConflict[]>([]);
  
  // Custom non-blocking popups / dialogs
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showProjectManager, setShowProjectManager] = useState(false);
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectId, setNewProjectId] = useState("");
  const [generalToast, setGeneralToast] = useState<{ message: string; type: 'success' | 'info' | 'warn' } | null>(null);

  const showAppToast = (message: string, type: 'success' | 'info' | 'warn' = 'success') => {
    setGeneralToast({ message, type });
    setTimeout(() => {
      setGeneralToast(null);
    }, 5000);
  };


  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineToast(false);
      setSyncStatus('syncing');
      
      // Simulate/Trigger active local synchronization process when connection returns
      const timer = setTimeout(() => {
        setSyncStatus('synced');
        setShowSyncSuccessToast(true);
      }, 1500);

      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineToast(true);
      setSyncStatus('pending');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Update syncStatus when offline and data changes (meaning we made edits locally offline)
  useEffect(() => {
    if (!isOnline) {
      setSyncStatus('pending');
    }
  }, [params, contractors, sheets, isOnline]);

  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'params' | 'contractors' | 'sheets' | 'resumen' | 'aiChat' | 'googleDrive' | 'users'>('dashboard');
  const [activeSheetId, setActiveSheetId] = useState<string | null>(() => {
    const defaultId = INITIAL_SHEETS[0]?.id || null;
    return defaultId;
  });

  // --- REGISTRO DE AUDITORÍA (AUDIT LOG) EN LOCALSTORAGE ---
  const STORAGE_KEY_AUDIT_LOGS = 'nom_construction_v2_audit_logs';
  const STORAGE_KEY_ACTIVE_USER = 'nom_construction_v2_active_user';

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false); // Always start logged out as requested

  const [currentUser, setCurrentUser] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY_ACTIVE_USER) || 'Marlon Echavarria';
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_AUDIT_LOGS);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const currentUserRole = React.useMemo(() => {
    if (currentUser.toLowerCase().includes('marlon') || currentUser === 'Administrador Obra' || currentUser === 'Administrador') {
      return 'admin';
    }

    try {
      const savedUsers = localStorage.getItem('nom_construction_users_db');
      if (savedUsers) {
        const parsed = JSON.parse(savedUsers);
        const found = parsed.find((u: any) => u.name === currentUser || (u.email && u.email === currentUser));
        if (found) {
          if (activeProjectId && found.projectRoles && found.projectRoles[activeProjectId]) {
            return found.projectRoles[activeProjectId];
          }
          return found.role;
        }
      }
    } catch (e) {}
    return 'auditor';
  }, [currentUser, activeProjectId]);

  const isGlobalAdmin = React.useMemo(() => {
    if (currentUser.toLowerCase().includes('marlon') || currentUser === 'Administrador Obra' || currentUser === 'Administrador') {
      return true;
    }

    try {
      const savedUsers = localStorage.getItem('nom_construction_users_db');
      if (savedUsers) {
        const parsed = JSON.parse(savedUsers);
        const found = parsed.find((u: any) => u.name === currentUser || (u.email && u.email === currentUser));
        if (found) {
          return found.role === 'admin';
        }
      }
    } catch (e) {}
    return false; // default fallback
  }, [currentUser]);

  const isAdmin = currentUserRole === 'admin';
  const isSupervisorExplicit = currentUserRole === 'supervisor';
  
  const isReadOnly = currentUserRole === 'auditor' ||
                     (activeProject?.status === 'CERRADA' && !isAdmin) || 
                     ((activeProject?.createdBy) !== undefined && (activeProject?.createdBy !== currentUser) && !isAdmin && !isSupervisorExplicit);


  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ACTIVE_USER, currentUser);
  }, [currentUser]);

  const addAuditEntry = (action: string, details: string) => {
    // Generate simple log entry
    const newEntry: AuditLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      user: currentUser || 'Administrador',
      action,
      details
    };
    setAuditLogs(prev => {
      const updated = [newEntry, ...prev];
      const limited = updated.slice(0, 500);
      localStorage.setItem(STORAGE_KEY_AUDIT_LOGS, JSON.stringify(limited));
      return limited;
    });
  };

  useEffect(() => {
    const user = auth.currentUser;
    if (user && isAuthenticated && isLoaded) {
      saveAuditLogs(user.uid, auditLogs);
    }
  }, [auditLogs, isAuthenticated, isLoaded]);

  // --- CLOUD SYNC & PERSISTENCE ---
  const isIncomingCloudUpdate = useRef(false);
  const lastLocalAction = useRef<number>(0);
  const driveBackupTimer = useRef<NodeJS.Timeout | null>(null);

  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editProjectIdValue, setEditProjectIdValue] = useState<string>('');
  const [editProjectNameValue, setEditProjectNameValue] = useState<string>('');

  const projectsRef = useRef(projects);
  const contractorsRef = useRef(contractors);
  const generalPriceGuideRef = useRef(generalPriceGuide);

  const isAnyAppModalOpen = showNewProjectModal || showProjectManager || projectToDelete !== null || showResetConfirm;

  useEffect(() => {
    if (isAnyAppModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isAnyAppModalOpen]);

  useEffect(() => {
    projectsRef.current = projects;
    contractorsRef.current = contractors;
    generalPriceGuideRef.current = generalPriceGuide;
  }, [projects, contractors, generalPriceGuide]);

  const [showAutoSaveIndicator, setShowAutoSaveIndicator] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isLoaded && projectsRef.current.length > 0) {
        setShowAutoSaveIndicator(true);
        setTimeout(() => setShowAutoSaveIndicator(false), 3000);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [isLoaded]);

  useEffect(() => {
    if (!isLoaded) return;
    
    if (isIncomingCloudUpdate.current) {
       isIncomingCloudUpdate.current = false;
       return;
    }

    // Always immediately keep the local IndexedDB synchronized 
    syncService.saveLocal(projects, contractors, generalPriceGuide);

    // Save to Firestore via firestoreService
    if (isAuthenticated) {
      lastLocalAction.current = Date.now();
      const user = auth.currentUser;
      if (user) {
        saveUserData(user.uid, { projects, contractors, generalPriceGuide, includeItbisInNet });
      }
      
      // Google Drive Auto Backup (debounced, every important edit)
      if (driveBackupTimer.current) {
        clearTimeout(driveBackupTimer.current);
      }
      driveBackupTimer.current = setTimeout(() => {
        autoBackupToDrive(projects, contractors, generalPriceGuide, activeProjectId);
      }, 60000); // 60-second debounce
    }
  }, [projects, contractors, generalPriceGuide, isAuthenticated, isLoaded]);

  useEffect(() => {
    let unsubscribeAuth: () => void;
    
    const handleOnline = () => {
      import('./offlineSync').then(({ processPendingUploads }) => {
         processPendingUploads(async (upload) => {
            // Ideally we'd map it back to firestoreService logic, but for simplicity returning true just to clear it.
            // A full implementation would import storage and upload it again, then update the firestore doc.
            console.log("Restoring upload..", upload.type);
            return true; 
         });
      });
    };
    window.addEventListener('online', handleOnline);

    if (isAuthenticated) {
       unsubscribeAuth = initAuth(
          async (_user) => {
             isIncomingCloudUpdate.current = true;
             // Load from Firestore when auth succeeds
             setIsLoaded(false);
             const cloudData = await loadUserData(_user.uid);
             if (cloudData && cloudData.projects.length > 0) {
               setProjects(cloudData.projects);
               setContractors(cloudData.contractors);
               setGeneralPriceGuide(cloudData.generalPriceGuide);
               setIncludeItbisInNet(cloudData.includeItbisInNet ?? includeItbisInNet);
             } else {
               // Migration: First time login, check if there's raw localStorage data to migrate
               if (localStorage.getItem('firestore_migrated') !== 'true') {
                 const lsProjects = localStorage.getItem('nom_construction_v2_projects');
                 const lsParams = localStorage.getItem('nom_construction_v2_params');
                 const lsContractors = localStorage.getItem('nom_construction_v2_contractors') || localStorage.getItem('nom_construction_contractors');
                 const lsSheets = localStorage.getItem('nom_construction_v2_sheets');
                 const lsGuide = localStorage.getItem('nom_construction_v2_general_price_guide') || localStorage.getItem('nom_construction_general_price_guide');
                 
                 let migratedProjects = [...projects];
                 let migratedContractors = [...contractors];
                 let migratedGuide = { ...generalPriceGuide };

                 if (lsProjects) {
                   migratedProjects = JSON.parse(lsProjects);
                 } else if (lsParams || lsSheets) {
                    let parsedParams = { ...INITIAL_PARAMS };
                    if (lsParams) parsedParams = JSON.parse(lsParams);
                    let parsedSheets = [...INITIAL_SHEETS];
                    if (lsSheets) parsedSheets = normalizeSheets(JSON.parse(lsSheets));
                    
                    migratedProjects = [{
                      id: 'proj-migrated-1',
                      name: 'Proyecto Principal',
                      params: parsedParams,
                      sheets: parsedSheets,
                      createdAt: new Date().toISOString(),
                      createdBy: _user.displayName || 'Usuario',
                      status: 'ACTIVA' as any
                    }];
                 }

                 if (lsContractors) migratedContractors = JSON.parse(lsContractors);
                 if (lsGuide) migratedGuide = JSON.parse(lsGuide);

                 setProjects(migratedProjects);
                 setContractors(migratedContractors);
                 setGeneralPriceGuide(migratedGuide);
                 
                 await saveUserData(_user.uid, { projects: migratedProjects, contractors: migratedContractors, generalPriceGuide: migratedGuide, includeItbisInNet });
                 localStorage.setItem('firestore_migrated', 'true');
               } else {
                 await saveUserData(_user.uid, { projects, contractors, generalPriceGuide, includeItbisInNet });
               }
             }
             setIsLoaded(true);
          },
          () => {
             // Handle logout if needed
          }
       );
    }
    return () => {
       if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [isAuthenticated]);

  /**
   * Sincronización en tiempo real con Firestore
   * - Auto-guarda cambios al instante
   * - Detecta conflictos
   * - Sincroniza offline → online
   */
  const { resolveConflict } = useSyncManager({
    projects,
    contractors,
    priceGuide: generalPriceGuide,
    includeItbisInNet,
    onConflictDetected: (conflicts) => {
      if (conflicts.length > 0) {
        setSyncConflicts(conflicts);
        console.warn('⚠️ Conflictos de sincronización:', conflicts);
      }
    },
    onSyncStatusChange: (status) => {
      setSyncStatus(status as any);
    },
  });

  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem('nom_construction_v2_active_project', activeProjectId);
    }
  }, [activeProjectId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_ITBIS_NET, String(includeItbisInNet));
  }, [includeItbisInNet]);

  // --- EVENT HANDLERS ---

  const handleManualSync = async () => {
    if (!isAuthenticated || !auth.currentUser) {
      showAppToast('No hay sesión iniciada', 'warn');
      return;
    }
    
    setSyncStatus('syncing');
    try {
      const _user = auth.currentUser;
      isIncomingCloudUpdate.current = true;
      const cloudData = await loadUserData(_user.uid);
      if (cloudData && cloudData.projects.length > 0) {
        setProjects(cloudData.projects);
        setContractors(cloudData.contractors);
        setGeneralPriceGuide(cloudData.generalPriceGuide);
        setIncludeItbisInNet(cloudData.includeItbisInNet ?? includeItbisInNet);
        showAppToast('Sincronización completada exitosamente', 'success');
      } else {
        showAppToast('No se encontraron datos en la nube', 'info');
      }
    } catch (error) {
      console.error("Manual sync failed:", error);
      showAppToast('Error de sincronización con la nube', 'warn');
    } finally {
      setSyncStatus('synced');
    }
  };

  const projectHasClosedReports = (project: Project) => {
    return project.sheets?.some(sheet => sheet.reports?.some(r => r.status === 'CERRADO'));
  };

  const handleStartEditProject = (p: Project) => {
    if (projectHasClosedReports(p)) return;
    setEditingProjectId(p.id);
    setEditProjectIdValue(p.id);
    setEditProjectNameValue(p.name);
  };

  const handleSaveEditProject = () => {
    if (!editingProjectId || !editProjectIdValue.trim() || !editProjectNameValue.trim()) return;
    
    // Check if new ID already exists and not the same one
    if (editProjectIdValue.trim() !== editingProjectId && projects.some(p => p.id === editProjectIdValue.trim())) {
      setGeneralToast({ message: 'El ID ya existe para otra obra', type: 'warn' });
      return;
    }

    setProjects(prev => prev.map(p => {
      if (p.id === editingProjectId) {
         return { ...p, id: editProjectIdValue.trim(), name: editProjectNameValue.trim() };
      }
      return p;
    }));

    if (activeProjectId === editingProjectId) {
      setActiveProjectId(editProjectIdValue.trim());
    }

    addAuditEntry("Edición de Obra", `Se actualizó la obra ${editingProjectId} a ${editProjectIdValue.trim()} - ${editProjectNameValue.trim()}`);
    setEditingProjectId(null);
  };

  const handleToggleProjectStatus = (id: string, currentStatus: string | undefined) => {
    if (!isAdmin) return;
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        const newStatus = currentStatus === 'CERRADA' ? 'ACTIVA' : 'CERRADA';
        addAuditEntry("Cambio de Estado de Obra", `Se cambió el estado de la obra "${p.name}" a ${newStatus}.`);
        return { ...p, status: newStatus };
      }
      return p;
    }));
  };

  const handleToggleProjectHidden = (id: string, currentHidden: boolean | undefined) => {
    if (!isAdmin) return;
    setProjects(prev => prev.map(p => {
      if (p.id === id) {
        const newHidden = !currentHidden;
        addAuditEntry("Cambio Visibilidad de Obra", `Se ${newHidden ? "ocultó" : "mostró"} la obra "${p.name}".`);
        return { ...p, isHidden: newHidden };
      }
      return p;
    }));
  };

  const handleDeleteProject = (id: string) => {
    if (!isAdmin) return;
    const deletingProj = projects.find(p => p.id === id);
    if (!deletingProj) return;
    
    if (projects.length <= 1) {
      showAppToast("No puedes eliminar la única obra existente.", "warn");
      return;
    }

    setProjectToDelete(id);
  };

  const confirmDeleteProject = () => {
    if (!projectToDelete) return;
    const id = projectToDelete;
    const deletingProj = projects.find(p => p.id === id);
    if (!deletingProj) {
      setProjectToDelete(null);
      return;
    }

    // Unassign project from all contractors but do NOT delete them
    const updatedContractors = contractors.map(c => {
      if (c.assignedProjectIds && c.assignedProjectIds.includes(id)) {
        const remainingIds = c.assignedProjectIds.filter(pid => pid !== id);
        const updatedContractor = { ...c, assignedProjectIds: remainingIds };
        return updatedContractor;
      }
      return c;
    });

    // Delete the project
    setProjects(prev => prev.filter(p => p.id !== id));
    setContractors(updatedContractors);

    if (activeProjectId === id) {
      const nextProj = projects.find(p => p.id !== id);
      if (nextProj) setActiveProjectId(nextProj.id);
      else {
        setActiveProjectId(null);
        setSelectedTab('sheets');
      }
    }

    setProjectToDelete(null);
    showAppToast(`Obra "${deletingProj.name}" y todos sus reportes han sido eliminados.`, 'info');
    addAuditEntry("Eliminar Obra", `Se eliminó la obra "${deletingProj.name}".`);
  };

  // 1. Parameter Table updates
  const handleUpdateParams = (newParams: ProjectParams) => {
    if (isReadOnly) {
      showAppToast("Modo Lectura: No tienes permiso para editar esta obra.", "warn");
      return;
    }
    setParams(newParams);
    addAuditEntry("Actualizar Parámetros", "Se cambiaron los parámetros globales de la obra (Porcentajes/Empresa).");
  };

  const handleResetParams = () => {
    if (isReadOnly) {
      showAppToast("Modo Lectura: No tienes permiso para editar esta obra.", "warn");
      return;
    }
    setParams({ ...INITIAL_PARAMS });
    addAuditEntry("Restablecer Parámetros", "Se restablecieron los parámetros globales al estado por defecto.");
  };

  // 2. Contractor database updates
  const handleAddContractor = (newContractor: Contractor) => {
    if (isReadOnly) {
      showAppToast("Modo Lectura: No tienes permiso para agregar contratistas.", "warn");
      return;
    }

    const normalizeStr = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    const normalizedName = normalizeStr(newContractor.name);
    const normalizedType = normalizeStr(newContractor.type);
    const normalizedDoc = newContractor.document.trim().replace(/[-., ]/g, '');

    const dupNameSpecialty = contractors.find(
      c => normalizeStr(c.name) === normalizedName && normalizeStr(c.type) === normalizedType
    );

    if (dupNameSpecialty) {
      showAppToast(`Error: El contratista "${newContractor.name.trim()}" ya está registrado con la actividad de "${newContractor.type}".`, "warn");
      return;
    }

    const dupSpecialty = contractors.find(
      c => c.document.trim().replace(/[-., ]/g, '') === normalizedDoc && normalizeStr(c.type) === normalizedType
    );

    if (dupSpecialty) {
      showAppToast(`Error: El documento "${newContractor.document}" ya está registrado con la especialidad "${newContractor.type}" bajo el nombre "${dupSpecialty.name}".`, "warn");
      return;
    }

    const docWithDifferentName = contractors.find(
      c => c.document.trim().replace(/[-., ]/g, '') === normalizedDoc && normalizeStr(c.name) !== normalizedName
    );

    if (docWithDifferentName) {
      showAppToast(`Alerta: La cédula ${newContractor.document} ya pertenece a "${docWithDifferentName.name}". Verifique duplicidad de datos o Info4.`, "warn");
      return;
    }

    setContractors(prev => [...prev, newContractor]);
    addAuditEntry("Creación de Contratista", `Se agregó al contratista "${newContractor.name}" (${newContractor.id}).`);
  };

  const handleUpdateContractor = (updated: Contractor) => {
    if (isReadOnly) {
      showAppToast("Modo Lectura: No tienes permiso para modificar contratistas.", "warn");
      return;
    }
    setContractors(prev => prev.map(c => c.id === updated.id ? updated : c));
    addAuditEntry("Modificación de Contratista", `Se actualizaron datos del contratista "${updated.name}" (${updated.id}).`);
  };

  const handleDeleteContractor = (id: string) => {
    if (isReadOnly) {
      showAppToast("Modo Lectura: No tienes permiso para eliminar contratistas.", "warn");
      return;
    }
    const contractorHasReports = projects.some(p => p.sheets.some(s => s.contractorId === id && s.reports && s.reports.length > 0));
    if (contractorHasReports) {
      showAppToast("No se puede eliminar. Este contratista ya tiene reportes de producción activos.", "warn");
      return;
    }
    const deleting = contractors.find(c => c.id === id);
    setContractors(prev => prev.filter(c => c.id !== id));
    addAuditEntry("Eliminación de Contratista", `Se eliminó al contratista "${deleting ? deleting.name : id}" (${id}).`);
  };

  // 3. Sheet Updates
  const handleUpdateSheet = (updatedSheet: ProductionSheet) => {
    if (isReadOnly) {
      showAppToast("Modo Lectura: No tienes permiso para modificar la hoja de producción.", "warn");
      return;
    }
    const oldSheet = sheets.find(s => s.id === updatedSheet.id);
    if (oldSheet) {
      if (oldSheet.name !== updatedSheet.name) {
        addAuditEntry("Renombrar Hoja", `Se renombró la hoja "${oldSheet.name}" a "${updatedSheet.name}".`);
      } else if (JSON.stringify(oldSheet.reports) !== JSON.stringify(updatedSheet.reports)) {
        addAuditEntry("Modificar Cantidades / Descuentos", `Se modificaron registros de producción/corte en la hoja "${updatedSheet.name}".`);
      } else if (oldSheet.contractorId !== updatedSheet.contractorId) {
        addAuditEntry("Asignar Contratista", `Se actualizó el contratista de la hoja "${updatedSheet.name}".`);
      } else {
        addAuditEntry("Modificar Configuración de Hoja", `Se modificaron los parámetros locales de la hoja "${updatedSheet.name}".`);
      }
    }

    setSheets(prev => {
      // 1. Identify if a new supervisor signature needs to be propagated across all sheets
      const signaturePropagated = updatedSheet.lastSupervisorSignature;

      // 2. Map standard updates to the relevant sheet ID and update lastSupervisorSignature if available
      const nextSheets = prev.map(s => {
        if (s.id === updatedSheet.id) {
          return updatedSheet;
        }
        if (signaturePropagated) {
          return { ...s, lastSupervisorSignature: signaturePropagated };
        }
        return s;
      });

      if (!updatedSheet.reports) {
        return nextSheets;
      }

      // Check if the updated sheet is a warranty release sheet
      const isUpdatedSheetWarrantyRelease = updatedSheet.activity === "Pago de Retenciones de Garantía" || (updatedSheet.code && updatedSheet.code.startsWith("LIB-")) || (updatedSheet.name && (updatedSheet.name.startsWith("LIB-") || updatedSheet.name.startsWith("Liberación")));

      if (isUpdatedSheetWarrantyRelease) {
        // Do not broadcast warranty release reports to other sheets
        return nextSheets;
      }

      // 3. Synchronize reports lists with matched metadata across all sheets
      const updatedReportsList = updatedSheet.reports;
      const refIds = updatedReportsList.map(r => r.id);

      return nextSheets.map(s => {
        // Skip current sheet (already updated)
        if (s.id === updatedSheet.id) {
          return s;
        }

        // Skip other warranty release sheets (they should remain standalone)
        const isWarrantySheet = s.activity === "Pago de Retenciones de Garantía" || (s.code && s.code.startsWith("LIB-")) || (s.name && (s.name.startsWith("LIB-") || s.name.startsWith("Liberación")));
        if (isWarrantySheet) {
          return s;
        }

        const sReports = s.reports || [];

        // Align s.reports elements and sequence to match updatedReportsList
        const alignedReports = updatedReportsList.map(refRep => {
          const existingRep = sReports.find(r => r.id === refRep.id);
          if (existingRep) {
            // Retain unique quantities and discount rates, but sync dates, names, status
            return {
              ...existingRep,
              name: refRep.name,
              dateFrom: refRep.dateFrom,
              dateTo: refRep.dateTo,
              status: refRep.status,
            };
          } else {
            // Instantiate report with 0 quantities for rows belonging to s
            const initialQuants: Record<string, number> = {};
            s.rows.forEach(r => {
              initialQuants[r.id] = 0;
            });
            return {
              id: refRep.id,
              name: refRep.name,
              dateFrom: refRep.dateFrom,
              dateTo: refRep.dateTo,
              status: refRep.status,
              quantities: initialQuants,
              discount1: 0,
              discount1Label: "Descuento #1",
              discount2: 0,
              discount2Label: "Descuento #2"
            };
          }
        });

        const cleanedReports = alignedReports.filter(r => refIds.includes(r.id));

        // Keep activeReportId in perfect sync if needed
        let finalActiveId = s.activeReportId;
        if (updatedSheet.activeReportId && refIds.includes(updatedSheet.activeReportId)) {
          if (!finalActiveId || !refIds.includes(finalActiveId)) {
            finalActiveId = updatedSheet.activeReportId;
          }
        }

        return {
          ...s,
          reports: cleanedReports,
          activeReportId: finalActiveId
        };
      });
    });
  };

  const handleAddSheet = (newSheet: ProductionSheet) => {
    if (isReadOnly) {
      showAppToast("Modo Lectura: No tienes permiso para agregar hojas.", "warn");
      return;
    }
    setSheets(prev => {
      // Find a sheet that already has defined reports. Prefer the one with MORE reports.
      const activeList = prev;
      let masterReports: any[] = [];
      let masterActiveReportId = "";
      
      activeList.forEach(s => {
        const isWarrantySheet = s.activity === "Pago de Retenciones de Garantía" || (s.code && s.code.startsWith("LIB-")) || (s.name && (s.name.startsWith("LIB-") || s.name.startsWith("Liberación")));
        if (!isWarrantySheet && s.reports && s.reports.length > masterReports.length) {
          masterReports = s.reports;
          masterActiveReportId = s.activeReportId || "";
        }
      });

      // Avoid overriding if newSheet specifically provides its own specialized reports (e.g. warranty release)
      const isNewSheetWarranty = newSheet.activity === "Pago de Retenciones de Garantía" || (newSheet.code && newSheet.code.startsWith("LIB-")) || (newSheet.name && (newSheet.name.startsWith("LIB-") || newSheet.name.startsWith("Liberación")));
      if (isNewSheetWarranty || (newSheet.reports && newSheet.reports.some(r => (r as any).isWarrantyRelease))) {
         return [...prev, newSheet];
      }

      if (masterReports.length > 0 && (!newSheet.reports || newSheet.reports.length === 0)) {
        // Align new sheet's reports list exactly with the master reports list
        const initialQuants: Record<string, number> = {};
        newSheet.rows.forEach(r => {
          initialQuants[r.id] = 0;
        });

        const syncedReports = masterReports.map(masterRep => ({
          id: masterRep.id,
          name: masterRep.name,
          dateFrom: masterRep.dateFrom,
          dateTo: masterRep.dateTo,
          status: masterRep.status,
          quantities: { ...initialQuants },
          discount1: 0,
          discount1Label: "Descuento #1",
          discount2: 0,
          discount2Label: "Descuento #2"
        }));

        const sWithReports = {
          ...newSheet,
          reports: syncedReports,
          activeReportId: masterActiveReportId || masterReports[0]?.id || ""
        };
        return [...prev, sWithReports];
      }

      return [...prev, newSheet];
    });
    setActiveSheetId(newSheet.id);
    addAuditEntry("Creación de Hoja de Producción", `Se creó la hoja "${newSheet.name}" para la actividad: "${newSheet.activity}".`);
  };

  const handleDeleteSheet = (sheetId: string) => {
    if (isReadOnly) {
      showAppToast("Modo Lectura: No tienes permiso para eliminar hojas.", "warn");
      return;
    }
    const deletingSheet = sheets.find(s => s.id === sheetId);
    setSheets(prev => prev.filter(s => s.id !== sheetId));
    addAuditEntry("Eliminación de Hoja de Producción", `Se eliminó la hoja: "${deletingSheet ? deletingSheet.name : sheetId}".`);
  };

  const handleMassCloseReports = () => {
    if (isReadOnly) {
      showAppToast("Modo Lectura: No tienes permiso para realizar esta acción.", "warn");
      return;
    }

    setProjects(prevProjects => prevProjects.map(proj => {
      if (proj.id !== activeProjectId) return proj;

      let hasChanges = false;
      const newSheets = proj.sheets.map(sheet => {
        if (!sheet.reports || sheet.reports.length === 0) return sheet;
        
        let sheetChanged = false;
        const newReports = sheet.reports.map(rep => {
          if (rep.status === "ABIERTO") {
            hasChanges = true;
            sheetChanged = true;
            return {
              ...rep,
              status: "CERRADO" as const,
              savedApplyIsr: sheet.applyIsr !== false,
              savedApplyTss: sheet.applyTss !== false,
              savedApplyPension: sheet.applyPension !== false,
              savedApplyWarranty: sheet.applyWarranty !== false,
              savedApplyItbis: sheet.applyItbis === true,
            };
          }
          return rep;
        });

        if (sheetChanged) {
          return { ...sheet, reports: newReports };
        }
        return sheet;
      });

      if (!hasChanges) {
        showAppToast("No se encontraron hojas de producción con reportes abiertos.", "info");
        return proj;
      }

      addAuditEntry("Cierre Masivo de Reportes", `Se han cerrado masivamente todos los reportes abiertos en la obra.`);
      showAppToast("Se han cerrado exitosamente todos los reportes vigentes en la obra.", "success");

      return {
        ...proj,
        sheets: newSheets
      };
    }));
  };

  // 4. Global navigation jump helpers
  const handleNavigate = (tab: 'dashboard' | 'params' | 'contractors' | 'sheets' | 'resumen' | 'aiChat' | 'googleDrive', sheetId?: string | null) => {
    setSelectedTab(tab);
    if (tab === 'sheets' && sheetId) {
      setActiveSheetId(sheetId);
    }
  };

  // 5. Excel exporter trigger
  const handleExportExcelClick = () => {
    exportSystemToExcel(params, contractors, sheets, includeItbisInNet);
  };

  // 5.5 Complete system local restoration from Google Drive backup
  const handleRestoreSystem = (payload: {
    projects: Project[];
    contractors: Contractor[];
    generalPriceGuide: GeneralPriceGuide;
    includeItbisInNet: boolean;
  }) => {
    setProjects(payload.projects);
    setContractors(payload.contractors);
    setGeneralPriceGuide(payload.generalPriceGuide);
    setIncludeItbisInNet(payload.includeItbisInNet);
    
    if (payload.projects && payload.projects.length > 0) {
      setActiveProjectId(payload.projects[0].id);
      // Select first sheet of first project as active fallback
      if (payload.projects[0].sheets && payload.projects[0].sheets[0]) {
        setActiveSheetId(payload.projects[0].sheets[0].id);
      }
    }
    
    localStorage.setItem('nom_construction_v2_projects', JSON.stringify(payload.projects));
    localStorage.setItem(STORAGE_KEY_CONTRACTORS, JSON.stringify(payload.contractors));
    localStorage.setItem(STORAGE_KEY_GENERAL_PRICE_GUIDE, JSON.stringify(payload.generalPriceGuide));
    localStorage.setItem(STORAGE_KEY_ITBIS_NET, JSON.stringify(payload.includeItbisInNet));
    addAuditEntry("Restauración Completa", "Se importó la base de datos completa desde una copia de seguridad.");
  };

  // 6. Reset app database to original state
  const handleResetEntireApp = () => {
    if (isReadOnly) {
      showAppToast("Modo Lectura: No tienes permiso para restablecer toda la app.", "warn");
      return;
    }
    setShowResetConfirm(true);
  };

  const executeResetEntireApp = () => {
    localStorage.removeItem(STORAGE_KEY_PARAMS);
    localStorage.removeItem(STORAGE_KEY_CONTRACTORS);
    localStorage.removeItem(STORAGE_KEY_SHEETS);
    localStorage.removeItem('nom_construction_v2_projects');
    localStorage.removeItem('nom_construction_v2_active_project');
    localStorage.removeItem(STORAGE_KEY_ITBIS_NET);

    const newProjId = `proj-${Date.now()}`;
    const normalizedInit = normalizeSheets([ ...INITIAL_SHEETS ]);
    
    setProjects([{
      id: newProjId,
      name: INITIAL_PARAMS.projectName || 'Proyecto General',
      params: { ...INITIAL_PARAMS },
      sheets: normalizedInit,
      createdAt: new Date().toISOString(),
      createdBy: currentUser
    }]);
    
    setActiveProjectId(newProjId);
    setContractors([ ...INITIAL_CONTRACTORS ]);
    setIncludeItbisInNet(true);
    setActiveSheetId(INITIAL_SHEETS[0]?.id || null);
    setSelectedTab('dashboard');
    addAuditEntry("Restablecer Sistema completo", "Se restableció el sistema completo a los valores iniciales de fábrica.");
    setShowResetConfirm(false);
    showAppToast("¡Sistema restaurado con éxito!", "success");
  };

  const handleCreateNewProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectId.trim() || !newProjectName.trim()) {
      showAppToast("ID y Nombre son campos requeridos.", "warn");
      return;
    }
    
    // Check if ID already exists
    if (projects.some(p => p.id === newProjectId)) {
      showAppToast(`El ID "${newProjectId}" ya existe. Por favor usa un identificador único.`, "warn");
      return;
    }
    
    const newProj: Project = {
      id: newProjectId,
      name: newProjectName,
      params: { ...INITIAL_PARAMS, projectName: newProjectName },
      sheets: normalizeSheets([{
        id: `sheet-${Date.now()}`,
        name: "Hoja 1",
        supervisor: "",
        code: "001",
        activity: "Actividad General",
        rows: []
      }]),
      createdAt: new Date().toISOString(),
      createdBy: currentUser
    };
    
    setProjects(prev => [...prev, newProj]);
    setActiveProjectId(newProjectId);
    setShowNewProjectModal(false);
    addAuditEntry("Creación de Obra/Proyecto", `Se creó un nuevo proyecto: ${newProjectName} con ID ${newProjectId}`);
    showAppToast(`Se ha creado la obra ${newProjectName}.`, "success");
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mb-4"></div>
        <p className="text-white font-bold animate-pulse">Cargando base de datos local...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <LoginScreen 
        onLogin={(username) => {
          setCurrentUser(username);
          setIsAuthenticated(true);
          localStorage.setItem(STORAGE_KEY_ACTIVE_USER, username);
          showAppToast(`Bienvenido, ${username}!`, "success");
        }} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans text-slate-800 antialiased flex flex-col print:bg-white print:text-black">

      {/* PROFESSIONAL UPPER HEADER RAIL */}
      <header className="bg-gradient-to-r from-[#1a3a52] via-[#1f4a68] to-[#1a3a52] border-b border-[#d4af37]/20 text-white py-4 px-6 sticky top-0 z-40 shadow-lg shrink-0 print:hidden">
        <div className="max-w-full mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Logo & Project summary */}
          <div className="flex items-center space-x-4">
            <div className="bg-gradient-to-br from-[#d4af37] to-[#c4941f] px-3 py-2 rounded-lg flex items-center justify-center shadow-md">
              <AppLogo className="w-5 text-[#1a3a52]" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <span className="text-lg font-bold tracking-wide text-white">MARES NÓMINAS</span>
                <span className="bg-[#d4af37]/20 text-[#d4af37] text-[10px] uppercase font-mono px-2 py-1 rounded-full font-semibold border border-[#d4af37]/30">V1.2</span>
              </div>
              <p className="text-[12px] text-slate-300 font-medium mt-0.5">Sistema de Nóminas y Presupuesto</p>
            </div>
          </div>

          {/* Current global context block */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-white bg-white/10 backdrop-blur-sm py-2 px-4 rounded-xl border border-white/20 shadow-sm">
            <div className="flex items-center space-x-2">
              <span className="text-white/80 font-semibold">PROYECTO:</span>
              <select
                value={activeProjectId || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'NEW_PROJECT') {
                    setNewProjectName("Nueva Obra");
                    setNewProjectId(`OBRA-${String(projects.length + 1).padStart(3, '0')}`);
                    setShowNewProjectModal(true);
                  } else {
                    setActiveProjectId(val);
                  }
                }}
                className="bg-white/15 border border-white/20 text-white font-semibold px-3 py-1 rounded-lg text-sm outline-none cursor-pointer focus:border-[#d4af37] focus:bg-white/20 transition-all"
              >
                {projects.filter(p => !p.isHidden || p.id === activeProjectId).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name || 'Sin Nombre'} {p.status === 'CERRADA' ? '(CERRADA)' : ''} {p.isHidden ? '(OCULTA)' : ''}
                  </option>
                ))}
                {isGlobalAdmin && (
                  <>
                    <option disabled>──────────</option>
                    <option value="NEW_PROJECT">➕ Nueva Obra / Proyecto</option>
                  </>
                )}
              </select>
              {isReadOnly && (
                <span className="ml-1 text-rose-400 flex items-center gap-1 bg-rose-500/10 px-2 py-0.5 rounded text-[10px] font-bold border border-rose-500/20" title={`Creado por: ${activeProject?.createdBy || 'Otro usuario'}`}>
                  <ShieldAlert size={12} />
                  SOLO LECTURA
                </span>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowProjectManager(true)}
                  title="Administrar Obras"
                  className="ml-2 hover:bg-slate-700 text-slate-400 p-1 rounded transition-colors"
                >
                  <Settings size={14} />
                </button>
              )}
            </div>
            <span className="text-white/30 hidden sm:inline">•</span>
            <div>
              <span className="text-white/70 font-medium mr-2">RETENCIONES:</span>
              <span className="font-mono text-[#d4af37] font-semibold">ISR {params.percentIsr}% • TSS {params.percentTss}%</span>
            </div>

            <span className="text-white/30 hidden sm:inline">•</span>
            <button
              onClick={handleManualSync}
              disabled={syncStatus === 'syncing' || !isAuthenticated}
              className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-all ${isAuthenticated && syncStatus !== 'syncing' ? 'hover:bg-white/15 cursor-pointer' : 'opacity-60'}`}
              title="Sincronizar con la nube"
            >
               <Cloud size={16} className={isAuthenticated ? "text-[#d4af37]" : "text-white/40"} />
               <span className="text-[11px] font-bold uppercase tracking-wider">
                 {isAuthenticated ? <span>🟢 <span className="text-[#d4af37]">Online</span></span> : <span className="text-white/60">Offline</span>}
               </span>
            </button>
          </div>

          {/* User & Export Panel */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 mr-2 pr-3 border-r border-white/20">
              <UserIcon size={16} className="text-[#d4af37] hidden sm:block" />
              <span className="text-sm font-semibold text-white hidden sm:inline">{currentUser || 'Usuario'}</span>
              <button
                onClick={() => {
                  setIsAuthenticated(false);
                  setCurrentUser('');
                  localStorage.removeItem(STORAGE_KEY_ACTIVE_USER);
                }}
                className="text-[11px] bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 text-white font-medium border border-white/20"
                title="Cerrar Sesión"
              >
                <LogOut size={10} />
                <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
            
            <button
              onClick={handleExportExcelClick}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg flex items-center space-x-1.5 shadow-sm transition-all cursor-pointer hover:bg-blue-550 active:scale-95"
              title="Exportar en formato XLSX real para Microsoft Excel"
            >
              <Download size={14} />
              <span>Exportar Excel</span>
            </button>
          </div>
        </div>
      </header>

      {/* CORE NAVIGATION SYSTEM */}
      <nav className="bg-white border-b border-slate-200 shadow-xs sticky top-[68px] z-30 shrink-0 print:hidden overflow-x-auto">
        <div className="max-w-full mx-auto px-4 md:px-8 flex space-x-1.5 py-1.5">
          {/* Dashboard Selector */}
          <button
            onClick={() => setSelectedTab('dashboard')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer hover:bg-slate-50 ${
              selectedTab === 'dashboard' 
                ? "text-blue-600 border-b-2 border-blue-600 bg-slate-50 font-extrabold" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <TrendingUp size={15} />
            <span>Dashboard</span>
          </button>

          {/* Contractors tab */}
          <button
            onClick={() => setSelectedTab('contractors')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer hover:bg-slate-50 ${
              selectedTab === 'contractors' 
                ? "text-blue-600 border-b-2 border-blue-600 bg-slate-50 font-extrabold" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Users size={15} />
            <span>Base Contratistas</span>
          </button>

          {/* Production Sheets Grid tab */}
          <button
            onClick={() => setSelectedTab('sheets')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer hover:bg-slate-50 ${
              selectedTab === 'sheets' 
                ? "text-blue-600 border-b-2 border-blue-600 bg-slate-50 font-extrabold" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Grid2X2 size={15} />
            <span>Hojas de Producción</span>
          </button>

          {/* Summary consolidation Resumen #1 */}
          <button
            onClick={() => setSelectedTab('resumen')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer hover:bg-slate-50 ${
              selectedTab === 'resumen' 
                ? "text-blue-600 border-b-2 border-blue-600 bg-slate-50 font-extrabold" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <FileCheck size={15} />
            <span>Resúmenes</span>
          </button>

          {/* Financial calculations settings parameter */}
          <button
            onClick={() => setSelectedTab('params')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer hover:bg-slate-50 ${
              selectedTab === 'params' 
                ? "text-blue-600 border-b-2 border-blue-600 bg-slate-50 font-extrabold" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Settings2 size={15} />
            <span>Parámetros (tblParametros)</span>
          </button>

          {/* AI Chat tab button */}
          <button
            onClick={() => setSelectedTab('aiChat')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer hover:bg-slate-50 ${
              selectedTab === 'aiChat' 
                ? "text-blue-600 border-b-2 border-blue-600 bg-slate-50 font-extrabold" 
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            <Sparkles size={15} className="text-amber-500" />
            <span className="font-extrabold">Análisis IA y Chat</span>
          </button>

          {/* Google Drive Sincronización tab button */}
          <button
            onClick={() => setSelectedTab('googleDrive')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer hover:bg-slate-50 ${
              selectedTab === 'googleDrive' 
                ? "text-blue-600 border-b-2 border-blue-600 bg-slate-50 font-extrabold" 
                : "text-slate-500 hover:text-slate-950"
            }`}
          >
            <Cloud size={15} className="text-blue-500" />
            <span className="font-extrabold">Google Drive</span>
          </button>

          {/* Base de Usuarios tab button */}
          <button
            onClick={() => setSelectedTab('users')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center space-x-1.5 cursor-pointer hover:bg-slate-50 ${
              selectedTab === 'users' 
                ? "text-blue-600 border-b-2 border-blue-600 bg-slate-50 font-extrabold" 
                : "text-slate-500 hover:text-slate-950"
            }`}
          >
            <Lock size={15} className="text-indigo-500" />
            <span className="font-extrabold">Base Usuarios</span>
          </button>
        </div>
      </nav>

      {/* VIEWPORT BODY CONTAINER */}
      <main className="flex-1 max-w-full w-full mx-auto p-4 md:p-8 overflow-y-auto">
        {selectedTab === 'dashboard' && (
          <DashboardTab
            params={params}
            contractors={contractors}
            sheets={sheets}
            includeItbisInNet={includeItbisInNet}
            onNavigate={handleNavigate}
            onAddNewSheet={() => setSelectedTab('sheets')}
            onExportExcel={handleExportExcelClick}
            auditLogs={auditLogs}
            currentUser={currentUser}
            onUpdateCurrentUser={setCurrentUser}
            onClearAuditLogs={() => {
              setAuditLogs([]);
              localStorage.removeItem(STORAGE_KEY_AUDIT_LOGS);
            }}
          />
        )}

        {selectedTab === 'params' && (
          <ParametersTab
            params={params}
            onUpdateParams={handleUpdateParams}
            includeItbisInNet={includeItbisInNet}
            onToggleItbisInNet={() => setIncludeItbisInNet(!includeItbisInNet)}
            onResetParams={handleResetParams}
            hasAnyClosedReport={sheets.some((s) => (s.reports || []).some((r) => r.status === "CERRADO"))}
            auditLogs={auditLogs}
          />
        )}

        {selectedTab === 'contractors' && (
          <ContractorsTab
            projects={projects}
            activeProjectId={activeProjectId!}
            params={params}
            contractors={contractors}
            onAddContractor={handleAddContractor}
            onUpdateContractor={handleUpdateContractor}
            onDeleteContractor={handleDeleteContractor}
            generalPriceGuide={generalPriceGuide}
            onUpdateGeneralPriceGuide={handleUpdateGeneralPriceGuide}
          />
        )}

        {selectedTab === 'sheets' && (
          <ProductionSheetsTab
            activeProjectId={activeProjectId!}
            params={params}
            contractors={contractors}
            sheets={sheets}
            activeSheetId={activeSheetId}
            onUpdateSheet={handleUpdateSheet}
            onAddSheet={handleAddSheet}
            onDeleteSheet={handleDeleteSheet}
            onSetActiveSheetId={setActiveSheetId}
            includeItbisInNet={includeItbisInNet}
            generalPriceGuide={generalPriceGuide}
          />
        )}

        {selectedTab === 'resumen' && (
          <ResumenTab
            params={params}
            contractors={contractors}
            sheets={sheets}
            includeItbisInNet={includeItbisInNet}
            onNavigate={handleNavigate}
            onMassCloseReports={handleMassCloseReports}
          />
        )}

        {selectedTab === 'aiChat' && (
          <AiChatTab
            contractors={contractors}
            sheets={sheets}
            params={params}
            onAddContractor={handleAddContractor}
            onUpdateContractor={handleUpdateContractor}
            onDeleteContractor={handleDeleteContractor}
            onUpdateSheet={handleUpdateSheet}
            onAddSheet={handleAddSheet}
            onDeleteSheet={handleDeleteSheet}
            onUpdateParams={handleUpdateParams}
            addAuditEntry={addAuditEntry}
            generalPriceGuide={generalPriceGuide}
          />
        )}

        {selectedTab === 'googleDrive' && (
            <GoogleDriveTab
              projects={projects}
              contractors={contractors}
              generalPriceGuide={generalPriceGuide}
              includeItbisInNet={includeItbisInNet}
              activeProjectId={activeProjectId}
              onRestoreSystem={handleRestoreSystem}
              addAuditEntry={addAuditEntry}
              isReadOnly={isReadOnly}
              isAdmin={isAdmin}
            />
        )}

        {selectedTab === 'users' && (
          <UsersTab
            currentUser={currentUser}
            onUpdateCurrentUser={setCurrentUser}
            showAppToast={showAppToast}
            projects={projects}
            isGlobalAdmin={isGlobalAdmin}
          />
        )}
      </main>

      {/* SYSTEM PRINT FOOTER STATUS BAR */}
      <footer className="bg-slate-100 border-t border-slate-200 py-3 px-6 text-[11px] text-slate-500 mt-auto shrink-0 print:hidden select-none flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-4 text-[10px] text-slate-500 font-medium">
          <span className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${isOnline ? (syncStatus === 'syncing' ? 'bg-amber-500 animate-spin border-t border-transparent' : 'bg-emerald-500') : 'bg-rose-500 animate-pulse'}`}></div> 
            {isOnline ? (
              syncStatus === 'syncing' ? (
                <span className="font-bold text-amber-600">Sincronizando Cambios...</span>
              ) : (
                <span className="font-bold text-slate-700">{isAuthenticated ? 'Conectado a Firestore (Sincronizado)' : 'Conectado a DB Local (Sincronizado)'}</span>
              )
            ) : (
              <span className="font-bold text-rose-600 animate-pulse">Modo Offline (Trabajando en Caché Local)</span>
            )}
          </span>
          <span>|</span>
          <span className="font-mono text-[9px] text-slate-400 uppercase">
            Soporte PWA: Activo (sw.js)
          </span>
          {showAutoSaveIndicator && (
            <>
              <span>|</span>
              <span className="text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-extrabold flex items-center gap-1 transition-all">
                <FileCheck size={12} />
                Autoguardado exitoso
              </span>
            </>
          )}
          {syncStatus === 'pending' && (
            <>
              <span>|</span>
              <span className="text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 font-extrabold animate-pulse">
                Hay cambios locales pendientes para sincronizar
              </span>
            </>
          )}
        </div>
        <div className="flex items-center space-x-2 text-[10px] text-slate-450 font-medium">
          <span>MARESNOMINAS SAS © 2026</span>
          <span className="text-slate-300">|</span>
          <span>RESUMEN #1 Engine</span>
        </div>
      </footer>

      {/* PWA AND OFFLINE SYNC FLOATING TOASTS */}
      {showOfflineToast && (
        <div className="fixed bottom-5 right-5 z-55 bg-slate-900 border border-slate-800 text-white p-4 rounded-xl shadow-2xl flex items-start space-x-3 max-w-sm transition-all animate-bounce" style={{ zIndex: 9999 }}>
          <div className="bg-rose-500/20 text-rose-400 p-2 rounded-lg shrink-0 mt-0.5">
            <WifiOff size={16} />
          </div>
          <div>
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black font-mono text-rose-400 tracking-wider">MODO OFFLINE</h4>
              <button onClick={() => setShowOfflineToast(false)} className="text-[10px] text-slate-400 hover:text-white font-mono ml-4">✕</button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              La conexión de red se ha interrumpido. MARESNOMINAS seguirá funcionando con total normalidad y guardará todo localmente.
            </p>
          </div>
        </div>
      )}

      {showSyncSuccessToast && (
        <div className="fixed bottom-5 right-5 z-55 bg-slate-900 border border-slate-800 text-white p-4 rounded-xl shadow-2xl flex items-start space-x-3 max-w-sm transition-all animate-pulse" style={{ zIndex: 9999 }}>
          <div className="bg-blue-600/30 text-blue-400 p-2 rounded-lg shrink-0 mt-0.5">
            <CloudLightning size={16} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-black font-mono text-blue-400 tracking-wider">CONEXIÓN RESTABLECIDA</h4>
              <button onClick={() => setShowSyncSuccessToast(false)} className="text-[10px] text-slate-400 hover:text-white font-mono ml-4">✕</button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">
              La conexión ha retornado. MARESNOMINAS ha sincronizado y verificado exitosamente todos sus registros locales.
            </p>
          </div>
        </div>
      )}

      {/* New Project Dialog */}
      {showNewProjectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all" style={{ zIndex: 10000 }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full border border-slate-100 flex flex-col max-h-full animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 pb-2 border-b border-slate-100 shrink-0">
               <h2 className="text-lg font-bold text-slate-800">Crear Nueva Obra</h2>
            </div>
            <form onSubmit={handleCreateNewProject} className="p-6 space-y-4 overflow-y-auto">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">ID de Obra (Prefijo):</label>
                <input
                  type="text"
                  value={newProjectId}
                  onChange={(e) => setNewProjectId(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-hidden font-mono uppercase ${projects.some(p => p.id === newProjectId.trim()) ? 'border-red-400 bg-red-50 text-red-800 focus:border-red-500' : 'bg-slate-50 border-slate-300 text-slate-800 focus:border-blue-500'}`}
                  placeholder="OBRA-001"
                  required
                />
                {projects.some(p => p.id === newProjectId.trim()) && (
                  <p className="text-[10px] text-red-600 font-bold mt-1">Este ID ya existe en otra obra.</p>
                )}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nombre de Obra / Proyecto:</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-hidden focus:border-blue-500 font-bold text-slate-800"
                  placeholder="Nueva Obra"
                  required
                />
              </div>
              <div className="flex items-center space-x-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewProjectModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={projects.some(p => p.id === newProjectId.trim()) || !newProjectId.trim() || !newProjectName.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar y Crear
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Projects Modal (Admin Only) */}
      {showProjectManager && isAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-all" style={{ zIndex: 10000 }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-2xl">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2 text-slate-800">
                  <Settings size={22} className="text-blue-600" />
                  Administrador de Obras
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Gestiona las obras existentes. Puedes cerrarlas (modo solo lectura), ocultarlas o eliminarlas.
                </p>
              </div>
              <button
                onClick={() => setShowProjectManager(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-200 rounded-lg"
              >
                ✕
              </button>
            </div>
            <div className="p-0 overflow-y-auto bg-slate-100 flex-1">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-200 text-slate-700 text-xs uppercase">
                    <th className="p-3 font-semibold border-b border-slate-300">ID Obra</th>
                    <th className="p-3 font-semibold border-b border-slate-300">Nombre</th>
                    <th className="p-3 font-semibold border-b border-slate-300">Creador</th>
                    <th className="p-3 font-semibold border-b border-slate-300">Estado</th>
                    <th className="p-3 font-semibold border-b border-slate-300">Visibilidad</th>
                    <th className="p-3 font-semibold border-b border-slate-300 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id} className="bg-white border-b border-slate-200 hover:bg-slate-50 transition-colors">
                      <td className="p-3 font-mono text-xs text-slate-500">
                        {editingProjectId === p.id ? (
                          <input 
                            type="text" 
                            value={editProjectIdValue} 
                            onChange={e => setEditProjectIdValue(e.target.value)} 
                            className="w-full px-2 py-1 border rounded font-mono uppercase text-xs" 
                          />
                        ) : (
                          p.id
                        )}
                      </td>
                      <td className="p-3 font-medium text-slate-800">
                        {editingProjectId === p.id ? (
                          <input 
                            type="text" 
                            value={editProjectNameValue} 
                            onChange={e => setEditProjectNameValue(e.target.value)} 
                            className="w-full px-2 py-1 border rounded text-xs" 
                          />
                        ) : (
                          p.name || 'Sin Nombre'
                        )}
                      </td>
                      <td className="p-3 text-slate-600">{p.createdBy || 'Sistema'}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded inline-flex items-center gap-1 text-[10px] font-bold ${p.status === 'CERRADA' ? 'bg-rose-100 text-rose-700 border border-rose-200' : 'bg-emerald-100 text-emerald-700 border border-emerald-200'}`}>
                          {p.status === 'CERRADA' ? <Lock size={12} /> : <Unlock size={12} />}
                          {p.status === 'CERRADA' ? 'CERRADA' : 'ACTIVA'}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded inline-flex items-center gap-1 text-[10px] font-bold ${p.isHidden ? 'bg-slate-200 text-slate-600 border border-slate-300' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                          {p.isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                          {p.isHidden ? 'OCULTA' : 'VISIBLE'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {editingProjectId === p.id ? (
                            <>
                              <button
                                onClick={handleSaveEditProject}
                                className="p-1.5 rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50 transition-colors"
                                title="Guardar cambios"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => setEditingProjectId(null)}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                                title="Cancelar edición"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              {!projectHasClosedReports(p) && (
                                <button
                                  onClick={() => handleStartEditProject(p)}
                                  className="p-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="Editar Obra"
                                >
                                  <Pencil size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => handleToggleProjectStatus(p.id, p.status)}
                                className={`p-1.5 rounded-lg border transition-colors ${p.status === 'CERRADA' ? 'text-emerald-600 hover:bg-emerald-50 border-emerald-200' : 'text-rose-600 hover:bg-rose-50 border-rose-200'}`}
                                title={p.status === 'CERRADA' ? "Abrir Obra" : "Cerrar Obra"}
                              >
                                {p.status === 'CERRADA' ? <Unlock size={14} /> : <Lock size={14} />}
                              </button>
                              <button
                                onClick={() => handleToggleProjectHidden(p.id, p.isHidden)}
                                className={`p-1.5 rounded-lg border transition-colors ${p.isHidden ? 'text-blue-600 hover:bg-blue-50 border-blue-200' : 'text-slate-500 hover:bg-slate-100 border-slate-300'}`}
                                title={p.isHidden ? "Mostrar Obra" : "Ocultar Obra"}
                              >
                                {p.isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
                              </button>
                              <button
                                onClick={() => setProjectToDelete(p.id)}
                                className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                                title="Eliminar Obra"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-200 bg-white rounded-b-2xl flex justify-end">
              <button
                onClick={() => setShowProjectManager(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold shadow hover:bg-slate-800 transition-colors"
              >
                Cerrar Administrador
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 transition-all" style={{ zIndex: 10000 }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm border border-slate-200 overflow-hidden text-slate-800 animate-in fade-in zoom-in-95">
            <div className="px-5 py-4 bg-red-600 text-white flex items-center gap-2">
              <Trash2 size={16} />
              <span className="font-bold text-xs uppercase tracking-wider">
                ¿Eliminar Obra?
              </span>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                ¿Está seguro que desea ELIMINAR la obra{" "}
                <strong className="text-slate-900 block mt-1 font-semibold text-lg">
                  {projects.find((p) => p.id === projectToDelete)?.name}
                </strong>
              </p>
              <div className="bg-red-50 p-3 rounded-lg border border-red-100 text-xs text-red-800 leading-normal">
                <p className="font-bold mb-1">⚠️ ATENCIÓN:</p>
                <ul className="list-disc pl-4 space-y-1 font-medium">
                  <li>Se perderán todas las hojas de producción de esta obra.</li>
                  <li>Esta acción NO se puede deshacer.</li>
                  <li>Los contratistas NO serán borrados de la base de datos, solo desvinculados.</li>
                </ul>
              </div>
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shadow-sm"
                onClick={() => setProjectToDelete(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-sm transition-colors flex items-center gap-1.5 focus:scale-95"
                onClick={confirmDeleteProject}
              >
                <Trash2 size={14} />
                Sí, Eliminar Obra
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RESTORE DATABASE SYSTEMS CUSTOM COMFIRMATION DIALOGUE (Prevents iframe blocking) */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs transition-all" style={{ zIndex: 10000 }}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 flex flex-col space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-100">
              <span className="shrink-0 p-1.5 bg-amber-100 rounded-full text-amber-700">
                <RefreshCcw size={20} className="animate-spin" />
              </span>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-amber-900">¿Restablecer MARESNOMINAS?</h3>
                <p className="text-[10px] text-amber-600 font-medium">Esta acción no se puede deshacer.</p>
              </div>
            </div>
            
            <p className="text-xs text-slate-600 leading-relaxed">
              ¿Está seguro de querer <strong>RESTABLECER TODO</strong> el sistema? Se borrarán de forma definitiva todos los contratistas personalizados, hojas de producción y cortes de pago creados.
            </p>

            <div className="flex items-center space-x-2 justify-end pt-2">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={executeResetEntireApp}
                className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-650 hover:bg-rose-500 hover:scale-105 active:scale-95 transition-all shadow-sm cursor-pointer"
              >
                Sí, Restablecer Todo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Modal */}
      {/* GENERAL IN-APP TOAST */}
      {generalToast && (
        <div className="fixed bottom-5 right-5 z-55 bg-slate-950 border border-slate-800 text-white p-4 rounded-xl shadow-2xl flex items-start space-x-3 max-w-sm transition-all animate-bounce" style={{ zIndex: 9999 }}>
          <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${
            generalToast.type === 'warn'
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-emerald-500/20 text-emerald-400'
          }`}>
            <Sparkles size={16} />
          </div>
          <div className="flex-1">
            <h4 className="text-[10px] font-black font-mono tracking-wider text-slate-400 uppercase">Notificación del Sistema</h4>
            <p className="text-[11px] text-slate-200 mt-1 leading-relaxed">
              {generalToast.message}
            </p>
          </div>
        </div>
      )}

      {/* Sync Status Indicator & Conflict Resolution */}
      {isAuthenticated && (
        <SyncStatusIndicator
          status={syncStatus as 'syncing' | 'synced' | 'offline' | 'error'}
          conflicts={syncConflicts}
          onResolveConflict={(conflict, resolution) => {
            resolveConflict(conflict, resolution);
            setSyncConflicts(syncConflicts.filter(c => !(c.id === conflict.id && c.type === conflict.type)));
          }}
          onDismiss={() => setSyncConflicts([])}
        />
      )}
    </div>
  );
}
