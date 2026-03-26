/**
 * Client-side file upload utilities.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1';

export interface UploadProgress {
  fileId: string;
  fileName: string;
  progress: number;
  status: 'uploading' | 'processing' | 'complete' | 'error';
  error?: string;
}

export interface UploadResult {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  status: string;
  createdAt: string;
}

export async function uploadFile(
  file: File,
  conversationId?: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const fileId = `upload-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  onProgress?.({
    fileId,
    fileName: file.name,
    progress: 0,
    status: 'uploading',
  });

  const formData = new FormData();
  formData.append('file', file);
  if (conversationId) {
    formData.append('conversationId', conversationId);
  }

  const response = await fetch(`${API_BASE}/files/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.text();
    onProgress?.({
      fileId,
      fileName: file.name,
      progress: 0,
      status: 'error',
      error: error || 'Upload failed',
    });
    throw new Error(error || 'Upload failed');
  }

  onProgress?.({
    fileId,
    fileName: file.name,
    progress: 100,
    status: 'processing',
  });

  const result: UploadResult = await response.json();

  onProgress?.({
    fileId,
    fileName: file.name,
    progress: 100,
    status: 'complete',
  });

  return result;
}

export function validateFile(file: File): { valid: boolean; error?: string } {
  const maxSize = parseInt(process.env.NEXT_PUBLIC_MAX_UPLOAD_MB || '50', 10) * 1024 * 1024;

  if (file.size > maxSize) {
    return { valid: false, error: `File too large. Maximum size: ${maxSize / 1024 / 1024}MB` };
  }

  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'text/markdown',
    'text/csv',
    'text/html',
    'text/xml',
    'application/json',
    'application/xml',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'application/zip',
  ];

  const allowedExtensions = [
    '.pdf', '.docx', '.xlsx', '.csv', '.txt', '.md',
    '.json', '.html', '.xml', '.png', '.jpg', '.jpeg',
    '.gif', '.webp', '.zip', '.py', '.js', '.ts',
    '.tsx', '.jsx', '.go', '.rs', '.java', '.c', '.cpp',
  ];

  const ext = '.' + file.name.split('.').pop()?.toLowerCase();
  const typeOk = allowedTypes.includes(file.type);
  const extOk = allowedExtensions.includes(ext);

  if (!typeOk && !extOk) {
    return { valid: false, error: `Unsupported file type: ${file.type || ext}` };
  }

  return { valid: true };
}
