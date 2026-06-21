import { Project, Contractor, GeneralPriceGuide } from './types';
import { getAccessToken } from './googleAuth';

const getGoogleFolderId = (): string => {
  const googleFolderUrl = localStorage.getItem("mares_google_folder_url") || "";
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

const folderIdCache: Record<string, string> = {};

const getOrCreateSharedFolder = async (accessToken: string, folderName: string): Promise<string> => {
  return getGoogleFolderId();
};

const getOrCreateProjectFolder = async (accessToken: string, parentId: string, projectName: string): Promise<string> => {
  const cacheKey = `${parentId}_${projectName}`;
  if (folderIdCache[cacheKey]) return folderIdCache[cacheKey];

  try {
    const searchRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`name='${projectName}' and mimeType='application/vnd.google-apps.folder' and trashed=false and '${parentId}' in parents`)}&fields=files(id,name)&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (searchRes.ok) {
      const data = await searchRes.json();
      if (data.files && data.files.length > 0) {
        folderIdCache[cacheKey] = data.files[0].id;
        return data.files[0].id;
      }
    }

    const metadata = {
      name: projectName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId]
    };

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(metadata)
    });

    if (createRes.ok) {
      const createData = await createRes.json();
      folderIdCache[cacheKey] = createData.id;
      return createData.id;
    }
    
    // Default fallback
    return parentId;
  } catch (err) {
    console.error("Folder creation error", err);
    return parentId;
  }
};

export const autoBackupToDrive = async (
  projects: Project[],
  contractors: Contractor[],
  generalPriceGuide: GeneralPriceGuide,
  activeProjectId: string | null
) => {
  const token = await getAccessToken();
  if (!token) {
    console.warn("No token available. Skip auto drive backup.");
    return;
  }

  try {
    const activeProject = projects.find(p => p.id === activeProjectId) || projects[0];
    const params = activeProject ? activeProject.params : { projectName: 'Proyecto' };
    const projectNameStr = (params.projectName || activeProject?.name || "Obra General").trim();
    const safeProjectName = projectNameStr.replace(/[^a-zA-Z0-9áéíóúÁÉÍÓÚñÑ_ -]/g, '').trim().replace(/\s+/g, '_');
    
    // We name it BaseDatos_Mares_<PROJ_NAME>.json
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const jsonFilename = `Respaldo_Automatico_Mares_${safeProjectName}.json`;

    const backupWrapper = {
      appIdentifier: "MaresNominas",
      version: "3.2",
      backupDate: new Date().toISOString(),
      description: `Copia de seguridad automática de la obra ${projectNameStr}`,
      payload: {
        projects,
        contractors,
        generalPriceGuide,
        includeItbisInNet: true 
      }
    };

    const jsonBlob = new Blob([JSON.stringify(backupWrapper, null, 2)], { type: 'application/json' });

    // Resolve parent folder
    const sharedFolderId = await getOrCreateSharedFolder(token, "NOMINAS MARES");
    const projectFolderId = await getOrCreateProjectFolder(token, sharedFolderId, projectNameStr);

    // Delete existing 'Respaldo_Automatico_Mares' files in the project folder to save space
    try {
      const jsonSearchRes = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(`'${projectFolderId}' in parents and trashed = false and name contains 'Respaldo_Automatico_Mares_' and mimeType = 'application/json'`)}&fields=files(id)&pageSize=100&corpora=allDrives&supportsAllDrives=true&includeItemsFromAllDrives=true`,
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

    const metadata = {
      name: jsonFilename,
      mimeType: 'application/json',
      parents: [projectFolderId]
    };

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', jsonBlob);

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!uploadRes.ok) {
      console.warn("Error uploading automatic backup to Google Drive", await uploadRes.text());
    } else {
      console.log("Automatic Google Drive backup successful", jsonFilename);
    }

  } catch (e) {
    console.error("Auto Backup To Drive Exception", e);
  }
};
