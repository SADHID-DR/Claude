import { get, set } from 'idb-keyval';

interface PendingUpload {
  type: 'projectLogo' | 'agreementFile' | 'priceGuide';
  uid: string;
  id?: string; // projectId or contractorId
  subId?: string; // agreementId
  base64Data: string;
}

const PENDING_UPLOADS_KEY = 'nom_construction_pending_uploads';

export const savePendingUpload = async (upload: PendingUpload) => {
  const pending: PendingUpload[] = await get(PENDING_UPLOADS_KEY) || [];
  pending.push(upload);
  await set(PENDING_UPLOADS_KEY, pending);
};

export const processPendingUploads = async (uploadFunc: (upload: PendingUpload) => Promise<boolean>) => {
  const pending: PendingUpload[] = await get(PENDING_UPLOADS_KEY) || [];
  if (pending.length === 0) return;

  const stillPending: PendingUpload[] = [];
  for (const item of pending) {
    try {
      const success = await uploadFunc(item);
      if (!success) stillPending.push(item);
    } catch {
      stillPending.push(item);
    }
  }
  
  await set(PENDING_UPLOADS_KEY, stillPending);
};
