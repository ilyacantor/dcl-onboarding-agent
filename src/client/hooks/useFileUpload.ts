import { useState, useCallback } from 'react';

export interface PendingFile {
  file: File;
  base64: string;
  preview?: string;
}

export interface UseFileUploadReturn {
  pendingFiles: PendingFile[];
  processing: boolean;
  addFiles: (files: FileList | File[]) => Promise<void>;
  removeFile: (index: number) => void;
  clearFiles: () => void;
  getFilesForWS: () => { filename: string; mime_type: string; data: string }[];
}

const ACCEPTED_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip the data URL prefix to get raw base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function useFileUpload(): UseFileUploadReturn {
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [processing, setProcessing] = useState(false);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    setProcessing(true);
    const newFiles: PendingFile[] = [];

    for (const file of Array.from(files)) {
      if (!ACCEPTED_TYPES.has(file.type)) continue;

      const base64 = await fileToBase64(file);
      const preview = file.type.startsWith('image/')
        ? URL.createObjectURL(file)
        : undefined;

      newFiles.push({ file, base64, preview });
    }

    setPendingFiles((prev) => [...prev, ...newFiles]);
    setProcessing(false);
  }, []);

  const removeFile = useCallback((index: number) => {
    setPendingFiles((prev) => {
      const file = prev[index];
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const clearFiles = useCallback(() => {
    setPendingFiles((prev) => {
      prev.forEach((f) => f.preview && URL.revokeObjectURL(f.preview));
      return [];
    });
  }, []);

  const getFilesForWS = useCallback(() => {
    return pendingFiles.map((pf) => ({
      filename: pf.file.name,
      mime_type: pf.file.type,
      data: pf.base64,
    }));
  }, [pendingFiles]);

  return { pendingFiles, processing, addFiles, removeFile, clearFiles, getFilesForWS };
}
