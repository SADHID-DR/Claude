/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { googleSignIn, logout, initAuth } from '../googleAuth';
import { exportSystemToExcelBlob } from '../excelExporter';
import html2canvas from '../html2canvasHelper';
import { jsPDF } from 'jspdf';
import { calculateRow, formatCurrencyValue } from '../data';
import { generateChecksumSync } from '../syncService';
import { MeasurementGrid } from './MeasurementGrid';
import { 
  Cloud, 
  UploadCloud, 
  FolderOpen, 
  RefreshCw, 
  Trash2, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  Database, 
  ShieldAlert, 
  Download, 
  ArrowRight,
  LogOut,
  X,
  FileSpreadsheet,
  FileDown,
  Printer,
  Folder,
  ChevronRight,
  ChevronDown,
  Search
} from 'lucide-react';

function formatDateReadable(dateStr: string | undefined): string {
  if (!dateStr) return 'N/A';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' });
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

interface GoogleDriveTabProps {
  projects: any[];
  contractors: any[];
  generalPriceGuide: any;
  includeItbisInNet: boolean;
  activeProjectId: string | null;
  onRestoreSystem: (data: {
    projects: any[];
    contractors: any[];
    generalPriceGuide: any;
    includeItbisInNet: boolean;
  }) => void;
  addAuditEntry: (action: string, details: string) => void;
  isReadOnly?: boolean;
  isAdmin?: boolean;
}

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
  size?: string;
  description?: string;
}

function formatBytesGlobal(bytesStr?: string): string {
  if (!bytesStr) return '0 B';
  const bytes = parseInt(bytesStr, 10);
  if (isNaN(bytes) || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

interface DriveTreeNodeProps {
  file: DriveFile;
  accessToken: string;
  depth?: number;
  isReadOnly: boolean;
  onRestore: (f: DriveFile) => void;
  onVerify?: (f: DriveFile) => void;
  onDelete: (f: DriveFile) => void;
  searchQuery?: string;
}

const DriveTreeNode: React.FC<DriveTreeNodeProps> = ({
  file,
  accessToken,
  depth = 0,
  isReadOnly,
  onRestore,
  onVerify,
  onDelete,
  searchQuery = ''
}) => {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [children, setChildren] = useState<DriveFile[]>([]);
  
  const isFolder = file.mimeType === 'application/vnd.google-apps.folder';
  const isJson = !isFolder && (file.mimeType === 'application/json' || file.name.endsWith('.json'));
  const isPdf = !isFolder && (file.mimeType === 'application/pdf' || file.name.endsWith('.pdf'));
  const isExcel = !isFolder && !isJson && !isPdf;

  // Search filtering logic
  const searchStr = searchQuery.trim().toLowerCase();
  const nodeMatches = !searchStr || file.name.toLowerCase().includes(searchStr);
  const hasMatchingChild = children.some(c => c.name.toLowerCase().includes(searchStr));

  // Hide file if it doesn't match. For folders, only hide if we are expanded and no children match, to keep it clean.
  // Wait, if we keep unexpanded folders, it clutters the search result. Let's just hide unexpanded folders if they don't match.
  // If the user wants to search inside a folder, they can clear the search, expand it, then search again.
  if (searchStr && !nodeMatches && !hasMatchingChild) {
    return null;
  }
  
  const toggleExpand = async () => {
    if (!isFolder) return;
    if (!expanded) {
      setExpanded(true);
      if (children.length === 0) {
        setLoading(true);
        try {
          const folderQuery = encodeURIComponent(`trashed = false and '${file.id}' in parents`);
          const res = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${folderQuery}&fields=files(id,name,mimeType,createdTime,size,description)&orderBy=folder,createdTime%20desc&pageSize=100&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (res.ok) {
            const data = await res.json();
            if (data.files) {
              const sortedChildren = data.files.sort((a: any, b: any) => 
                a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
              );
              setChildren(sortedChildren);
            }
          }
        } catch (err) {
          console.error("Error fetching subfolder cache", err);
        } finally {
          setLoading(false);
        }
      }
    } else {
      setExpanded(false);
    }
  };

  const dateFormatted = new Date(file.createdTime).toLocaleDateString('es-DO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Set up conditional styling based on file types
  let iconBg = 'bg-slate-50 border-slate-100 text-slate-600';
  let iconElement = <FileText size={20} />;
  let typeBadge = null;

  if (isFolder) {
    iconBg = expanded ? 'bg-amber-100 border-amber-200 text-amber-600' : 'bg-amber-50 border-amber-100 text-amber-500';
    iconElement = expanded ? <FolderOpen size={20} className="fill-amber-100" /> : <Folder size={20} className="fill-amber-100" />;
    typeBadge = null;
  } else if (isJson) {
    iconBg = 'bg-indigo-50 border-indigo-100 text-indigo-600';
    iconElement = <Database size={20} />;
    typeBadge = (
      <span className="text-indigo-600 font-bold uppercase tracking-wider bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded text-[8px] font-mono">
        SISTEMA COMPLETO
      </span>
    );
  } else if (isPdf) {
    iconBg = 'bg-rose-50 border-rose-100 text-rose-600';
    iconElement = <FileText size={20} />;
    typeBadge = (
      <span className="text-rose-600 font-bold uppercase tracking-wider bg-rose-50 border border-rose-100 px-1.5 py-0.5 rounded text-[8px] font-mono">
        COMPROBANTE PDF
      </span>
    );
  } else if (isExcel) {
    iconBg = 'bg-emerald-50 border-emerald-100 text-emerald-600';
    iconElement = <FileSpreadsheet size={20} />;
    typeBadge = (
      <span className="text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded text-[8px] font-mono">
        HOJA EXCEL
      </span>
    );
  }

  return (
    <div className="flex flex-col">
      <div
        className="group p-3 bg-white hover:bg-slate-50 border border-transparent hover:border-slate-100 flex items-center justify-between gap-4 transition-all duration-150 relative mb-1 rounded-xl hover:shadow-xs"
        style={{ paddingLeft: `${Math.max(0.75, depth * 1.5 + 0.75)}rem`, borderLeft: depth > 0 ? '2px solid #e2e8f0' : 'none', marginLeft: depth > 0 ? `${depth * 0.5}rem` : '0' }}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {isFolder && (
            <button
              onClick={toggleExpand}
              className="p-1 hover:bg-slate-200 rounded text-slate-400 shrink-0"
            >
              {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>
          )}
          {!isFolder && <div className="w-6 shrink-0" />}
          <div className={`p-2 rounded-lg border ${iconBg} shrink-0`}>
            {iconElement}
          </div>
          <div className="min-w-0 pr-2">
            {isFolder ? (
              <button 
                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate text-left block max-w-[200px] md:max-w-xs"
                title={file.name}
                onClick={toggleExpand}
              >
                {file.name}
              </button>
            ) : (
              <h4 className="text-xs font-bold text-slate-800 truncate max-w-[200px] md:max-w-xs" title={file.name}>
                {file.name}
              </h4>
            )}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5 text-[9px] text-slate-400 font-medium">
              <span className="bg-slate-100 px-1 py-0.5 rounded text-slate-600 font-mono">{isFolder ? '--' : formatBytesGlobal(file.size)}</span>
              <span>•</span>
              <span>{dateFormatted}</span>
              {typeBadge && (
                <>
                  <span>•</span>
                  {typeBadge}
                </>
              )}
            </div>
            {file.description && (
              <p className="text-[10px] text-slate-500 italic mt-1 truncate max-w-[260px]">
                "{file.description}"
              </p>
            )}
          </div>
        </div>

        {/* Action buttons inside list */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isFolder && (
            <button
              onClick={toggleExpand}
              className="bg-amber-100 hover:bg-amber-200 text-amber-800 font-semibold py-1.5 px-3 rounded-lg text-[10px] transition-all flex items-center gap-1 border border-amber-200 cursor-pointer"
              title={expanded ? "Contraer subcarpeta" : "Explorar el contenido de esta subcarpeta"}
            >
              <FolderOpen size={11} />
              {expanded ? "Contraer" : "Explorar"}
            </button>
          )}
          {isJson && !isReadOnly && (
            <div className="flex flex-col gap-1.5 sm:flex-row">
              {onVerify && (
                <button
                  onClick={() => onVerify(file)}
                  className="bg-sky-50 hover:bg-sky-100 text-sky-700 font-semibold py-1.5 px-3 rounded-lg text-[10px] transition-all flex items-center gap-1 border border-sky-200"
                  title="Verificar integridad de la base de datos"
                >
                  <ShieldAlert size={11} />
                  Verificar
                </button>
              )}
              <button
                onClick={() => onRestore(file)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-1.5 px-3 rounded-lg text-[10px] transition-all flex items-center gap-1"
                title="Restaurar base de datos a este estado"
              >
                <Download size={11} />
                Restaurar
              </button>
            </div>
          )}
          
          {isPdf && (
            <a
              href={`https://drive.google.com/file/d/${file.id}/view?usp=drivesdk`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold py-1.5 px-3 rounded-lg text-[10px] transition-all flex items-center gap-1 border border-rose-200"
              title="Ver PDF en Drive"
            >
              Ver PDF
            </a>
          )}

          {isExcel && (
            <a
              href={`https://docs.google.com/spreadsheets/d/${file.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold py-1.5 px-3 rounded-lg text-[10px] transition-all flex items-center gap-1 border border-emerald-200"
              title="Abrir en Google Sheets"
            >
              Abrir
            </a>
          )}

          {!isReadOnly && !isFolder && (
            <button
              onClick={() => onDelete(file)}
              className="p-1.5 bg-slate-100 hover:bg-red-100 text-slate-400 hover:text-red-600 rounded-md transition-colors"
              title="Mover a la papelera"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
      
      {/* Children list */}
      {expanded && (
        <div className="flex flex-col border-l border-slate-100 ml-[1.5rem] mt-1 mb-2">
          {loading ? (
            <div className="p-3 text-xs text-slate-400 font-medium flex items-center gap-2">
              <RefreshCw size={12} className="animate-spin text-blue-500" />
              Cargando subcarpetas...
            </div>
          ) : children.length === 0 ? (
            <div className="p-3 text-[10px] text-slate-400 italic">
              Carpeta vacía
            </div>
          ) : (
            children.map(child => (
              <DriveTreeNode
                key={child.id}
                file={child}
                accessToken={accessToken}
                depth={depth + 1}
                isReadOnly={isReadOnly}
                onRestore={onRestore}
                onVerify={onVerify}
                onDelete={onDelete}
                searchQuery={searchQuery}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default function GoogleDriveTab({
  projects,
  contractors,
  generalPriceGuide,
  includeItbisInNet,
  activeProjectId,
  onRestoreSystem,
  addAuditEntry,
  isReadOnly,
  isAdmin
}: GoogleDriveTabProps) {
  const resolvedActiveProject = projects.find(p => p.id === activeProjectId) || projects[0];
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState<boolean>(true);
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isLoadingFiles, setIsLoadingFiles] = useState<boolean>(false);
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([]);
  const [appFolderId, setAppFolderId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // Custom folder configuration
  const [googleFolderUrl, setGoogleFolderUrl] = useState<string>(() => {
    return localStorage.getItem("mares_google_folder_url") || "https://drive.google.com/drive/folders/1kOBfuve0_mC8eOlnkmPbaVsa9mEdKko7?usp=drive_link";
  });

  // Extract folder ID from URL or return the raw string if it's already an ID
  const getGoogleFolderId = (): string => {
    if (!googleFolderUrl) return "1kOBfuve0_mC8eOlnkmPbaVsa9mEdKko7";
    const trimmed = googleFolderUrl.trim();
    const foldersMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (foldersMatch && foldersMatch[1]) {
      return foldersMatch[1];
    }
    const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (idParamMatch && idParamMatch[1]) {
      return idParamMatch[1];
    }
    return trimmed;
  };

  useEffect(() => {
    localStorage.setItem("mares_google_folder_url", googleFolderUrl);
  }, [googleFolderUrl]);

  // Backup configurations
  const [backupDescription, setBackupDescription] = useState<string>('');
  const [isBackupInProcess, setIsBackupInProcess] = useState<boolean>(false);
  const [isAutoPdfInProcess, setIsAutoPdfInProcess] = useState<boolean>(false);
  const [autoBackupProgress, setAutoBackupProgress] = useState<string>('');
  const [currentBackupRender, setCurrentBackupRender] = useState<any | null>(null);

  // Restore confirmation modal
  const [restoreConfirmFile, setRestoreConfirmFile] = useState<DriveFile | null>(null);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // Automatic PDF selection state
  const [selectedPdfReportTarget, setSelectedPdfReportTarget] = useState<string>('latest');

  const uniqueReportsLabels = useMemo(() => {
    if (!resolvedActiveProject) return [];
    const names = new Set<string>();
    const sheets = resolvedActiveProject.sheets || [];
    sheets.forEach((s: any) => {
      if (s.reports) {
        s.reports.forEach((r: any) => {
          names.add(r.name);
        });
      }
    });
    // Sort names alphabetically or numerically if we can, but simple Array.from is okay
    return Array.from(names).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
  }, [resolvedActiveProject]);

  // Folder sub-selection states
  const [projectSubfolders, setProjectSubfolders] = useState<any[]>([]);
  const [selectedSubfolderId, setSelectedSubfolderId] = useState<string | null>(null);
  const [currentProjectFolderId, setCurrentProjectFolderId] = useState<string | null>(null);
  const [navStack, setNavStack] = useState<{id: string, name: string}[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Delete confirmation modal
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<DriveFile | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // PDF Conflict Dialog state
  const [pdfConflictDialog, setPdfConflictDialog] = useState<{
    queue: {
      sheet: any;
      report: any;
      contractorName: string;
      netVal: number;
      hasChanged: boolean;
      existingFileId?: string;
      oldNetVal?: number;
      filename: string;
      sortedPRows: any[];
      subtotal: number;
      isr: number;
      tss: number;
      pension: number;
      warranty: number;
      itbis: number;
      discount1: number;
      discount2: number;
      sheetItbisRate: number;
      isItbisInclusive: boolean;
      summaryRow: any;
    }[];
    existingFiles: any[];
    projectFolderId: string;
    projectName: string;
    params: any;
    token: string;
  } | null>(null);

  // Auto initialize Auth
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setNeedsAuth(false);
      },
      () => {
        setUser(null);
        setToken(null);
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, []);

  const clearMessages = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleLogin = async () => {
    try {
      const resultPromise = googleSignIn();
      setIsLoggingIn(true);
      clearMessages();
      const result = await resultPromise;
      if (result) {
        setToken(result.accessToken);
        setUser(result.user);
        setNeedsAuth(false);
        setSuccessMsg("Sesión de Google iniciada exitosamente.");
        addAuditEntry("Conexión Google Drive", `Usuario ${result.user.email} se conectó.`);
      }
    } catch (err: any) {
      console.error('Login failed:', err);
      if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/popup-blocked') {
        setErrorMsg("No se pudo conectar con Google. Revisa tu navegador.");
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    clearMessages();
    try {
      await logout();
      setUser(null);
      setToken(null);
      setNeedsAuth(true);
      setDriveFiles([]);
      setAppFolderId(null);
      setSuccessMsg("Sesión de Google cerrada.");
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  // Helper to ensure a dedicated application folder exists
  const getOrCreateAppFolder = async (accessToken: string): Promise<string> => {
    // Instead of resolving private folders, we use the user-configured (or default shared) Google Drive Folder ID.
    return getGoogleFolderId();
  };

  // Helper to ensure NOMINAS MARES or any target shared folder exists
  const getOrCreateSharedFolder = async (accessToken: string, folderName: string): Promise<string> => {
    // Use the custom/default shared folder ID directly.
    return getGoogleFolderId();
  };

  // Memory cache to avoid duplicate folder creation due to Drive API indexing delay
  const folderCache: Record<string, string> = {};

  // Helper to ensure subfolder of project exists inside custom google folder root
  const getOrCreateProjectFolder = async (accessToken: string, parentId: string, projectName: string): Promise<string> => {
    const safeProjectName = projectName.trim();
    const cacheKey = `${parentId}_${safeProjectName.toLowerCase()}`;
    if (folderCache[cacheKey]) {
      return folderCache[cacheKey];
    }
    
    const q = encodeURIComponent(`'${parentId}' in parents and trashed = false`);
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,createdTime)&orderBy=createdTime%20desc&pageSize=500&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    
    if (!searchRes.ok) {
      throw new Error(`Error al buscar la subcarpeta de la obra en Drive: HTTP ${searchRes.status}`);
    }
    
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      const folders = searchData.files.filter((f: any) => 
        f.mimeType === 'application/vnd.google-apps.folder' &&
        f.name && f.name.trim().toLowerCase() === safeProjectName.toLowerCase()
      );

      if (folders.length > 0) {
        // Enforce exactly one folder, pick the oldest (original) one and delete the newer duplicates
        const originalFolder = folders[folders.length - 1]; // Oldest because orderBy=createdTime desc
        folderCache[cacheKey] = originalFolder.id;
        if (folders.length > 1) {
          for (let i = 0; i < folders.length - 1; i++) {
            try {
              fetch(`https://www.googleapis.com/drive/v3/files/${folders[i].id}?supportsAllDrives=true`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` }
              }).catch(() => {});
            } catch (delErr) {
              console.error("Error deleting duplicate project subfolder:", delErr);
            }
          }
        }
        return originalFolder.id;
      }
    }

    // Create the subfolder under parent folder
    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: projectName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
      })
    });
    
    if (!createRes.ok) {
      throw new Error(`Error al crear la subcarpeta de la obra en Drive: HTTP ${createRes.status}`);
    }
    
    const createData = await createRes.json();
    folderCache[cacheKey] = createData.id;
    return createData.id;
  };

  // Helper to format date into concise Spanish form: e.g. 5jun26
  const formatReportFolderDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parts[0].slice(-2);
      const monthIdx = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
      const month = months[monthIdx] || '';
      return `${day}${month}${year}`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const day = d.getDate();
    const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const month = months[d.getMonth()];
    const year = d.getFullYear().toString().slice(-2);
    return `${day}${month}${year}`;
  };

  const getOrCreateReportFolder = async (accessToken: string, parentId: string, folderName: string): Promise<string> => {
    const safeFolderName = folderName.trim();
    const q = encodeURIComponent(`'${parentId}' in parents and trashed = false`);
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,mimeType,createdTime)&orderBy=createdTime%20desc&pageSize=500&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
    
    if (!searchRes.ok) {
      throw new Error(`Error al buscar la carpeta de reporte en Drive: HTTP ${searchRes.status}`);
    }
    
    const searchData = await searchRes.json();
    if (searchData.files && searchData.files.length > 0) {
      const folders = searchData.files.filter((f: any) => 
        f.mimeType === 'application/vnd.google-apps.folder' &&
        f.name && f.name.trim().toLowerCase() === safeFolderName.toLowerCase()
      );

      if (folders.length > 0) {
        // Enforce exactly one folder, pick the oldest (original) one and delete the newer duplicates
        const originalFolder = folders[folders.length - 1]; // Oldest because orderBy=createdTime desc
        if (folders.length > 1) {
          for (let i = 0; i < folders.length - 1; i++) {
            try {
              fetch(`https://www.googleapis.com/drive/v3/files/${folders[i].id}?supportsAllDrives=true`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` }
              }).catch(() => {});
            } catch (delErr) {
              console.error("Error al eliminar carpeta de reporte duplicada:", delErr);
            }
          }
        }
        return originalFolder.id;
      }
    }

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId]
      })
    });
    
    if (!createRes.ok) {
      throw new Error(`Error al crear la carpeta de reporte en Drive: HTTP ${createRes.status}`);
    }
    
    const createData = await createRes.json();
    return createData.id;
  };

  const dataURItoBlob = (dataURI: string): Blob => {
    const base64Index = dataURI.indexOf('base64,') + 'base64,'.length;
    const base64 = dataURI.substring(base64Index);
    const raw = window.atob(base64);
    const rawLength = raw.length;
    const array = new Uint8Array(new ArrayBuffer(rawLength));
    for(let i = 0; i < rawLength; i++) {
      array[i] = raw.charCodeAt(i);
    }
    let mimeStr = "application/octet-stream";
    const mimeMatch = dataURI.match(/^data:(.*?);/);
    if (mimeMatch && mimeMatch[1]) {
      mimeStr = mimeMatch[1];
    }
    return new Blob([array], {type: mimeStr});
  };

  const syncFileToDrive = async (
    accessToken: string,
    parentId: string,
    filename: string,
    mimeType: string,
    blob: Blob,
    description: string
  ) => {
    const q = encodeURIComponent(`'${parentId}' in parents and trashed = false and name = '${filename}'`);
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&pageSize=100&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
  
    if (searchRes.ok) {
      const searchData = await searchRes.json();
      for (const oldFile of (searchData.files || [])) {
        await fetch(`https://www.googleapis.com/drive/v3/files/${oldFile.id}?supportsAllDrives=true`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` }
        }).catch(() => {});
      }
    }
  
    const metadata = {
      name: filename,
      mimeType: mimeType,
      description: description,
      parents: [parentId]
    };
  
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);
  
    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
      body: form
    });
  
    if (!res.ok) {
      throw new Error(`Upload failed with status ${res.status}`);
    }
    return await res.json();
  };

  // Run automated PDF backups for last report of all active sheets
  const handleAutoPdfBackup = async () => {
    if (!token) {
      setErrorMsg("Por favor, inicia sesión con Google primero para realizar el respaldo automático.");
      return;
    }
    setIsAutoPdfInProcess(true);
    clearMessages();
    setAutoBackupProgress("Analizando datos y conectando con Google Drive...");

    try {
      const activeProject = resolvedActiveProject;
      if (!activeProject) {
        setErrorMsg("La obra activa seleccionada no se encuentra disponible.");
        setIsAutoPdfInProcess(false);
        return;
      }

      const params = activeProject.params || {
        percentIsr: 2,
        percentTss: 2,
        percentPension: 2.87,
        percentWarranty: 5,
        percentItbis: 18,
        isItbisInclusive: false,
        companyName: "Constructora Alba & Sánchez S.R.L.",
        projectName: activeProject.name || "Obra General",
        address: "Santo Domingo, R.D.",
        responsible: "Ingeniero de Obra",
        currency: "DOP"
      };

      const sheets = activeProject.sheets || [];
      const sheetsWithReports = sheets.filter((s: any) => s.reports && s.reports.length > 0);

      if (sheetsWithReports.length === 0) {
        setErrorMsg("La obra activa seleccionada no contiene cortes o reportes cargados para respaldar.");
        setIsAutoPdfInProcess(false);
        return;
      }

      // Prepare queue of reports to back up.
      const initialQueue: any[] = [];
      const openReportsWarnings: string[] = [];
      
      sheetsWithReports.forEach((sheet: any) => {
        const sortedReps = [...sheet.reports].sort((a: any, b: any) => {
          return new Date(a.dateTo || 0).getTime() - new Date(b.dateTo || 0).getTime();
        });
        
        let targetRep;
        if (selectedPdfReportTarget === 'latest') {
          targetRep = sortedReps[sortedReps.length - 1]; // Fallback to last report
        } else {
          targetRep = sortedReps.find(r => r.name === selectedPdfReportTarget);
        }

        if (targetRep) {
          if (targetRep.status !== "CERRADO") {
            openReportsWarnings.push(`🔹 ${sheet.name} — ${targetRep.name}`);
          }
          initialQueue.push({ sheet, report: targetRep });
        }
      });

      if (openReportsWarnings.length > 0) {
        setErrorMsg(`Operación denegada. El respaldo no procede porque los siguientes reportes no están CERRADOS:\n${openReportsWarnings.join('\n')}\nPor favor, cierre las Hojas de Producción faltantes en la "Tabla de Producciones" para permitir la exportación a Google Drive.`);
        setIsAutoPdfInProcess(false);
        return;
      }

      if (initialQueue.length === 0) {
        setErrorMsg("Ninguno de los contratistas tiene este reporte creado.");
        setIsAutoPdfInProcess(false);
        return;
      }

      // Get or create parent folder
      const sharedFolderId = await getOrCreateSharedFolder(token, "NOMINAS MARES");

      // Get or create subfolder with the name of the Project/Obra
      const projectName = (params.projectName || activeProject.name || "Obra General").trim();
      const projectFolderId = await getOrCreateProjectFolder(token, sharedFolderId, projectName);

      // Cache report-specific folders to avoid duplicate lookups
      const reportFoldersCache: { [key: string]: { id: string; files: any[] } } = {};

      // Populate rich queue elements representing precomputed reports
      const finalQueue: any[] = [];
      let hasConflict = false;

      for (let i = 0; i < initialQueue.length; i++) {
        const { sheet, report } = initialQueue[i];

        const dateFromFormatted = formatReportFolderDate(report.dateFrom);
        const dateToFormatted = formatReportFolderDate(report.dateTo);
        const reportFolderName = `${report.name} (${dateFromFormatted}@${dateToFormatted})`;

        if (!reportFoldersCache[reportFolderName]) {
          setAutoBackupProgress(`Buscando o creando carpeta de reporte: ${reportFolderName}...`);
          const repFolderId = await getOrCreateReportFolder(token, projectFolderId, reportFolderName);
          
          const searchSubRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${repFolderId}' in parents and trashed = false`)}&fields=files(id,name,description)&pageSize=100&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          let subsFiles: any[] = [];
          if (searchSubRes.ok) {
            const searchData = await searchSubRes.json();
            subsFiles = searchData.files || [];
          }
          reportFoldersCache[reportFolderName] = { id: repFolderId, files: subsFiles };
        }

        const currentRepFolder = reportFoldersCache[reportFolderName];
        const reportFolderId = currentRepFolder.id;
        const subfolderFiles = currentRepFolder.files;

        const cont = contractors.find((c) => c.id === sheet.contractorId);
        const contractorName = cont ? cont.name : sheet.name;
        const contractorDoc = cont ? cont.document : "S/D";
        const contractorType = cont ? cont.type : "Ingeniero de Obra";
        const contractorPhone = cont ? cont.phone : "S/D";

        const isClosed = report.status === "CERRADO";
        const effPercentIsr = isClosed && report.savedPercentIsr !== undefined ? report.savedPercentIsr : params.percentIsr;
        const effPercentTss = isClosed && report.savedPercentTss !== undefined ? report.savedPercentTss : params.percentTss;
        const effPercentPension = isClosed && report.savedPercentPension !== undefined ? report.savedPercentPension : params.percentPension;
        const effPercentWarranty = isClosed && report.savedPercentWarranty !== undefined ? report.savedPercentWarranty : params.percentWarranty;
        const effPercentItbis = isClosed && report.savedPercentItbis !== undefined ? report.savedPercentItbis : params.percentItbis;
        const effIsItbisInclusive = isClosed && report.savedIsItbisInclusive !== undefined ? report.savedIsItbisInclusive : params.isItbisInclusive;

        const applyIsr = isClosed && report.savedApplyIsr !== undefined ? report.savedApplyIsr : sheet.applyIsr !== false;
        const applyTss = isClosed && report.savedApplyTss !== undefined ? report.savedApplyTss : sheet.applyTss !== false;
        const applyPension = isClosed && report.savedApplyPension !== undefined ? report.savedApplyPension : sheet.applyPension !== false;
        const applyWarranty = isClosed && report.savedApplyWarranty !== undefined ? report.savedApplyWarranty : sheet.applyWarranty !== false;
        const applyItbis = isClosed && report.savedApplyItbis !== undefined ? report.savedApplyItbis : sheet.applyItbis === true;

        const sheetItbisRate = isClosed && report.savedItbisRate !== undefined
          ? report.savedItbisRate
          : (typeof sheet.itbisRate === "number" ? sheet.itbisRate : effPercentItbis);

        const isItbisInclusive = effIsItbisInclusive === true;

        let subtotalActual = 0;
        const pRows: any[] = [];

        sheet.rows.forEach((row: any) => {
          const isEx = report.isExtraordinary === true || 
                       (report.parentReportId && report.parentReportId.trim() !== "") || 
                       (/\b\d+\.\d+\b/.test(report.name));
          const isRowExLocked = isEx &&
            row.createdReportId &&
            row.createdReportId !== report.id &&
            row.createdReportId !== report.parentReportId;

          const qty = isRowExLocked ? 0 : (report.quantities[row.id] ?? 0);

          if (qty > 0) {
            subtotalActual += qty * row.priceUnit;
            pRows.push({
              ...row,
              qty,
              grossValue: qty * row.priceUnit
            });
          }
        });

        const sortedPRows = [...pRows].sort((a,b) => {
          return (a.subchapter || "").localeCompare(b.subchapter || "");
        });

        const baseSubtotal = applyItbis && isItbisInclusive
          ? subtotalActual / (1 + sheetItbisRate / 100)
          : subtotalActual;

        const isrVal = applyIsr ? baseSubtotal * (effPercentIsr / 100) : 0;
        const tssVal = applyTss ? baseSubtotal * (effPercentTss / 100) : 0;
        const pensionVal = applyPension ? baseSubtotal * (effPercentPension / 100) : 0;
        const warrantyVal = applyWarranty ? baseSubtotal * (effPercentWarranty / 100) : 0;

        const itbisVal = applyItbis
          ? isItbisInclusive
            ? subtotalActual - baseSubtotal
            : subtotalActual * (sheetItbisRate / 100)
          : 0;

        const discount1 = report.discount1 || 0;
        const discount2 = report.discount2 || 0;

        let netVal = 0;
        if (isItbisInclusive) {
          netVal = includeItbisInNet
            ? subtotalActual - (isrVal + tssVal + pensionVal + warrantyVal + discount1 + discount2)
            : baseSubtotal - (isrVal + tssVal + pensionVal + warrantyVal + discount1 + discount2);
        } else {
          netVal = includeItbisInNet
            ? subtotalActual + itbisVal - (isrVal + tssVal + pensionVal + warrantyVal + discount1 + discount2)
            : subtotalActual - (isrVal + tssVal + pensionVal + warrantyVal + discount1 + discount2);
        }

        const summaryRow = {
          contractorName,
          contractorDoc,
          activity: sheet.activity || "Obra Civil",
          code: sheet.code,
          grossValue: isItbisInclusive ? baseSubtotal : subtotalActual,
          isr: isrVal,
          tss: tssVal,
          pension: pensionVal,
          warranty: warrantyVal,
          discounts: discount1 + discount2,
          itbis: itbisVal,
          netPayable: netVal,
          reportName: report.name
        };

        const safeSheetName = sheet.name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ -]/g, '').trim().replace(/\s+/g, '_');
        const safeReportName = report.name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ -]/g, '').trim().replace(/\s+/g, '_');
        const timestampDate = new Date().toISOString().split('T')[0];
        const filename = `Comprobante_${safeSheetName}_${safeReportName}_${timestampDate}.pdf`;

        // Check if a file matches name-wise in the subfolder
        const matched = subfolderFiles.find((f: any) => 
          f.name.startsWith(`Comprobante_${safeSheetName}_${safeReportName}_`) ||
          f.name.includes(`_${safeSheetName}_${safeReportName}_`)
        );

        let oldNetVal: number | undefined = undefined;
        let hasChanged = true;
        if (matched) {
          hasConflict = true;
          if (matched.description) {
            const netMatch = matched.description.match(/\[Neto:\s*DOP\s*([\d.-]+)\]/);
            if (netMatch && netMatch[1]) {
              oldNetVal = parseFloat(netMatch[1]);
              hasChanged = Math.abs(oldNetVal - netVal) >= 0.01;
            }
          }
        }

        finalQueue.push({
          sheet,
          report,
          contractorName,
          netVal,
          hasChanged,
          existingFileId: matched?.id,
          oldNetVal,
          filename,
          sortedPRows,
          subtotal: isItbisInclusive ? baseSubtotal : subtotalActual,
          isr: isrVal,
          tss: tssVal,
          pension: pensionVal,
          warranty: warrantyVal,
          itbis: itbisVal,
          discount1,
          discount2,
          sheetItbisRate,
          isItbisInclusive,
          summaryRow,
          reportFolderId,
          reportFolderName
        });
      }

      // Collect all existing files from the cached report subfolders for conflict comparisons
      let existingFiles: any[] = [];
      Object.keys(reportFoldersCache).forEach(key => {
        existingFiles = existingFiles.concat(reportFoldersCache[key].files);
      });

      setAutoBackupProgress('');
      setIsAutoPdfInProcess(false);

      // ESTRICTO: Automáticamente borrar y sustituir sin preguntar
      await executeCompiledBackup('replace_all', {
        queue: finalQueue,
        existingFiles,
        projectFolderId,
        projectName,
        params,
        token
      });
    } catch (err: any) {
      console.error('Error in precheck:', err);
      setErrorMsg(`Error al iniciar respaldo automático: ${err.message || err}`);
      setIsAutoPdfInProcess(false);
      setAutoBackupProgress('');
    }
  };

  const executeCompiledBackup = async (
    mode: 'replace_all' | 'replace_modified' | 'keep_both',
    dialogContext: {
      queue: any[];
      existingFiles: any[];
      projectFolderId: string;
      projectName: string;
      params: any;
      token: string;
    }
  ) => {
    setPdfConflictDialog(null);
    setIsAutoPdfInProcess(true);
    clearMessages();
    
    try {
      const { queue, existingFiles, projectFolderId, projectName, params, token } = dialogContext;
      
      let itemsToProcess = [...queue];
      if (mode === 'replace_modified') {
        itemsToProcess = queue.filter(item => item.hasChanged);
      }

      if (itemsToProcess.length === 0) {
        setSuccessMsg("Sincronización finalizada: No se detectaron cambios en los reportes correspondientes. Todos los comprobantes en Google Drive ya se encontraban actualizados.");
        setIsAutoPdfInProcess(false);
        return;
      }

      const reportFolderId = queue[0]?.reportFolderId || projectFolderId;

      if (mode === 'replace_all') {
        const deletedIds: string[] = [];
        setAutoBackupProgress("Eliminando todos los archivos anteriores del reporte en Google Drive...");
        try {
          const listRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${reportFolderId}' in parents and trashed = false`)}&fields=files(id,name)&pageSize=100&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          if (listRes.ok) {
            const listData = await listRes.json();
            const filesToDelete = listData.files || [];
            for (const f of filesToDelete) {
              setAutoBackupProgress(`Eliminando archivo redundante anterior: ${f.name}...`);
              try {
                await fetch(`https://www.googleapis.com/drive/v3/files/${f.id}?supportsAllDrives=true`, {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` }
                });
                deletedIds.push(f.id);
              } catch (delErr) {
                console.error("Error deleting file:", delErr);
              }
            }
          }
        } catch (listErr) {
          console.error("Error listing files for replace_all deletion:", listErr);
        }
        if (deletedIds.length > 0) {
          addAuditEntry("Reemplazar Todo - Limpieza", `Eliminados ${deletedIds.length} archivos antiguos previos del reporte.`);
        }
      } else if (mode === 'replace_modified') {
        const deletedIds: string[] = [];
        for (let i = 0; i < itemsToProcess.length; i++) {
          const item = itemsToProcess[i];
          if (item.existingFileId) {
            setAutoBackupProgress(`Eliminando archivo antiguo de Drive: ${item.filename}...`);
            try {
              const delRes = await fetch(`https://www.googleapis.com/drive/v3/files/${item.existingFileId}?supportsAllDrives=true`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });
              if (delRes.ok) {
                deletedIds.push(item.existingFileId);
              }
            } catch (delErr) {
              console.error("Error deleting pre-existing PDF:", delErr);
            }
          }
        }
        if (deletedIds.length > 0) {
          addAuditEntry("Eliminar preliminar PDF", `Eliminados ${deletedIds.length} comprobantes antiguos de contratistas modificados.`);
        }
      }

      let successCount = 0;
      const finalSummaryRows: any[] = [];

      queue.forEach(item => {
        finalSummaryRows.push(item.summaryRow);
      });

      for (let i = 0; i < itemsToProcess.length; i++) {
        const item = itemsToProcess[i];
        
        setAutoBackupProgress(`Procesando comprobante (${i+1}/${itemsToProcess.length}): ${item.sheet.name} (${item.report.name})...`);

        // Trigger dynamic state update to render PDF view Off-Screen
        setCurrentBackupRender({
          sheet: item.sheet,
          report: item.report,
          contractorName: item.contractorName,
          contractorDoc: item.summaryRow.contractorDoc,
          contractorType: item.sheet.contractorType || "Contratista",
          contractorPhone: item.sheet.contractorPhone || "S/D",
          params,
          printableVoucherRows: item.sortedPRows,
          subtotal: item.subtotal,
          isr: item.isr,
          tss: item.tss,
          pension: item.pension,
          warranty: item.warranty,
          itbis: item.itbis,
          discount1: item.discount1,
          discount1Label: item.report.discount1Label || "Descuento 1",
          discount2: item.discount2,
          discount2Label: item.report.discount2Label || "Descuento 2",
          netPayable: item.netVal,
          itbisRate: item.sheetItbisRate,
          isItbisInclusive: item.isItbisInclusive
        });

        // Delay tick so react updates DOM
        await new Promise(r => setTimeout(r, 750));

        const companyEl = document.getElementById("auto-backup-pdf-render-root-company");
        const contractorEl = document.getElementById("auto-backup-pdf-render-root-contractor");

        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const padding = 10;
        const pageMaxHeight = pdfHeight - (padding * 2);

        const appendElementToPDF = async (el: HTMLElement, isFirstPage: boolean) => {
          const docTypeLabel = el.id === "auto-backup-pdf-render-root-company" 
            ? "Copia Empresa (Interna)" 
            : el.id === "auto-backup-pdf-render-root-support" 
              ? "Soporte de Mediciones Obra" 
              : "Copia Contratista";
          setAutoBackupProgress(`Renderizando ${docTypeLabel} para ${item.sheet.name}...`);

          let canvas;
          try {
            canvas = await html2canvas(el, {
              scale: 1.5,
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff',
              windowWidth: 852,
              windowHeight: el.scrollHeight
            });
          } catch (corsErr) {
            console.warn("CORS html2canvas failed in automatic backup, retrying without CORS:", corsErr);
            canvas = await html2canvas(el, {
              scale: 1.5,
              useCORS: false,
              logging: false,
              backgroundColor: '#ffffff',
              windowWidth: 852,
              windowHeight: el.scrollHeight
            });
          }

          const imgData = canvas.toDataURL('image/jpeg', 0.75);
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;
          const ratio = canvasWidth / canvasHeight;

          let imgWidth = pdfWidth - (padding * 2);
          let imgHeight = imgWidth / ratio;

          let yPos = padding;

          if (!isFirstPage) {
            pdf.addPage();
          }

          if (imgHeight <= pageMaxHeight) {
            pdf.addImage(imgData, 'JPEG', padding, yPos, imgWidth, imgHeight, undefined, 'FAST');
          } else {
            let currImgHeight = imgHeight;
            pdf.addImage(imgData, 'JPEG', padding, yPos, imgWidth, imgHeight, undefined, 'FAST');
            currImgHeight -= pageMaxHeight;

            while (currImgHeight > 0) {
              yPos = yPos - pageMaxHeight;
              pdf.addPage();
              pdf.addImage(imgData, 'JPEG', padding, yPos, imgWidth, imgHeight, undefined, 'FAST');
              currImgHeight -= pageMaxHeight;
            }
          }
        };

        const supportEl = document.getElementById("auto-backup-pdf-render-root-support");

        if (companyEl && contractorEl) {
          // Add first page (Company)
          await appendElementToPDF(companyEl, true);
          // Add second page (Contractor)
          await appendElementToPDF(contractorEl, false);
          // Add third page (Support / Measurements) if it exists
          if (supportEl) {
            await appendElementToPDF(supportEl, false);
          }
        } else {
          // Fallback if elements not available individually
          const renderEl = document.getElementById("auto-backup-pdf-render-root");
          if (!renderEl) {
            console.error("No se pudo hallar el elemento auto-backup-pdf-render-root");
            continue;
          }
          await appendElementToPDF(renderEl, true);
          if (supportEl) {
            await appendElementToPDF(supportEl, false);
          }
        }

        const pdfBlob = pdf.output('blob');
        const timestampDate = new Date().toISOString().split('T')[0];
        const safeSheetName = item.sheet.name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ -]/g, '').trim().replace(/\s+/g, '_');
        const safeReportName = item.report.name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ -]/g, '').trim().replace(/\s+/g, '_');
        const filename = `Comprobante_${safeSheetName}_${safeReportName}_${timestampDate}.pdf`;

        const targetFolderId = item.reportFolderId || projectFolderId;

        // Ensure duplicates are eliminated in the report folder
        try {
          const subfolderSearchRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${targetFolderId}' in parents and trashed = false`)}&fields=files(id,name)&pageSize=100&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true`,
            {
              headers: { Authorization: `Bearer ${token}` }
            }
          );
          if (subfolderSearchRes.ok) {
            const subfolderSearchData = await subfolderSearchRes.json();
            const subFiles = subfolderSearchData.files || [];
            const duplicates = subFiles.filter((f: any) => 
              f.name.startsWith(`Comprobante_${safeSheetName}_${safeReportName}_`) ||
              f.name.includes(`_${safeSheetName}_${safeReportName}_`)
            );
            for (const dup of duplicates) {
              setAutoBackupProgress(`Eliminando comprobante duplicado anterior: ${dup.name}...`);
              await fetch(`https://www.googleapis.com/drive/v3/files/${dup.id}?supportsAllDrives=true`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });
            }
          }
        } catch (dupErr) {
          console.error("Error pre-deleting duplicate vouchers:", dupErr);
        }

        // Include metadata [Neto: DOP XXX] inside Google Drive description for modifications comparison later on
        const metadata = {
          name: filename,
          mimeType: 'application/pdf',
          description: `[Neto: DOP ${item.netVal.toFixed(2)}] Comprobante de pago automático de la nómina: ${item.sheet.name}, correspondiente al corte ${item.report.name}, generado para el proyecto ${projectName}.`,
          parents: [targetFolderId]
        };

        const form = new FormData();
        form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
        form.append('file', pdfBlob);

        setAutoBackupProgress(`Subiendo comprobante (${i+1}/${itemsToProcess.length}): ${filename}...`);

        const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: form
        });

        if (!uploadRes.ok) {
          throw new Error(`Upload of ${filename} failed with status ${uploadRes.status}`);
        }

        successCount++;
        addAuditEntry("Respaldo Automático PDF", `Subido PDF "${filename}" a la carpeta de reporte: "${item.reportFolderName || projectName}".`);
      }

      // Generate and upload the Consolidated General Summary of all contractor totals
      if (finalSummaryRows.length > 0) {
        setAutoBackupProgress("Calculando y preparando el Resumen Consolidado de Nómina...");
        
        const timestampDate = new Date().toISOString().split('T')[0];
        
        const summaryRender = {
          isSummary: true,
          projectName,
          params,
          summaryRows: finalSummaryRows,
          totals: {
            grossValue: finalSummaryRows.reduce((acc, r) => acc + r.grossValue, 0),
            isr: finalSummaryRows.reduce((acc, r) => acc + r.isr, 0),
            tss: finalSummaryRows.reduce((acc, r) => acc + r.tss, 0),
            pension: finalSummaryRows.reduce((acc, r) => acc + r.pension, 0),
            warranty: finalSummaryRows.reduce((acc, r) => acc + r.warranty, 0),
            discounts: finalSummaryRows.reduce((acc, r) => acc + r.discounts, 0),
            itbis: finalSummaryRows.reduce((acc, r) => acc + r.itbis, 0),
            netPayable: finalSummaryRows.reduce((acc, r) => acc + r.netPayable, 0),
          },
          reportNames: Array.from(new Set(queue.map(q => q.report.name))).join(', '),
          dateFrom: queue.reduce((min, q) => !min || new Date(q.report.dateFrom).getTime() < new Date(min).getTime() ? q.report.dateFrom : min, ''),
          dateTo: queue.reduce((max, q) => !max || new Date(q.report.dateTo).getTime() > new Date(max).getTime() ? q.report.dateTo : max, ''),
        };

        const safeProjectName = projectName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ -]/g, '').trim().replace(/\s+/g, '_');
        const summaryFilename = `Resumen_Consolidado_Nomina_${safeProjectName}_${timestampDate}.pdf`;

        // If replace mode, find and delete the old Consolidated PDF from existing files if it existed
        if (mode === 'replace_all' || mode === 'replace_modified') {
          const oldSummary = existingFiles.find((f: any) => 
            f.name.startsWith(`Resumen_Consolidado_Nomina_${safeProjectName}_`) ||
            f.name.includes(`_Nomina_${safeProjectName}_`)
          );
          if (oldSummary) {
            setAutoBackupProgress("Eliminando Resumen Consolidado antiguo de Drive...");
            try {
              await fetch(`https://www.googleapis.com/drive/v3/files/${oldSummary.id}?supportsAllDrives=true`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });
              addAuditEntry("Eliminar preliminar Resumen", `Eliminado resumen consolidado antiguo id: ${oldSummary.id}`);
            } catch (delErr) {
              console.error("Error deleting old summary PDF:", delErr);
            }
          }
        }

        setCurrentBackupRender(summaryRender);

        // Delay tick so React updates DOM and renders the multi-contractor summary table
        await new Promise(r => setTimeout(r, 750));

        const renderEl = document.getElementById("auto-backup-pdf-render-root");
        if (renderEl) {
          setAutoBackupProgress("Renderizando PDF del Resumen General de Liquidación...");

          let canvas;
          try {
            canvas = await html2canvas(renderEl, {
              scale: 1.5,
              useCORS: true,
              logging: false,
              backgroundColor: '#ffffff',
              windowWidth: 1120, // wider width for landscape-style summary table!
              windowHeight: renderEl.scrollHeight
            });
          } catch (corsErr) {
            console.warn("CORS html2canvas failed on summary render, retrying without CORS:", corsErr);
            canvas = await html2canvas(renderEl, {
              scale: 1.5,
              useCORS: false,
              logging: false,
              backgroundColor: '#ffffff',
              windowWidth: 1120,
              windowHeight: renderEl.scrollHeight
            });
          }

          const imgData = canvas.toDataURL('image/jpeg', 0.75);
          const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const canvasWidth = canvas.width;
          const canvasHeight = canvas.height;

          const ratio = canvasWidth / canvasHeight;
          const padding = 10;

          let imgWidth = pdfWidth - (padding * 2);
          let imgHeight = imgWidth / ratio;

          let yPos = padding;
          const pageMaxHeight = pdfHeight - (padding * 2);

          if (imgHeight <= pageMaxHeight) {
            pdf.addImage(imgData, 'JPEG', padding, yPos, imgWidth, imgHeight, undefined, 'FAST');
          } else {
            let currImgHeight = imgHeight;
            pdf.addImage(imgData, 'JPEG', padding, yPos, imgWidth, imgHeight, undefined, 'FAST');
            currImgHeight -= pageMaxHeight;

            while (currImgHeight > 0) {
              yPos = yPos - pageMaxHeight;
              pdf.addPage();
              pdf.addImage(imgData, 'JPEG', padding, yPos, imgWidth, imgHeight, undefined, 'FAST');
              currImgHeight -= pageMaxHeight;
            }
          }

          const pdfBlob = pdf.output('blob');

          const summaryFolderId = queue[0]?.reportFolderId || projectFolderId;

          // Ensure duplicates of the summary report are eliminated in the report folder
          try {
            const summarySearchRes = await fetch(
              `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${summaryFolderId}' in parents and trashed = false`)}&fields=files(id,name)&pageSize=100&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true`,
              {
                headers: { Authorization: `Bearer ${token}` }
              }
            );
            if (summarySearchRes.ok) {
              const summarySearchData = await summarySearchRes.json();
              const subFiles = summarySearchData.files || [];
              const duplicates = subFiles.filter((f: any) => 
                f.name.startsWith(`Resumen_Consolidado_Nomina_${safeProjectName}_`) ||
                f.name.includes(`_Nomina_${safeProjectName}_`)
              );
              for (const dup of duplicates) {
                setAutoBackupProgress(`Eliminando resumen duplicado anterior: ${dup.name}...`);
                await fetch(`https://www.googleapis.com/drive/v3/files/${dup.id}?supportsAllDrives=true`, {
                  method: 'DELETE',
                  headers: { Authorization: `Bearer ${token}` }
                });
              }
            }
          } catch (dupSummaryErr) {
            console.error("Error pre-deleting duplicate summaries:", dupSummaryErr);
          }

          const metadata = {
            name: summaryFilename,
            mimeType: 'application/pdf',
            description: `Resumen de nómina consolidado para la obra ${projectName}, detallando retenciones, subtotal, ITBIS y neto de todos los contratistas activos.`,
            parents: [summaryFolderId]
          };

          const form = new FormData();
          form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
          form.append('file', pdfBlob);

          setAutoBackupProgress(`Subiendo Resumen Consolidado: ${summaryFilename}...`);

          const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: form
          });

          if (!uploadRes.ok) {
            throw new Error(`Upload of summary ${summaryFilename} failed with status ${uploadRes.status}`);
          }

          successCount++;
          addAuditEntry("Respaldo Consolidado PDF", `Subido PDF de Resumen de Nómina "${summaryFilename}" a la carpeta de Google Drive: "${projectName}".`);
        }
      }

      // -----------------------------------------------------------------
      // AUTOMATIC EXCEL BACKUP FOR THIS REPORT (ALWAYS RUNS & REPLACES PREVIOUS)
      // -----------------------------------------------------------------
      try {
        const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
        const params = activeProject ? activeProject.params : { projectName: 'Proyecto' };
        const projectNameStr = (params.projectName || activeProject.name || "Obra General").trim();
        const safeProjectName = projectNameStr.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ -]/g, '').trim().replace(/\s+/g, '_');
        const reportName = queue[0]?.report?.name?.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ -]/g, '').trim().replace(/\s+/g, '_') || "Reporte";
        const excelFilename = `Consolidado_Excel_${safeProjectName}_${reportName}.xlsx`;

        const excelBlob = exportSystemToExcelBlob(
          activeProject.params,
          contractors,
          activeProject.sheets,
          includeItbisInNet
        );

        setAutoBackupProgress("Guardando respaldo consolidado en Excel...");

        // Ensure we remove any pre-existing Excel or .xlsx backup in the report folder
        try {
          const excelSearchRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${reportFolderId}' in parents and trashed = false and (mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or name contains '.xlsx')`)}&fields=files(id,name)&pageSize=100&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (excelSearchRes.ok) {
            const excelSearchData = await excelSearchRes.json();
            const subsFiles = excelSearchData.files || [];
            for (const dup of subsFiles) {
              setAutoBackupProgress(`Eliminando Excel anterior: ${dup.name}...`);
              await fetch(`https://www.googleapis.com/drive/v3/files/${dup.id}?supportsAllDrives=true`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });
            }
          }
        } catch (excelDelErr) {
          console.error("Error pre-deleting duplicate Excels:", excelDelErr);
        }

        const excelMetadata = {
          name: excelFilename,
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          description: `Consolidado de todas las nóminas para Excel correspondiente al corte del reporte ${reportName} de la obra ${projectNameStr}.`,
          parents: [reportFolderId]
        };

        const excelForm = new FormData();
        excelForm.append('metadata', new Blob([JSON.stringify(excelMetadata)], { type: 'application/json' }));
        excelForm.append('file', excelBlob);

        setAutoBackupProgress(`Subiendo Excel consolidado: ${excelFilename}...`);
        const excelUploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: excelForm
        });

        if (excelUploadRes.ok) {
          addAuditEntry("Respaldo Automático Excel", `Subido excel "${excelFilename}" a la carpeta de reporte.`);
        }
      } catch (excelErr) {
        console.error("Error running automatic Excel backup:", excelErr);
      }

      // -----------------------------------------------------------------
      // AUTOMATIC JSON SYSTEM BACKUP FOR THIS REPORT (ALWAYS RUNS & REPLACES PREVIOUS)
      // -----------------------------------------------------------------
      try {
        const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
        const params = activeProject ? activeProject.params : { projectName: 'Proyecto' };
        const projectNameStr = (params.projectName || activeProject.name || "Obra General").trim();
        const safeProjectName = projectNameStr.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ -]/g, '').trim().replace(/\s+/g, '_');
        const reportName = queue[0]?.report?.name?.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ -]/g, '').trim().replace(/\s+/g, '_') || "Reporte";
        const jsonFilename = `BaseDatos_Mares_${safeProjectName}_${reportName}.json`;

        const backupWrapper = {
          appIdentifier: "MaresNominas",
          version: "3.2",
          backupDate: new Date().toISOString(),
          description: `Respaldo automático del sistema Mares para el reporte ${reportName} de la obra ${projectNameStr}`,
          payload: {
            projects,
            contractors,
            generalPriceGuide,
            includeItbisInNet
          }
        };

        const jsonBlob = new Blob([JSON.stringify(backupWrapper, null, 2)], { type: 'application/json' });

        setAutoBackupProgress("Guardando respaldo de base de datos JSON...");

        // Ensure we remove any pre-existing JSON or .json backup in the report folder
        try {
          const jsonSearchRes = await fetch(
            `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${reportFolderId}' in parents and trashed = false and (mimeType = 'application/json' or name contains '.json')`)}&fields=files(id,name)&pageSize=100&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          if (jsonSearchRes.ok) {
            const jsonSearchData = await jsonSearchRes.json();
            const subsFiles = jsonSearchData.files || [];
            for (const dup of subsFiles) {
              setAutoBackupProgress(`Eliminando base de datos JSON anterior: ${dup.name}...`);
              await fetch(`https://www.googleapis.com/drive/v3/files/${dup.id}?supportsAllDrives=true`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
              });
            }
          }
        } catch (jsonDelErr) {
          console.error("Error pre-deleting duplicate JSONs:", jsonDelErr);
        }

        const jsonMetadata = {
          name: jsonFilename,
          mimeType: 'application/json',
          description: `Archivo de restauración total de base de datos de Mares Nominas correspondiente al reporte: ${reportName}.`,
          parents: [reportFolderId]
        };

        const jsonForm = new FormData();
        jsonForm.append('metadata', new Blob([JSON.stringify(jsonMetadata)], { type: 'application/json' }));
        jsonForm.append('file', jsonBlob);

        setAutoBackupProgress(`Subiendo base de datos JSON: ${jsonFilename}...`);
        const jsonUploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: jsonForm
        });

        if (jsonUploadRes.ok) {
          addAuditEntry("Respaldo Automático JSON", `Subido JSON de base de datos "${jsonFilename}" a la carpeta de reporte.`);
        }
      } catch (jsonErr) {
        console.error("Error running automatic JSON backup:", jsonErr);
      }

      // -----------------------------------------------------------------
      // AUTOMATIC CONTRACTORS DIRECTORY BACKUP
      // -----------------------------------------------------------------
      try {
        const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
        const projectNameStr = (params.projectName || activeProject.name || "Obra General").trim();
        
        setAutoBackupProgress("Preparando respaldo de Contratistas...");
        // Use the globally resolved projectFolderId from the start of the function for consistency
        const contratistasFolderId = await getOrCreateProjectFolder(token, projectFolderId, "Contratistas");
        
        for (const contractor of contractors) {
          const relevantAgreements = (contractor.agreements || []).filter(
            (ag: any) => ag.projectName === projectNameStr || ag.projectName === "General" || !ag.projectName
          );
          
          const contractorNameClean = contractor.name.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ -]/g, '').trim().replace(/\s+/g, '_');
          setAutoBackupProgress(`Respaldando contratista: ${contractor.name}...`);
          const contractorFolderId = await getOrCreateProjectFolder(token, contratistasFolderId, contractorNameClean);
          
          const profile = {
            id: contractor.id,
            name: contractor.name,
            document: contractor.document,
            phone: contractor.phone,
            email: contractor.email,
            address: contractor.address,
            type: contractor.type,
            bank: contractor.bank,
            account: contractor.account,
            observations: contractor.observations || "",
            status: contractor.status || "Activo"
          };
          const profileBlob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
          
          await syncFileToDrive(
            token, 
            contractorFolderId, 
            "info_contratista.json", 
            "application/json", 
            profileBlob, 
            `Perfil del contratista ${contractor.name}`
          );
          
          if (relevantAgreements.length === 0) {
              const noAgreementsBlob = new Blob(["Este contratista no tiene acuerdos particulares registrados para este proyecto. Aplica la Guía Base de la Empresa General."], { type: 'text/plain' });
              await syncFileToDrive(
                token,
                contractorFolderId,
                "sin_acuerdos_especificos.txt",
                "text/plain",
                noAgreementsBlob,
                "Aviso de acuerdos"
              );
            } else {
              for (const ag of relevantAgreements) {
                const prefix = ag.id ? ag.id.replace(/[^a-zA-Z0-9_-]/g, '') : "acuerdo";
                
                if (ag.content && ag.content.trim()) {
                  const contentBlob = new Blob([ag.content], { type: 'text/plain' });
                  await syncFileToDrive(
                    token,
                    contractorFolderId,
                    `${prefix}_acuerdo_texto.txt`,
                    "text/plain",
                    contentBlob,
                    `Texto de acuerdo para la obra ${ag.projectName || 'General'}`
                  );
                }
                
                if (ag.fileBase64 && ag.fileName) {
                  const attachmentName = ag.fileName.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ .-]/g, '').trim().replace(/\s+/g, '_');
                  const attachmentBlob = dataURItoBlob(ag.fileBase64);
                  await syncFileToDrive(
                    token,
                    contractorFolderId,
                    `${prefix}_adjunto_${attachmentName}`,
                    ag.mimeType || "application/octet-stream",
                    attachmentBlob,
                    `Documento adjunto de acuerdo para: ${contractor.name}`
                  );
                }
              }
            }
        }
      } catch (contrErr) {
        console.error("Error backing up contractors:", contrErr);
      }

      // Finish loop successfully
      setCurrentBackupRender(null);
      setIsAutoPdfInProcess(false);
      setAutoBackupProgress('');
      setSuccessMsg(`¡Sincronización finalizada! Se crearon/actualizaron exitosamente los archivos PDF, Excel (.xlsx), Archivos de Contratistas y JSON en Google Drive para la obra: ${projectName}`);
      
      // Update files table
      fetchBackupFiles(token);
    } catch (err: any) {
      console.error('Error during execution of PDF backup:', err);
      setErrorMsg(`Error al subir archivos a Drive: ${err.message || err}`);
      setCurrentBackupRender(null);
      setIsAutoPdfInProcess(false);
      setAutoBackupProgress('');
    }
  };

  // Fetch backups from Google Drive (isolated inside one dedicated folder)
  const fetchBackupFiles = useCallback(async (accessToken: string) => {
    setIsLoadingFiles(true);
    setErrorMsg(null);
    try {
      // 1) Find out the project name
      const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
      const params = activeProject ? activeProject.params : { projectName: 'Proyecto' };
      const projectName = (params.projectName || activeProject?.name || "Obra General").trim();

      // 2) Resolve the project folder
      const sharedFolderId = await getOrCreateSharedFolder(accessToken, "NOMINAS MARES");
      const projectFolderId = await getOrCreateProjectFolder(accessToken, sharedFolderId, projectName);
      setCurrentProjectFolderId(projectFolderId);

      // 3) Find all subfolders OF THIS project exactly (these are the reports). We want to list them!
      const subfoldersRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`mimeType = 'application/vnd.google-apps.folder' and '${projectFolderId}' in parents and trashed = false`)}&fields=files(id,name,createdTime)&orderBy=createdTime%20desc&pageSize=100&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      let fetchedFolders: any[] = [];
      if(subfoldersRes.ok) {
         const data = await subfoldersRes.json();
         const allF = data.files || [];
         
         // Fix duplicate folders dynamically
         const grouped = allF.reduce((acc: any, curr: any) => {
            const name = curr.name.trim().toLowerCase();
            if(!acc[name]) acc[name] = [];
            acc[name].push(curr);
            return acc;
         }, {});
         
         for (const name in grouped) {
           const group = grouped[name];
           if (group.length > 1) {
             // group is already sorted createdTime desc from the API natively, so group[group.length - 1] is the oldest (original).
             const original = group[group.length - 1];
             fetchedFolders.push(original); // Keep the original
             
             // Delete the newly created empty duplicate folders in the background
             for (let i = 0; i < group.length - 1; i++) {
               try {
                 fetch(`https://www.googleapis.com/drive/v3/files/${group[i].id}?supportsAllDrives=true`, {
                   method: 'DELETE',
                   headers: { Authorization: `Bearer ${accessToken}` }
                 }).catch(() => {});
               } catch (e) {}
             }
           } else {
             fetchedFolders.push(group[0]);
           }
         }
         
         fetchedFolders = fetchedFolders.sort((a: any, b: any) => 
           a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
         );
      }
      setProjectSubfolders(fetchedFolders);

      // 4) Determine the target folder. Default = selectedSubfolderId if valid, OR newest report folder, OR project folder.
      let targetFolderId = selectedSubfolderId;
      if (navStack.length > 0) {
        targetFolderId = navStack[navStack.length - 1].id;
      } else {
        if (!targetFolderId) { // First time or reset
          targetFolderId = fetchedFolders.length > 0 ? fetchedFolders[0].id : projectFolderId;
          setSelectedSubfolderId(targetFolderId);
        } else if (targetFolderId !== projectFolderId && !fetchedFolders.find(f => f.id === targetFolderId)) {
          // We switched projects and the old selectedSubfolderId doesn't exist in the new context
          targetFolderId = fetchedFolders.length > 0 ? fetchedFolders[0].id : projectFolderId;
          setSelectedSubfolderId(targetFolderId);
        }
      }

      // 5) Fetch the files and folders specifically inside this ONE folder (targetFolderId):
      const folderQuery = encodeURIComponent(`trashed = false and '${targetFolderId}' in parents`);
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${folderQuery}&fields=files(id,name,mimeType,createdTime,size,description)&orderBy=folder,createdTime%20desc&pageSize=100&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!response.ok) {
        throw new Error(`HTTP status ${response.status}`);
      }

      const data = await response.json();
      let fetchedFiles = data.files || [];
      if (targetFolderId === projectFolderId) {
        fetchedFiles = fetchedFiles.sort((a: any, b: any) => 
          a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
        );
      }
      setDriveFiles(fetchedFiles);

    } catch (err: any) {
      console.error('Fetch error:', err);
      if (err.message && err.message.includes('401')) {
        setErrorMsg("La sesión de Google expiró. Por favor, re-autentícate.");
        handleLogout();
      } else {
        setErrorMsg("Hubo un error al establecer la conexión con la carpeta de Google Drive.");
      }
    } finally {
      setIsLoadingFiles(false);
    }
  }, [projects, activeProjectId, selectedSubfolderId, navStack]);

  // Fetch files automatically on token load
  useEffect(() => {
    if (token) {
      fetchBackupFiles(token);
    }
  }, [token, fetchBackupFiles]);

  // Upload Excel export to Google Drive
  const handleUploadExcelBackup = async () => {
    if (!token) return;
    setIsBackupInProcess(true);
    clearMessages();
    
    try {
      const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
      if (!activeProject) {
        setErrorMsg("La obra activa seleccionada no se encuentra disponible.");
        setIsBackupInProcess(false);
        return;
      }

      const openReportsWarnings: string[] = [];
      activeProject.sheets?.forEach((sheet: any) => {
        sheet.reports?.forEach((rep: any) => {
          if (rep.status !== "CERRADO") {
            openReportsWarnings.push(`🔹 ${sheet.name} — ${rep.name}`);
          }
        });
      });
      if (openReportsWarnings.length > 0) {
        setErrorMsg(`Operación denegada. El respaldo de Excel no procede porque existen reportes ABIERTOS:\n${openReportsWarnings.join('\n')}\nCierre estos reportes antes de respaldar.`);
        setIsBackupInProcess(false);
        return;
      }

      const params = activeProject ? activeProject.params : { projectName: 'Proyecto' };
      const projectName = (params.projectName || activeProject.name || "Obra General").trim();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `Nomina_Contratistas_${projectName.replace(/\s+/g, '_')}_${timestamp}.xlsx`;

      // Generate the Excel binary blob
      const excelBlob = exportSystemToExcelBlob(
        activeProject.params,
        contractors,
        activeProject.sheets,
        includeItbisInNet
      );

      // Resolve root shared folder
      const sharedFolderId = await getOrCreateSharedFolder(token, "NOMINAS MARES");

      // Get or create subfolder with the name of the Project/Obra
      const projectFolderId = await getOrCreateProjectFolder(token, sharedFolderId, projectName);

      // Clean up previous Excels in this exact project folder
      try {
        const excelSearchRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${projectFolderId}' in parents and trashed = false and mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'`)}&fields=files(id)&pageSize=100&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (excelSearchRes.ok) {
          const oldData = await excelSearchRes.json();
          for (const oldFile of (oldData.files || [])) {
            await fetch(`https://www.googleapis.com/drive/v3/files/${oldFile.id}?supportsAllDrives=true`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
          }
        }
      } catch (e) {
        console.error("Clean old excel error:", e);
      }

      // Metadata for uploading multipart content inside our directory
      const metadata = {
        name: filename,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        description: backupDescription.trim() || `Reporte general para Microsoft Excel de la obra: ${projectName}`,
        parents: [projectFolderId]
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', excelBlob);

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });

      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}`);
      }

      const uploadedFile = await res.json();
      setSuccessMsg(`¡Microsoft Excel guardado en su respectiva carpeta en Google Drive!`);
      setBackupDescription('');
      addAuditEntry("Respaldo Excel Google Drive", `Subido reporte "${filename}" a Drive.`);
      
      // Refresh list
      fetchBackupFiles(token);
    } catch (err) {
      console.error('Error backing up Excel:', err);
      setErrorMsg("Ocurrió un error al subir el Excel a Google Drive.");
    } finally {
      setIsBackupInProcess(false);
    }
  };

  // Upload complete system JSON backup
  const handleUploadJsonBackup = async () => {
    if (!token) return;
    setIsBackupInProcess(true);
    clearMessages();
 
    try {
      const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
      if (!activeProject) {
        setErrorMsg("La obra activa seleccionada no se encuentra disponible.");
        setIsBackupInProcess(false);
        return;
      }

      const openReportsWarnings: string[] = [];
      activeProject.sheets?.forEach((sheet: any) => {
        sheet.reports?.forEach((rep: any) => {
          if (rep.status !== "CERRADO") {
            openReportsWarnings.push(`🔹 ${sheet.name} — ${rep.name}`);
          }
        });
      });
      if (openReportsWarnings.length > 0) {
        setErrorMsg(`Operación denegada. El respaldo de JSON completo no procede porque existen reportes ABIERTOS:\n${openReportsWarnings.join('\n')}\nCierre todos los reportes en proceso antes de generar un respaldo del sistema.`);
        setIsBackupInProcess(false);
        return;
      }

      const params = activeProject ? activeProject.params : { projectName: 'Proyecto' };
      const projectName = (params.projectName || activeProject.name || "Obra General").trim();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `Respaldo_Mares_Completo_${timestamp}.json`;

      // Prepare system data backup wrapper
      const backupWrapper = {
        appIdentifier: "MaresNominas",
        version: "3.2",
        backupDate: new Date().toISOString(),
        description: backupDescription.trim() || "Respaldo automático completo del sistema",
        payload: {
          projects,
          contractors,
          generalPriceGuide,
          includeItbisInNet
        }
      };

      const jsonBlob = new Blob([JSON.stringify(backupWrapper, null, 2)], { type: 'application/json' });

      // Resolve root shared folder
      const sharedFolderId = await getOrCreateSharedFolder(token, "NOMINAS MARES");

      // Get or create subfolder with the name of the Project/Obra
      const projectFolderId = await getOrCreateProjectFolder(token, sharedFolderId, projectName);

      // Clean up previous JSONs in this exact project folder
      try {
        const jsonSearchRes = await fetch(
          `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${projectFolderId}' in parents and trashed = false and (mimeType = 'application/json' or name contains '.json')`)}&fields=files(id)&pageSize=100&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (jsonSearchRes.ok) {
          const oldData = await jsonSearchRes.json();
          for (const oldFile of (oldData.files || [])) {
            await fetch(`https://www.googleapis.com/drive/v3/files/${oldFile.id}?supportsAllDrives=true`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` }
            });
          }
        }
      } catch (e) {
        console.error("Clean old json error:", e);
      }

      // Metadata boundary configuration with single parent setting
      const metadata = {
        name: filename,
        mimeType: 'application/json',
        description: backupDescription.trim() || "Archivo de restauración total de base de datos de Mares Nominas.",
        parents: [projectFolderId]
      };

      const form = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', jsonBlob);

      const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form
      });

      if (!res.ok) {
        throw new Error(`Upload failed with status ${res.status}`);
      }

      setSuccessMsg(`¡Respaldo JSON completo guardado en su respectiva carpeta en Google Drive!`);
      setBackupDescription('');
      addAuditEntry("Respaldo Completo Google Drive", `Backup completo "${filename}" guardado en Drive.`);
      
      // Refresh list
      fetchBackupFiles(token);
    } catch (err) {
      console.error('Error backing up JSON:', err);
      setErrorMsg("Ocurrió un error al subir la base de datos JSON a Google Drive.");
    } finally {
      setIsBackupInProcess(false);
    }
  };

  const handleVerifyIntegrity = async (file: DriveFile) => {
    if (!token) return;
    clearMessages();
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&supportsAllDrives=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`No se pudo obtener el archivo. Código de error: ${res.status}`);
      }

      const backupData = await res.json();
      
      if (backupData.appIdentifier !== "MaresNominas" || !backupData.payload) {
        throw new Error("El archivo seleccionado no tiene el formato estándar de MaresNominas.");
      }

      const payload = backupData.payload;
      let isIntact = true;
      let corruptions: string[] = [];

      // Check projects
      if (payload.projects) {
        payload.projects.forEach((p: any) => {
          const storedChecksum = p.checksum;
          if (storedChecksum) {
            const expected = generateChecksumSync(p);
            if (storedChecksum !== expected) {
              isIntact = false;
              corruptions.push(`Proyecto corrompido: ${p.name || p.id}`);
            }
          }
        });
      }
      // Check contractors
      if (payload.contractors) {
        payload.contractors.forEach((c: any) => {
          const storedChecksum = c.checksum;
          if (storedChecksum) {
            const expected = generateChecksumSync(c);
            if (storedChecksum !== expected) {
              isIntact = false;
              corruptions.push(`Contratista corrompido: ${c.name || c.id}`);
            }
          }
        });
      }
      
      if (isIntact) {
        setSuccessMsg(`La integridad del respaldo "${file.name}" ha sido verificada satisfactoriamente. No se detectaron alteraciones (Checksum hash coincidente).`);
      } else {
        setErrorMsg(`⚠️ ADVERTENCIA: Se detectó alteración en el archivo "${file.name}". Hash checksum inválido. Detalles: ${corruptions.join(", ")}`);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Error desconocido al verificar integridad.');
    }
  };

  // RESTORE SYSTEM DATABASE (MUTATOR INTERACTION MANDATORY DIALOGUE)
  const handleTriggerRestore = (file: DriveFile) => {
    setRestoreConfirmFile(file);
  };

  const handleExecuteRestore = async () => {
    if (!restoreConfirmFile || !token) return;
    setIsRestoring(true);
    clearMessages();

    try {
      // Get the file contents
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${restoreConfirmFile.id}?alt=media&supportsAllDrives=true`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`No se pudo obtener el archivo. Código de error: ${res.status}`);
      }

      const backupData = await res.json();
      
      // Validation of standard backup format
      if (backupData.appIdentifier !== "MaresNominas" || !backupData.payload) {
        throw new Error("El archivo seleccionado no tiene el formato estándar de MaresNominas.");
      }

      const { payload } = backupData;
      if (!payload.projects || !payload.contractors) {
        throw new Error("El archivo de respaldo está incompleto o corrupto.");
      }

      // Execute restoration
      onRestoreSystem({
        projects: payload.projects,
        contractors: payload.contractors,
        generalPriceGuide: payload.generalPriceGuide || {},
        includeItbisInNet: payload.includeItbisInNet !== undefined ? payload.includeItbisInNet : true
      });

      setSuccessMsg(`¡Sistema restaurado exitosamente a partir del archivo ${restoreConfirmFile.name}!`);
      addAuditEntry("Restauración Google Drive", `Base de datos restaurada desde "${restoreConfirmFile.name}".`);
      setRestoreConfirmFile(null);
    } catch (err: any) {
      console.error('Restore error:', err);
      setErrorMsg(`Error de restauración: ${err.message || 'No se pudo leer el archivo'}`);
      setRestoreConfirmFile(null);
    } finally {
      setIsRestoring(false);
    }
  };

  // DELETE FILE FROM GOOGLE DRIVE (DESTRUCTIVE OPERATION MANDATORY CHECK)
  const handleTriggerDelete = (file: DriveFile) => {
    setDeleteConfirmFile(file);
  };

  const handleExecuteDelete = async () => {
    if (!deleteConfirmFile || !token) return;
    setIsDeleting(true);
    clearMessages();

    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${deleteConfirmFile.id}?supportsAllDrives=true`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!res.ok) {
        throw new Error(`Delete failed with status ${res.status}`);
      }

      setSuccessMsg(`El archivo "${deleteConfirmFile.name}" fue borrado de tu Google Drive.`);
      addAuditEntry("Eliminar archivo Drive", `Eliminado "${deleteConfirmFile.name}".`);
      setDeleteConfirmFile(null);
      
      // Refresh list
      fetchBackupFiles(token);
    } catch (err: any) {
      console.error('Delete error:', err);
      setErrorMsg(`No se pudo borrar el archivo: ${err.message || 'Error desconocido'}`);
      setDeleteConfirmFile(null);
    } finally {
      setIsDeleting(false);
    }
  };

  // Readable file size
  const formatBytes = (bytesStr?: string) => {
    if (!bytesStr) return 'N/D';
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes)) return 'N/D';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const activeProjectName = resolvedActiveProject?.name || 'Sin Nombre';

  return (
    <div className="space-y-6">
      {/* Title Header Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2 z-10">
          <div className="flex items-center gap-2 text-blue-400">
            <Cloud size={24} className="animate-pulse" />
            <span className="text-xs uppercase font-extrabold tracking-wider bg-blue-500/10 px-2.5 py-1 rounded-full border border-blue-500/20">Integración de Nube</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Sincronización y Respaldos con Google Drive</h1>
          <p className="text-slate-400 text-sm max-w-2xl">
            Guarda tus hojas de producción y nóminas dentro de la carpeta compartida designada por defecto en tu Google Drive. Esto permite centralizar toda la documentación de tus obras en un solo lugar.
          </p>
        </div>
        <div className="z-10 w-full md:w-auto">
          {needsAuth ? (
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              className="w-full md:w-auto bg-white text-slate-900 hover:bg-slate-100 px-6 py-3 rounded-xl font-bold transition-all text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-55"
            >
              {isLoggingIn ? (
                <RefreshCw size={16} className="animate-spin text-slate-600" />
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                </svg>
              )}
              {isLoggingIn ? "Conectando..." : "Sign in with Google"}
            </button>
          ) : (
            <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center justify-between md:justify-start gap-4">
              <div className="flex items-center gap-2 text-left">
                {user?.photoURL ? (
                  <img src={user.photoURL} alt="Avatar" className="w-10 h-10 rounded-full border-2 border-blue-500 shadow-sm" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-600 font-bold text-white flex items-center justify-center border-2 border-slate-700 shadow-sm">
                    {user?.displayName ? user.displayName.charAt(0) : 'G'}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-sm text-slate-100">{user?.displayName || 'Usuario de Google'}</h4>
                  <p className="text-[11px] text-slate-400 font-mono truncate max-w-[170px]">{user?.email}</p>
                </div>
              </div>
              {isAdmin && (
                <button
                  onClick={handleLogout}
                  className="bg-slate-700 hover:bg-slate-600 p-2.5 rounded-lg text-slate-300 hover:text-white transition-colors"
                  title="Cerrar sesión de Google"
                >
                  <LogOut size={16} />
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Global Toast Messages inside the layout */}
      {errorMsg && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl animate-in slide-in-from-top-2 duration-150">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="text-xs font-semibold flex-1 leading-relaxed">{errorMsg}</div>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700 shrink-0 font-bold text-sm">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl animate-in slide-in-from-top-2 duration-150">
          <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          <div className="text-xs font-semibold flex-1 leading-relaxed">{successMsg}</div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-600 hover:text-emerald-800 shrink-0 font-bold text-sm">✕</button>
        </div>
      )}

      {/* Main Google Drive Panel content */}
      {needsAuth ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-lg mx-auto shadow-sm flex flex-col items-center space-y-6">
          <div className="bg-blue-50 text-blue-600 p-4 rounded-full border border-blue-100">
            <Cloud size={48} className="text-blue-500 animate-bounce" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-800">Se requiere autenticación</h3>
            <p className="text-slate-500 text-xs mt-2 leading-relaxed">
              Para listar, subir o restaurar la información de tus presupuestos desde Google Drive, debes conectar tu cuenta de Google de forma segura con la aplicación.
            </p>
          </div>
          <button
            onClick={handleLogin}
            disabled={isLoggingIn}
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs transition-all shadow hover:shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
          >
            {isLoggingIn ? "Conectando..." : "Iniciar Sesión con Google"}
            <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Hand Column: PDF & Database backups */}
          <div className="space-y-6 lg:col-span-1">
            
            {/* Folder Configuration Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 flex items-center gap-1.5 text-blue-600">
                <FolderOpen size={16} />
                Carpeta Destino (Compartida)
              </h3>
              
              <div className="space-y-3">
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Los archivos se guardarán y leerán desde la carpeta de Google Drive configurada por defecto de forma segura.
                </p>
                <div className="p-3 bg-green-50 rounded-lg border border-green-150 text-[11px] text-green-700 space-y-1.5 leading-relaxed font-sans">
                  <p className="font-bold">
                    ✓ Carpeta de Respaldos Conectada.
                  </p>
                  <p className="text-green-600/80">
                    Por motivos de seguridad, el enlace directo y el ID de la carpeta se encuentran ocultos y encriptados para evitar clonaciones.
                  </p>
                </div>
              </div>
            </div>

            {/* Automatic PDF Backup Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide border-b border-slate-100 pb-3 flex items-center gap-1.5 text-blue-600">
                <FileText size={16} />
                Respaldo Automático (PDF)
              </h3>
              
              <div className="space-y-4">
                <p className="text-slate-500 text-xs leading-relaxed">
                  Genera comprobantes PDF individuales para un reporte específico de todos los contratistas y los guarda automáticamente en Google Drive:
                </p>

                {uniqueReportsLabels.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                      Reporte a Respaldar
                    </label>
                    <select
                      className="w-full bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800 rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
                      value={selectedPdfReportTarget}
                      onChange={(e) => setSelectedPdfReportTarget(e.target.value)}
                      disabled={isAutoPdfInProcess || isBackupInProcess}
                    >
                      <option value="latest">Último Creado (Reporte Reciente)</option>
                      {uniqueReportsLabels.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="font-mono text-[11px] bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-150 font-bold block w-full text-center truncate" title={`ID: ${getGoogleFolderId()}`}>
                  ID: {getGoogleFolderId()}
                </div>

                {resolvedActiveProject ? (
                  <div className="p-3 bg-blue-50/60 border border-blue-100/40 rounded-xl space-y-1">
                    <span className="text-[10px] font-extrabold text-blue-700 block uppercase tracking-wider">Subcarpeta de Obra:</span>
                    <span className="text-xs font-bold text-slate-800 truncate block">
                      {resolvedActiveProject.params?.projectName || resolvedActiveProject.name || "Obra General"}
                    </span>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-250 rounded-xl">
                    <span className="text-[11px] text-yellow-800 font-bold leading-normal block">
                      ⚠️ No se encontraron obras registradas en el sistema.
                    </span>
                  </div>
                )}

                {isAutoPdfInProcess ? (
                  <div className="p-4 bg-indigo-50 border border-indigo-150 rounded-xl space-y-2 animate-pulse">
                    <div className="flex items-center gap-2 text-indigo-700 font-extrabold text-xs">
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Creando Copia en PDF...</span>
                    </div>
                    <div className="text-[11px] text-indigo-650 font-mono leading-relaxed truncate">
                      {autoBackupProgress}
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={handleAutoPdfBackup}
                    disabled={isBackupInProcess || isAutoPdfInProcess || !resolvedActiveProject || isReadOnly}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs transition-all shadow-sm hover:shadow active:scale-95 cursor-pointer flex items-center justify-center gap-2 focus:outline-none disabled:opacity-55"
                    title={isReadOnly ? "No tienes permisos suficientes en esta obra" : "Crear respaldo"}
                  >
                    <FileDown size={15} />
                    {selectedPdfReportTarget === 'latest' ? "Respaldar Último Reporte en PDF" : `Respaldar PDF: ${selectedPdfReportTarget}`}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Backup File Explorer Panel */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs lg:col-span-2 flex flex-col h-full space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5 text-blue-600">
                <FolderOpen size={16} />
                Carpeta Compartida de Google Drive
              </h3>
              <button
                onClick={() => token && fetchBackupFiles(token)}
                disabled={isLoadingFiles}
                className="text-slate-500 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition-colors border border-slate-200 inline-flex items-center gap-1 text-[11px]"
              >
                <RefreshCw size={12} className={isLoadingFiles ? "animate-spin" : ""} />
                Actualizar
              </button>
            </div>

            {projectSubfolders.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Subcarpeta Obra:</span>
                <select
                  className="flex-1 bg-white border border-slate-200 text-[11px] font-semibold text-slate-800 rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-500"
                  value={selectedSubfolderId || ''}
                  onChange={(e) => {
                    setNavStack([]);
                    setSearchQuery('');
                    setSelectedSubfolderId(e.target.value);
                  }}
                >
                  {projectSubfolders.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                  {currentProjectFolderId && (
                    <option value={currentProjectFolderId}>General de Obra (Archivos Raíz)</option>
                  )}
                </select>
              </div>
            )}

            {/* Search Bar for Quick File Filter */}
            <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg text-sm mb-3">
              <Search size={16} className="text-slate-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar archivos en esta carpeta..."
                className="flex-1 outline-none text-slate-700 bg-transparent placeholder-slate-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 transition-colors p-1">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Breadcrumb Navigation */}
            {navStack.length > 0 && (
              <div className="flex items-center flex-wrap gap-1 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-[11px] font-semibold text-slate-600 mb-2">
                <button 
                  onClick={() => { setNavStack([]); setSearchQuery(''); }}
                  className="hover:text-blue-600 flex items-center gap-1 transition-colors"
                >
                  <Folder size={12} className="text-slate-400" />
                  Volver al inicio
                </button>
                {navStack.map((crumb, idx) => (
                  <React.Fragment key={crumb.id}>
                    <ChevronRight size={12} className="text-slate-400 shrink-0" />
                    <button
                      onClick={() => { setNavStack(prev => prev.slice(0, idx + 1)); setSearchQuery(''); }}
                      className={`hover:text-blue-600 transition-colors ${idx === navStack.length - 1 ? 'text-slate-800' : ''}`}
                    >
                      {crumb.name}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            )}

            {/* List container */}
            <div className="flex-1 overflow-y-auto max-h-[420px] pr-1 space-y-2">
              {isLoadingFiles ? (
                <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-xl space-y-2 border border-slate-100">
                  <RefreshCw size={24} className="text-blue-500 animate-spin" />
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Leyendo tu Google Drive...</span>
                </div>
              ) : driveFiles.length === 0 ? (
                <div className="text-center py-16 bg-slate-50 border border-slate-100 rounded-xl space-y-3">
                  <Cloud size={36} className="text-slate-300 mx-auto" />
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">No se encontraron respaldos creados</div>
                  <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Utiliza la columna izquierda para subir tu primer reporte de Excel o un respaldo del sistema completo de Mares Nominas.
                  </p>
                </div>
              ) : (
                driveFiles.map((file) => (
                  <DriveTreeNode
                    key={file.id}
                    file={file}
                    accessToken={token || ''}
                    isReadOnly={!!isReadOnly}
                    onRestore={handleTriggerRestore}
                    onVerify={handleVerifyIntegrity}
                    onDelete={handleTriggerDelete}
                    searchQuery={searchQuery}
                  />
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {/* DIÁLOGO DE RESOLUCIÓN DE CONFLICTOS DE RESPALDO PDF */}
      {pdfConflictDialog && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 border border-slate-100 flex flex-col space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-blue-600 bg-blue-50 p-3 rounded-xl border border-blue-100">
              <span className="shrink-0 p-1.5 bg-blue-100 rounded-full text-blue-700">
                <FolderOpen size={20} />
              </span>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-blue-800">Sincronización Inteligente de PDFs</h4>
                <p className="text-[11px] text-blue-750 font-semibold">{pdfConflictDialog.projectName}</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800">Se detectaron respaldos anteriores en Google Drive</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                El sistema detectó reportes previamente subidos en tu carpeta compartida. Puedes elegir actualizar únicamente los contratistas que sufrieron modificaciones de valor o reemplazar todo el lote:
              </p>

              {/* Table of contractors and modifications status */}
              <div className="border border-slate-150 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-slate-550 font-bold font-mono text-[9px] uppercase tracking-wider">
                      <th className="p-3">Contratista / Corte</th>
                      <th className="p-3 text-right">Monto Neto Actual</th>
                      <th className="p-3 text-center">Estado en Drive</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pdfConflictDialog.queue.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-3">
                          <div className="font-bold text-slate-800">{item.contractorName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{item.report.name}</div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-700">
                          {formatCurrencyValue(item.netVal, 'DOP')}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-center">
                            {item.existingFileId ? (
                              item.hasChanged ? (
                                <div className="flex flex-col items-center">
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-50 text-amber-800 border border-amber-150">
                                    ⚠️ Modificado
                                  </span>
                                  {item.oldNetVal !== undefined && (
                                    <span className="text-[9px] font-normal text-slate-450 block mt-0.5 font-mono">
                                      Previo: {formatCurrencyValue(item.oldNetVal, 'DOP')}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-150">
                                  🟢 Sin Cambios / Idéntico
                                </span>
                              )
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-blue-50 text-blue-800 border border-blue-150">
                                🆕 Nuevo Comprobante
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => setPdfConflictDialog(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors font-bold text-xs"
              >
                Cancelar
              </button>
              
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => executeCompiledBackup('keep_both', pdfConflictDialog)}
                  className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl transition-colors font-bold text-xs border border-slate-200"
                >
                  Conservar Ambos
                </button>
                <button
                  onClick={() => executeCompiledBackup('replace_all', pdfConflictDialog)}
                  className="px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl transition-colors font-bold text-xs border border-red-150"
                >
                  Reemplazar Todos
                </button>
                <button
                  onClick={() => executeCompiledBackup('replace_modified', pdfConflictDialog)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors font-bold text-xs shadow-sm flex items-center gap-1.5"
                >
                  <RefreshCw size={12} className="animate-spin" />
                  Actualizar Solo Modificados
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG FOR RESTORATION (MANDATORY SAFE GUARD) */}
      {restoreConfirmFile && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-100 flex flex-col space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-indigo-600 bg-indigo-50 p-3 rounded-xl border border-indigo-100">
              <span className="shrink-0 p-1.5 bg-indigo-100 rounded-full text-indigo-700">
                <ShieldAlert size={20} className="animate-pulse" />
              </span>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-indigo-800">Confirmación de Acción</h4>
                <p className="text-[11px] text-indigo-700 font-medium">Reemplazo de Base de Datos</p>
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800">¿Deseas restaurar la base de datos completa?</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                Estás a punto de cargar el archivo <strong className="text-slate-800 font-bold">{restoreConfirmFile.name}</strong> desde Google Drive.
              </p>
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-[10px] text-red-700 leading-relaxed font-semibold">
                ⚠️ ADVERTENCIA: Esta acción es destructiva e irreversible. Reemplazará permanentemente todas tus obras, contratos, presupuestos e historial de nóminas cargados en el navegador por los datos de este respaldo.
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2 justify-end text-xs">
              <button
                onClick={() => setRestoreConfirmFile(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors font-bold"
                disabled={isRestoring}
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteRestore}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-bold shadow flex items-center gap-1.5"
                disabled={isRestoring}
              >
                {isRestoring ? <RefreshCw size={12} className="animate-spin" /> : null}
                {isRestoring ? "Restaurando..." : "Sí, Restaurar Todo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION DIALOG FOR DELETE (MANDATORY SAFE GUARD) */}
      {deleteConfirmFile && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 flex flex-col space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-rose-600 bg-rose-50/60 p-3 rounded-xl border border-rose-100">
              <span className="shrink-0 p-1.5 bg-rose-100 rounded-full text-rose-700">
                <Trash2 size={20} />
              </span>
              <div>
                <h4 className="text-xs font-extrabold uppercase tracking-widest text-rose-800">Atención Requerida</h4>
                <p className="text-[11px] text-rose-700 font-medium">Borrando Archivo en Google Drive</p>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-bold text-slate-800">¿Seguro que deseas eliminar este respaldo?</h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                El archivo <strong className="text-slate-800">{deleteConfirmFile.name}</strong> se eliminará permanentemente de tu almacenamiento de Google Drive. No podrás recuperarlo ni restaurarlo más adelante.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2 justify-end text-xs">
              <button
                onClick={() => setDeleteConfirmFile(null)}
                className="px-4 py-2 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors font-bold"
                disabled={isDeleting}
              >
                Cancelar
              </button>
              <button
                onClick={handleExecuteDelete}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold shadow flex items-center gap-1.5"
                disabled={isDeleting}
              >
                {isDeleting ? <RefreshCw size={12} className="animate-spin" /> : null}
                {isDeleting ? "Borrando..." : "Sí, Eliminar de Drive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Off-Screen HTML template for PDF screenshot capture */}
      {currentBackupRender && (
        <div 
          id="auto-backup-pdf-render-root" 
          style={{ 
            position: 'absolute', 
            top: '-10000px', 
            left: '-10000px', 
            width: currentBackupRender.isSummary ? '1120px' : '852px', 
            zIndex: -9999,
          }}
          className="bg-white p-8 border border-slate-150 flex flex-col space-y-6"
        >
          {currentBackupRender.isSummary ? (
            /* CONSOLIDATED SUMMARY TEMPLATE */
            <div className="space-y-6 font-sans text-slate-800">
              {/* Summary Header */}
              <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5">
                <div className="space-y-1">
                  <h1 className="text-xl font-black text-slate-955 tracking-tight uppercase font-sans">
                    RESUMEN CONSOLIDADO DE NÓMINA Y PAGOS
                  </h1>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">
                    CONSOLIDACIÓN DE CORTES DE PRODUCCIÓN - {currentBackupRender.projectName.toUpperCase()}
                  </p>
                </div>

                <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg text-xs space-y-1 text-slate-700 font-sans min-w-[245px]">
                  <div><strong>Obra / Proyecto:</strong> <span className="font-extrabold text-slate-900">{currentBackupRender.projectName}</span></div>
                  <div className="flex items-center gap-1.5"><strong>Cortes Incluidos:</strong> <span className="inline-flex items-center justify-center font-mono text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-extrabold leading-none">{currentBackupRender.reportNames}</span></div>
                  <div><strong>Fecha Emisión:</strong> <span className="font-medium text-slate-900">{new Date().toLocaleDateString("es-DO", { year: "numeric", month: "long", day: "numeric" })}</span></div>
                  <div><strong>Moneda:</strong> <span className="font-mono font-bold text-slate-900">{currentBackupRender.params.currency || "DOP"}</span></div>
                </div>
              </div>

              {/* Period range summary bar */}
              <div className="flex justify-between items-center bg-blue-50 border border-blue-150 p-3 rounded-lg text-xs">
                <div>
                  <strong>Periodo de Nómina:</strong> Desde{" "}
                  <strong className="text-blue-950">{formatDateReadable(currentBackupRender.dateFrom)}</strong> Hasta{" "}
                  <strong className="text-blue-950">{formatDateReadable(currentBackupRender.dateTo)}</strong>
                </div>
                <div className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 px-2.5 py-1.5 rounded-full border border-emerald-150 inline-flex items-center justify-center leading-none">
                  ESTADO: RESPALDADO AUTOMÁTICAMENTE
                </div>
              </div>

              {/* Summary Table */}
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left border-collapse text-[10px]">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 uppercase tracking-wider font-bold border-b border-slate-300">
                      <th className="px-2 py-2.5 text-center w-6">#</th>
                      <th className="px-3 py-2.5 text-left w-40">Contratista</th>
                      <th className="px-2 py-2.5 text-left">Actividad / Concepto</th>
                      <th className="px-2 py-2.5 text-right font-mono">Bruto ({currentBackupRender.params.currency})</th>
                      <th className="px-2 py-2.5 text-right font-mono">Ret. ISR</th>
                      <th className="px-2 py-2.5 text-right font-mono">Ret. TSS</th>
                      <th className="px-2 py-2.5 text-right font-mono">FOPETCONS</th>
                      <th className="px-2 py-2.5 text-right font-mono">Garantía</th>
                      <th className="px-2 py-2.5 text-right font-mono text-amber-800 font-bold">Descuentos</th>
                      <th className="px-2 py-2.5 text-right font-mono">ITBIS</th>
                      <th className="px-2 py-2.5 text-right font-mono font-black text-slate-950 bg-slate-50">Neto Pagar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {currentBackupRender.summaryRows.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-2 py-2 text-center font-bold text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2">
                          <div className="font-extrabold text-slate-900 leading-tight">{row.contractorName}</div>
                          <div className="text-[9px] text-slate-400 font-mono font-semibold">{row.contractorDoc}</div>
                        </td>
                        <td className="px-2 py-2 text-slate-700 italic">{row.activity} ({row.code})</td>
                        <td className="px-2 py-2 text-right font-mono">{formatCurrencyValue(row.grossValue, currentBackupRender.params.currency)}</td>
                        <td className="px-2 py-2 text-right font-mono text-red-700 font-medium">-{formatCurrencyValue(row.isr, currentBackupRender.params.currency)}</td>
                        <td className="px-2 py-2 text-right font-mono text-red-700 font-medium">-{formatCurrencyValue(row.tss, currentBackupRender.params.currency)}</td>
                        <td className="px-2 py-2 text-right font-mono text-red-700 font-medium">-{formatCurrencyValue(row.pension, currentBackupRender.params.currency)}</td>
                        <td className="px-2 py-2 text-right font-mono text-red-700 font-medium">-{formatCurrencyValue(row.warranty, currentBackupRender.params.currency)}</td>
                        <td className="px-2 py-2 text-right font-mono text-red-700 font-semibold font-mono">-{formatCurrencyValue(row.discounts, currentBackupRender.params.currency)}</td>
                        <td className="px-2 py-2 text-right font-mono text-emerald-700">+{formatCurrencyValue(row.itbis, currentBackupRender.params.currency)}</td>
                        <td className="px-2 py-2 text-right font-mono font-bold text-slate-955 bg-slate-50/70">{formatCurrencyValue(row.netPayable, currentBackupRender.params.currency)}</td>
                      </tr>
                    ))}
                    {/* Totals row */}
                    <tr className="bg-slate-100 font-black border-t-2 border-slate-300">
                      <td colSpan={3} className="px-3 py-3 uppercase text-right tracking-wider">TOTALES CONSOLIDADOS:</td>
                      <td className="px-2 py-3 text-right font-mono">{formatCurrencyValue(currentBackupRender.totals.grossValue, currentBackupRender.params.currency)}</td>
                      <td className="px-2 py-3 text-right font-mono text-red-800">-{formatCurrencyValue(currentBackupRender.totals.isr, currentBackupRender.params.currency)}</td>
                      <td className="px-2 py-3 text-right font-mono text-red-800">-{formatCurrencyValue(currentBackupRender.totals.tss, currentBackupRender.params.currency)}</td>
                      <td className="px-2 py-3 text-right font-mono text-red-800">-{formatCurrencyValue(currentBackupRender.totals.pension, currentBackupRender.params.currency)}</td>
                      <td className="px-2 py-3 text-right font-mono text-red-800">-{formatCurrencyValue(currentBackupRender.totals.warranty, currentBackupRender.params.currency)}</td>
                      <td className="px-2 py-3 text-right font-mono text-red-800">-{formatCurrencyValue(currentBackupRender.totals.discounts, currentBackupRender.params.currency)}</td>
                      <td className="px-2 py-3 text-right font-mono text-emerald-800">+{formatCurrencyValue(currentBackupRender.totals.itbis, currentBackupRender.params.currency)}</td>
                      <td className="px-2 py-3 text-right font-mono text-slate-950 bg-slate-200/50 text-sm border-l border-r border-slate-400">{formatCurrencyValue(currentBackupRender.totals.netPayable, currentBackupRender.params.currency)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Authorizations Area */}
              <div className="grid grid-cols-3 gap-6 pt-10 text-[10px] text-slate-500">
                <div className="border-t border-slate-400 pt-2 text-center font-bold text-slate-700">
                  Preparado Por: Contabilidad de Obra
                  <div className="text-[8px] font-mono font-medium text-slate-400 mt-1">Firma Digital Registrada</div>
                </div>
                <div className="border-t border-slate-400 pt-2 text-center font-bold text-slate-700">
                  Revisado Por: Fiscal de Obra / Supervisor
                  <div className="text-[8px] font-mono font-medium text-slate-400 mt-1">Firma Digital Registrada</div>
                </div>
                <div className="border-t border-slate-400 pt-2 text-center font-bold text-slate-700">
                  Aprobado Por: Director Financiero Mares
                  <div className="text-[8px] font-mono font-medium text-slate-400 mt-1">Firma Digital Registrada</div>
                </div>
              </div>
            </div>
          ) : (
            /* INDIVIDUAL VOUCHER TEMPLATE - BOTH COPIES ON DISCRETE DIVS FOR MULTI-PAGE CAPTURE */
            <div className="flex flex-col space-y-12">
              {/* PAGE 1: COPIA EMPRESA (INTERNA) */}
              <div 
                id="auto-backup-pdf-render-root-company"
                className="bg-white p-8 border border-slate-150 flex flex-col space-y-6 w-[852px]"
              >
                {/* Header (with logo and company details) */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5">
                  <div className="flex items-center gap-4">
                    {currentBackupRender.params.companyLogo && (
                      <img 
                        src={currentBackupRender.params.companyLogo} 
                        alt="Logo Empresa" 
                        className="h-14 w-auto object-contain max-w-[170px]"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="space-y-1">
                      <h1 className="text-xl font-black text-slate-955 tracking-tight uppercase font-sans">
                        {currentBackupRender.params.companyName || "Constructora Alba & Sánchez S.R.L."}
                      </h1>
                      <p className="text-[11px] text-slate-500 font-bold uppercase font-mono leading-tight">
                        RNC: {currentBackupRender.params.companyRfc || "1-31-04281-2"}
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg text-xs space-y-1 text-slate-700 font-sans min-w-[245px]">
                    <div className="text-[10px] font-bold uppercase text-blue-600 tracking-wider font-mono mb-2 border-b border-slate-250 pb-1">
                      Comprobante de Liquidación (Interno)
                    </div>
                    <div>
                      <strong>Nro. Documento:</strong>{" "}
                      <span className="font-mono text-slate-900 font-bold">
                        CUB-{currentBackupRender.sheet.code.toUpperCase()}-{currentBackupRender.report.id.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <strong>Fecha de Emisión:</strong>{" "}
                      <span className="font-medium text-slate-900">
                        {new Date().toLocaleDateString("es-DO", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div>
                      <strong>Moneda:</strong>{" "}
                      <span className="font-mono text-slate-900 font-bold">
                        {currentBackupRender.params.currency || "DOP"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contractor & Project Info block */}
                <div className="grid grid-cols-2 gap-4 text-xs font-sans text-slate-700 border-b border-slate-205 pb-5">
                  <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-lg border border-slate-250">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Datos del Beneficiario / Contratista
                    </div>
                    <div>
                      <strong>Nombre del Ajustero:</strong>{" "}
                      <span className="text-slate-900 font-black">
                        {currentBackupRender.contractorName}
                      </span>
                    </div>
                    <div>
                      <strong>RNC / Cédula Identidad:</strong>{" "}
                      <span className="font-mono text-slate-900 font-bold">
                        {currentBackupRender.contractorDoc}
                      </span>
                    </div>
                    <div>
                      <strong>Teléfono de Contacto:</strong>{" "}
                      <span className="font-mono text-slate-900 font-bold">
                        {currentBackupRender.contractorPhone}
                      </span>
                    </div>
                    <div>
                      <strong>Tipo Contratista:</strong>{" "}
                      <span className="font-medium text-slate-800">
                        {currentBackupRender.contractorType}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-lg border border-slate-250">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Datos del Proyecto / Obra
                    </div>
                    <div>
                      <strong>Empresa Constructora:</strong>{" "}
                      <span className="text-slate-900 font-bold">
                        {currentBackupRender.params.companyName || "Nóminas y Obras - Mares"}
                      </span>
                    </div>
                    <div>
                      <strong>Proyecto / Obra activa:</strong>{" "}
                      <span className="text-slate-900 font-black">
                        {currentBackupRender.params.projectName || "Obra General"}
                      </span>
                    </div>
                    <div>
                      <strong>Ubicación de Obra:</strong>{" "}
                      <span className="text-slate-800">
                        {currentBackupRender.params.address}
                      </span>
                    </div>
                    <div>
                      <strong>Responsable de Obra:</strong>{" "}
                      <span className="font-medium text-slate-900">
                        {currentBackupRender.params.responsible || "Ingeniero de Obra"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Period range */}
                <div className="flex justify-between items-center bg-slate-50 border border-slate-200/60 p-3 rounded-lg text-xs text-slate-700">
                  <div>
                    <strong>Periodo del Reporte:</strong> Desde{" "}
                    <strong className="text-slate-950">
                      {formatDateReadable(currentBackupRender.report.dateFrom)}
                    </strong>{" "}
                    Hasta{" "}
                    <strong className="text-slate-950">
                      {formatDateReadable(currentBackupRender.report.dateTo)}
                    </strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#0F172A] font-mono bg-indigo-50 px-2.5 py-1 rounded border border-indigo-150 font-bold">
                      {currentBackupRender.report.name} (INTERNO)
                    </span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-105 text-slate-800 uppercase tracking-wider font-bold border-b border-slate-200">
                        <th className="px-2 py-2 text-center w-10">#</th>
                        <th className="px-2 py-2 w-32">Subcapítulo</th>
                        <th className="px-3 py-2">Partida / Descripción del Trabajo</th>
                        <th className="px-2 py-2 text-center w-12">Unid.</th>
                        <th className="px-2 py-2 text-right w-24">Precio Unid.</th>
                        <th className="px-2 py-2 text-center w-16">Cant.</th>
                        <th className="px-2 py-2 text-right w-24">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {currentBackupRender.printableVoucherRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-6 text-slate-400 italic">
                            No se registraron partidas con cantidades aprobadas mayores a cero en este corte.
                          </td>
                        </tr>
                      ) : (
                        currentBackupRender.printableVoucherRows.map((r: any, idx: number) => {
                          const currentSub = r.subchapter || "Obra Civil";
                          const prevSub = idx > 0 ? currentBackupRender.printableVoucherRows[idx - 1].subchapter || "Obra Civil" : null;
                          const isRepetitive = idx > 0 && currentSub === prevSub;

                          return (
                            <tr key={r.id || idx} className="hover:bg-slate-50/50">
                              <td className="px-2 py-1.5 text-center font-mono font-bold text-slate-700">{idx + 1}</td>
                              <td className="px-2 py-1.5 font-bold text-slate-600 break-words whitespace-normal">
                                {isRepetitive ? (
                                  <span className="text-slate-400 font-black text-sm block text-center select-none leading-none">"</span>
                                ) : (
                                  currentSub
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-slate-800 font-medium">{r.description}</td>
                              <td className="px-2 py-1.5 text-center font-mono text-slate-600">{r.unit}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-slate-700">
                                {formatCurrencyValue(r.priceUnit, currentBackupRender.params.currency)}
                              </td>
                              <td className="px-2 py-1.5 text-center font-mono font-bold text-slate-900">{r.qty}</td>
                              <td className="px-2 py-1.5 text-right font-mono font-bold text-slate-900">
                                {formatCurrencyValue(r.grossValue, currentBackupRender.params.currency)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Billing Details block with internal copies signatures */}
                <div className="grid grid-cols-5 gap-6 pt-2 font-sans">
                  <div className="col-span-3 border border-slate-200 p-4 rounded-xl flex flex-col justify-between text-xs text-slate-500 bg-slate-50/20">
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono">
                      Declaraciones y Firmas de Autorización - Copia Interna
                    </span>
                    <div className="grid grid-cols-2 gap-4 pt-4">
                      <div className="border-t border-slate-400 pt-1 text-center font-bold text-slate-700 text-[10px]">
                        <span className="block font-black text-slate-900 text-[10px] min-h-[16px] truncate">
                          {currentBackupRender.sheet.supervisor || "Supervisor de Obra"}
                        </span>
                        <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                          PREPARADO Y AUTORIZADO POR (SUPERVISOR / INGENIERO DE OBRA)
                        </span>
                      </div>
                      <div className="border-t border-slate-400 pt-1 text-center font-bold text-slate-700 text-[10px]">
                        <span className="block font-black text-slate-900 text-[10px] min-h-[16px] truncate">
                          {currentBackupRender.contractorName}
                        </span>
                        <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                          Cédula: {currentBackupRender.contractorDoc}
                        </span>
                        <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                          APROBADO POR (CONTRATISTA)
                        </span>
                      </div>
                    </div>
                    <div className="w-1/2 mx-auto mt-6 space-y-1 border-t border-slate-400 pt-1 text-center font-sans">
                      <span className="block font-black text-slate-700 text-[10px] min-h-[16px]">
                        CONTROL INTERNO
                      </span>
                      <span className="block text-[8px] text-slate-400 font-bold uppercase tracking-wider">
                        AUDITORÍA Y FISCALIZACIÓN
                      </span>
                    </div>
                  </div>

                  {/* Calculations Summary */}
                  <div className="col-span-2 space-y-2 text-xs font-sans text-slate-700 bg-slate-50/70 border border-slate-200/50 p-4 rounded-xl">
                    <div className="flex justify-between items-center text-slate-800">
                      <span>Total Bruto:</span>
                      <span className="font-mono font-bold">
                        {formatCurrencyValue(currentBackupRender.subtotal, currentBackupRender.params.currency)}
                      </span>
                    </div>

                    {currentBackupRender.isr > 0 && (
                      <div className="flex justify-between items-center text-slate-800">
                        <span>Deducción Retención ISR:</span>
                        <span className="font-mono font-bold text-red-700">
                          -{formatCurrencyValue(currentBackupRender.isr, currentBackupRender.params.currency)}
                        </span>
                      </div>
                    )}

                    {currentBackupRender.tss > 0 && (
                      <div className="flex justify-between items-center text-slate-800">
                        <span>Deducción Retención TSS:</span>
                        <span className="font-mono font-bold text-red-700">
                          -{formatCurrencyValue(currentBackupRender.tss, currentBackupRender.params.currency)}
                        </span>
                      </div>
                    )}

                    {currentBackupRender.pension > 0 && (
                      <div className="flex justify-between items-center text-slate-800">
                        <span>Deducción FOPETCONS:</span>
                        <span className="font-mono font-bold text-red-700">
                          -{formatCurrencyValue(currentBackupRender.pension, currentBackupRender.params.currency)}
                        </span>
                      </div>
                    )}

                    {currentBackupRender.warranty > 0 && (
                      <div className="flex justify-between items-center text-slate-800">
                        <span>Retención de Garantía:</span>
                        <span className="font-mono font-bold text-red-700">
                          -{formatCurrencyValue(currentBackupRender.warranty, currentBackupRender.params.currency)}
                        </span>
                      </div>
                    )}

                    {currentBackupRender.discount1 > 0 && (
                      <div className="flex justify-between items-center text-slate-800">
                        <span>{currentBackupRender.discount1Label}:</span>
                        <span className="font-mono font-bold text-red-700">
                          -{formatCurrencyValue(currentBackupRender.discount1, currentBackupRender.params.currency)}
                        </span>
                      </div>
                    )}

                    {currentBackupRender.discount2 > 0 && (
                      <div className="flex justify-between items-center text-slate-800">
                        <span>{currentBackupRender.discount2Label}:</span>
                        <span className="font-mono font-bold text-red-700">
                          -{formatCurrencyValue(currentBackupRender.discount2, currentBackupRender.params.currency)}
                        </span>
                      </div>
                    )}

                    {currentBackupRender.itbis > 0 && (
                      <div className="flex justify-between items-center text-slate-900 font-semibold border-t border-slate-200 pt-1">
                        <span>ITBIS ({currentBackupRender.itbisRate}%):</span>
                        <span className="font-mono font-bold text-emerald-700">
                          +{formatCurrencyValue(currentBackupRender.itbis, currentBackupRender.params.currency)}
                        </span>
                      </div>
                    )}

                    <div className="border-t border-slate-300 pt-2 flex justify-between items-center font-sans mt-2">
                      <span className="text-[10px] text-slate-900 uppercase font-bold">NETO A PAGAR:</span>
                      <span className="text-black text-sm font-black font-mono">
                        {formatCurrencyValue(currentBackupRender.netPayable, currentBackupRender.params.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PAGE 2: COPIA CONTRATISTA */}
              <div 
                id="auto-backup-pdf-render-root-contractor"
                className="bg-white p-8 border border-slate-150 flex flex-col space-y-6 w-[852px]"
              >
                {/* Header */}
                <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5">
                  <div className="space-y-1">
                    <h1 className="text-xl font-black text-slate-955 tracking-tight uppercase font-sans">
                      COMPROBANTE DE LIQUIDACIÓN Y PAGO
                    </h1>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">
                      DOCUMENTO DE CONTROL DE TRABAJOS EJECUTADOS
                    </p>
                  </div>

                  <div className="bg-slate-50 p-4 border border-slate-200 rounded-lg text-xs space-y-1 text-slate-700 font-sans min-w-[245px]">
                    <div className="text-[10px] font-bold uppercase text-slate-650 tracking-wider font-mono mb-2 border-b border-slate-250 pb-1">
                      Información del Registro
                    </div>
                    <div>
                      <strong>Nro. Documento:</strong>{" "}
                      <span className="font-mono text-slate-900 font-bold">
                        CUB-{currentBackupRender.sheet.code.toUpperCase()}-{currentBackupRender.report.id.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <strong>Fecha de Emisión:</strong>{" "}
                      <span className="font-medium text-slate-900">
                        {new Date().toLocaleDateString("es-DO", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div>
                      <strong>Moneda:</strong>{" "}
                      <span className="font-mono text-slate-900 font-bold">
                        {currentBackupRender.params.currency || "DOP"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contractor & Project Info block */}
                <div className="grid grid-cols-2 gap-4 text-xs font-sans text-slate-700 border-b border-slate-205 pb-5">
                  <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-lg border border-slate-250">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Datos del Beneficiario / Contratista
                    </div>
                    <div>
                      <strong>Nombre del Ingeniero/Obrador:</strong>{" "}
                      <span className="text-slate-900 font-black">
                        {currentBackupRender.contractorName}
                      </span>
                    </div>
                    <div>
                      <strong>RNC / Cédula Identidad:</strong>{" "}
                      <span className="font-mono text-slate-900 font-bold">
                        {currentBackupRender.contractorDoc}
                      </span>
                    </div>
                    <div>
                      <strong>Teléfono de Contacto:</strong>{" "}
                      <span className="font-mono text-slate-900 font-bold">
                        {currentBackupRender.contractorPhone}
                      </span>
                    </div>
                    <div>
                      <strong>Tipo Contratista:</strong>{" "}
                      <span className="font-medium text-slate-800">
                        {currentBackupRender.contractorType}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-lg border border-slate-250">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                      Datos del Proyecto / Obra
                    </div>
                    <div>
                      <strong>Empresa Constructora:</strong>{" "}
                      <span className="text-slate-900 font-bold">
                        {currentBackupRender.params.companyName || "Nóminas y Obras - Mares"}
                      </span>
                    </div>
                    <div>
                      <strong>Proyecto / Obra activa:</strong>{" "}
                      <span className="text-slate-900 font-black">
                        {currentBackupRender.params.projectName || "Obra General"}
                      </span>
                    </div>
                    <div>
                      <strong>Ubicación de Obra:</strong>{" "}
                      <span className="text-slate-800">
                        {currentBackupRender.params.address}
                      </span>
                    </div>
                    <div>
                      <strong>Responsable de Obra:</strong>{" "}
                      <span className="font-medium text-slate-900">
                        {currentBackupRender.params.responsible || "Ingeniero de Obra"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Period range */}
                <div className="flex justify-between items-center bg-slate-50 border border-slate-200/60 p-3 rounded-lg text-xs text-slate-700">
                  <div>
                    <strong>Periodo del Reporte:</strong> Desde{" "}
                    <strong className="text-slate-950">
                      {formatDateReadable(currentBackupRender.report.dateFrom)}
                    </strong>{" "}
                    Hasta{" "}
                    <strong className="text-slate-950">
                      {formatDateReadable(currentBackupRender.report.dateTo)}
                    </strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 font-mono bg-emerald-50 px-2.5 py-1 rounded border border-emerald-100 font-bold">
                      {currentBackupRender.report.name} (CONTRATISTA)
                    </span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead>
                      <tr className="bg-slate-105 text-slate-800 uppercase tracking-wider font-bold border-b border-slate-200">
                        <th className="px-2 py-2 text-center w-10">#</th>
                        <th className="px-2 py-2 w-32">Subcapítulo</th>
                        <th className="px-3 py-2">Partida / Descripción del Trabajo</th>
                        <th className="px-2 py-2 text-center w-12">Unid.</th>
                        <th className="px-2 py-2 text-right w-24">Precio Unid.</th>
                        <th className="px-2 py-2 text-center w-16">Cant.</th>
                        <th className="px-2 py-2 text-right w-24">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {currentBackupRender.printableVoucherRows.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="text-center py-6 text-slate-400 italic">
                            No se registraron partidas con cantidades aprobadas mayores a cero en este corte.
                          </td>
                        </tr>
                      ) : (
                        currentBackupRender.printableVoucherRows.map((r: any, idx: number) => {
                          const currentSub = r.subchapter || "Obra Civil";
                          const prevSub = idx > 0 ? currentBackupRender.printableVoucherRows[idx - 1].subchapter || "Obra Civil" : null;
                          const isRepetitive = idx > 0 && currentSub === prevSub;

                          return (
                            <tr key={r.id || idx} className="hover:bg-slate-50/50">
                              <td className="px-2 py-1.5 text-center font-mono font-bold text-slate-700">{idx + 1}</td>
                              <td className="px-2 py-1.5 font-bold text-slate-600 break-words whitespace-normal">
                                {isRepetitive ? (
                                  <span className="text-slate-400 font-black text-sm block text-center select-none leading-none">"</span>
                                ) : (
                                  currentSub
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-slate-800 font-medium">{r.description}</td>
                              <td className="px-2 py-1.5 text-center font-mono text-slate-600">{r.unit}</td>
                              <td className="px-2 py-1.5 text-right font-mono text-slate-700">
                                {formatCurrencyValue(r.priceUnit, currentBackupRender.params.currency)}
                              </td>
                              <td className="px-2 py-1.5 text-center font-mono font-bold text-slate-900">{r.qty}</td>
                              <td className="px-2 py-1.5 text-right font-mono font-bold text-slate-900">
                                {formatCurrencyValue(r.grossValue, currentBackupRender.params.currency)}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Footer Billing Details block with single signature */}
                <div className="grid grid-cols-5 gap-6 pt-2 font-sans">
                  <div className="col-span-3 border border-slate-200 p-4 rounded-xl flex flex-col justify-between text-xs text-slate-500 bg-slate-50/20">
                    <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider font-mono">
                      Declaraciones y Firmas de Autorización - Copia Contratista
                    </span>
                    <p className="leading-relaxed mt-2 text-[10px]">
                      El contratista declara bajo fe de juramento que ha ejecutado a entera satisfacción los trabajos enlistados, y la supervisión de obra convalida la cubicación y los montos de retención estipulados de conformidad con las políticas de fomento obrero y de garantía de obra de la constructora.
                    </p>
                    <div className="flex justify-center pt-6">
                      <div className="w-2/3 space-y-1.5 border-t border-slate-400 pt-2 text-center">
                        <span className="block font-black text-slate-950 text-xs tracking-wide uppercase">
                          {currentBackupRender.contractorName}
                        </span>
                        <span className="block text-[10px] text-slate-500 font-mono font-bold uppercase">
                          CÉDULA / RNC: {currentBackupRender.contractorDoc}
                        </span>
                        <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                          FIRMA DEL CONTRATISTA
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Calculations Summary */}
                  <div className="col-span-2 space-y-2 text-xs font-sans text-slate-700 bg-slate-50/70 border border-slate-200/50 p-4 rounded-xl">
                    <div className="flex justify-between items-center text-slate-850">
                      <span>Total Bruto:</span>
                      <span className="font-mono font-bold">
                        {formatCurrencyValue(currentBackupRender.subtotal, currentBackupRender.params.currency)}
                      </span>
                    </div>

                    {currentBackupRender.isr > 0 && (
                      <div className="flex justify-between items-center text-slate-800">
                        <span>Deducción Retención ISR:</span>
                        <span className="font-mono font-bold text-red-700">
                          -{formatCurrencyValue(currentBackupRender.isr, currentBackupRender.params.currency)}
                        </span>
                      </div>
                    )}

                    {currentBackupRender.tss > 0 && (
                      <div className="flex justify-between items-center text-slate-800">
                        <span>Deducción Retención TSS:</span>
                        <span className="font-mono font-bold text-red-700">
                          -{formatCurrencyValue(currentBackupRender.tss, currentBackupRender.params.currency)}
                        </span>
                      </div>
                    )}

                    {currentBackupRender.pension > 0 && (
                      <div className="flex justify-between items-center text-slate-800">
                        <span>Deducción FOPETCONS:</span>
                        <span className="font-mono font-bold text-red-700">
                          -{formatCurrencyValue(currentBackupRender.pension, currentBackupRender.params.currency)}
                        </span>
                      </div>
                    )}

                    {currentBackupRender.warranty > 0 && (
                      <div className="flex justify-between items-center text-slate-800">
                        <span>Retención de Garantía:</span>
                        <span className="font-mono font-bold text-red-700">
                          -{formatCurrencyValue(currentBackupRender.warranty, currentBackupRender.params.currency)}
                        </span>
                      </div>
                    )}

                    {currentBackupRender.discount1 > 0 && (
                      <div className="flex justify-between items-center text-slate-800">
                        <span>{currentBackupRender.discount1Label}:</span>
                        <span className="font-mono font-bold text-red-700">
                          -{formatCurrencyValue(currentBackupRender.discount1, currentBackupRender.params.currency)}
                        </span>
                      </div>
                    )}

                    {currentBackupRender.discount2 > 0 && (
                      <div className="flex justify-between items-center text-slate-800">
                        <span>{currentBackupRender.discount2Label}:</span>
                        <span className="font-mono font-bold text-red-700">
                          -{formatCurrencyValue(currentBackupRender.discount2, currentBackupRender.params.currency)}
                        </span>
                      </div>
                    )}

                    {currentBackupRender.itbis > 0 && (
                      <div className="flex justify-between items-center text-slate-900 font-semibold border-t border-slate-200 pt-1">
                        <span>ITBIS ({currentBackupRender.itbisRate}%):</span>
                        <span className="font-mono font-bold text-emerald-700">
                          +{formatCurrencyValue(currentBackupRender.itbis, currentBackupRender.params.currency)}
                        </span>
                      </div>
                    )}

                    <div className="border-t border-slate-300 pt-2 flex justify-between items-center font-sans mt-2">
                      <span className="text-[10px] text-slate-900 uppercase font-bold">NETO A PAGAR:</span>
                      <span className="text-black text-sm font-black font-mono">
                        {formatCurrencyValue(currentBackupRender.netPayable, currentBackupRender.params.currency)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PAGE 3: SOPORTE DE MEDICIÓN - ADJUNTO EN RESPALDO AUTOMÁTCO */}
              {currentBackupRender.printableVoucherRows.some((r: any) => currentBackupRender.report.formulas?.[r.id] || currentBackupRender.report.grids?.[r.id]) && (
                <div 
                  id="auto-backup-pdf-render-root-support"
                  className="bg-white p-8 border border-slate-150 flex flex-col space-y-6 w-[852px]"
                >
                  <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5">
                    <div className="flex items-center gap-4">
                      {currentBackupRender.params.companyLogo && (
                        <img 
                          src={currentBackupRender.params.companyLogo} 
                          alt="Logo Empresa" 
                          className="h-14 w-auto object-contain max-w-[170px]"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div className="space-y-1">
                        <h1 className="text-xl font-black text-slate-955 tracking-tight uppercase font-sans">
                          {currentBackupRender.params.companyName || "Constructora Alba & Sánchez S.R.L."}
                        </h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">
                          SOPORTE DE MEDICIÓN Y CÓMPUTOS MÉTRICOS (RESPALDO AUTOMÁTICO)
                        </p>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-500 font-mono font-bold">
                      <div><strong>DOCUMENTO:</strong> CUB-{currentBackupRender.sheet.code.toUpperCase()}-{currentBackupRender.report.id.toUpperCase()}</div>
                      <div><strong>FECHA RESPALDO:</strong> {new Date().toLocaleDateString("es-DO")}</div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-[10px] grid grid-cols-2 gap-4 font-sans text-slate-700">
                    <div>
                      <strong>CONTRATISTA / BENEFICIARIO:</strong> {currentBackupRender.contractorName} ({currentBackupRender.contractorDoc})
                    </div>
                    <div className="text-right font-semibold">
                      <strong>SUPERVISOR DE OBRA:</strong> {currentBackupRender.sheet.supervisor || "Ingeniero Supervisor"}
                    </div>
                  </div>

                  <div className="space-y-6">
                    {currentBackupRender.printableVoucherRows.map((rInfo: any) => {
                      const formula = currentBackupRender.report.formulas?.[rInfo.id];
                      const gridJson = currentBackupRender.report.grids?.[rInfo.id];
                      if (!formula && !gridJson) return null;

                      return (
                        <div key={`backup-separate-support-${rInfo.id}`} className="border border-slate-350 rounded overflow-hidden text-slate-800 bg-white shadow-xs">
                          <div className="bg-slate-100/90 px-3 py-1.5 border-b border-slate-300 flex justify-between items-center">
                            <div className="flex items-center gap-1.5">
                               <span className="text-[10px] font-black text-slate-900">
                                  [{rInfo.no}] {rInfo.description}
                               </span>
                               <span className="text-[9px] font-mono bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-bold">
                                  Unidad: {rInfo.unit || "N/A"}
                               </span>
                            </div>
                            <div className="flex items-center gap-3">
                               <span className="text-[10px] font-extrabold text-slate-900 bg-amber-100 border border-amber-200 px-2 py-0.5 rounded font-mono">
                                  Cantidad Medida: {currentBackupRender.report.quantities?.[rInfo.id] || 0}
                               </span>
                            </div>
                          </div>
                          
                          <div className="p-3 space-y-3">
                            {formula && (
                               <div className="text-[10px] font-mono flex items-center gap-2 font-bold">
                                  <span className="text-slate-550">Fórmula de Apoyo:</span>
                                  <span className="text-amber-805 bg-amber-100/40 px-2 py-0.5 rounded border border-amber-200/60">
                                    {formula}
                                  </span>
                               </div>
                            )}
                            
                            {gridJson && (
                               <div className="border border-slate-200 rounded overflow-hidden bg-white max-w-full overflow-x-auto">
                                  <MeasurementGrid 
                                    initialData={gridJson}
                                    isReadOnly={true}
                                    onChange={() => {}}
                                    uiColor="emerald"
                                    key={`backup-grid-separate-${rInfo.id}`}
                                  />
                               </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
