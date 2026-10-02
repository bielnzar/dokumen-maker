import axios from 'axios';
import type { ExtractedData, UploadResponse, GenerateResponse, UploadProgress } from '../types';

export interface HealthStatus {
  status: string;
  ai_model?: string;
  ai_configured?: boolean;
  app_title?: string;
  version?: string;
}

const getDefaultBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('dokumen_maker_api_url');
    // Otomatis bersihkan cache ngrok / cloudflare lama dari localStorage browser
    if (saved && (saved.includes('ngrok') || saved.includes('trycloudflare') || saved.includes('http://') || saved.includes('https://'))) {
      localStorage.removeItem('dokumen_maker_api_url');
    } else if (saved && saved.trim()) {
      return saved.trim().replace(/\/+$/, '');
    }
  }
  // Default string kosong: request selalu relatif same-origin (/api/..., /health)
  // Ditangani secara aman oleh Vite proxy di dev atau Nginx di production VPS
  return import.meta.env.VITE_API_BASE_URL || '';
};

let currentBaseUrl = getDefaultBaseUrl();

const api = axios.create({
  baseURL: currentBaseUrl || undefined,
  headers: {
    'Content-Type': 'application/json',
  },
});

// API Functions
export const apiService = {
  async uploadPDF(file: File): Promise<{ file_id: string; message: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post<{ file_id: string; message: string }>('/api/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  subscribeToProgress(fileId: string, onProgress: (progress: UploadProgress) => void): () => void {
    let isActive = true;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const checkProgress = async () => {
      if (!isActive) return;
      try {
        const response = await api.get<UploadProgress>(`/api/upload/status/${fileId}`);
        if (!isActive) return;
        const data = response.data;
        if (data && data.status) {
          onProgress(data);
          if (data.status === 'completed' || data.status === 'error') {
            isActive = false;
            if (pollInterval) clearInterval(pollInterval);
          }
        }
      } catch (err) {
        console.warn('Gagal mengambil status proses:', err);
      }
    };

    // First check immediately
    checkProgress();
    // Poll every 800ms
    pollInterval = setInterval(checkProgress, 800);

    return () => {
      isActive = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  },

  async getUploadResult(fileId: string): Promise<UploadResponse> {
    const response = await api.post<UploadResponse>(`/api/upload/result/${fileId}`);
    return response.data;
  },

  async generateDocuments(data: ExtractedData): Promise<GenerateResponse> {
    const response = await api.post<GenerateResponse>('/api/generate', data);
    return response.data;
  },

  async previewDocuments(data: ExtractedData): Promise<{ rab: string; rks: string }> {
    const response = await api.post<{ rab: string; rks: string }>('/api/preview', data);
    return response.data;
  },

  getBaseURL(): string {
    return currentBaseUrl;
  },

  setBaseURL(newUrl: string): void {
    const cleaned = newUrl.trim().replace(/\/+$/, '');
    currentBaseUrl = cleaned;
    api.defaults.baseURL = cleaned || undefined;
    if (typeof window !== 'undefined') {
      if (cleaned) {
        localStorage.setItem('dokumen_maker_api_url', cleaned);
      } else {
        localStorage.removeItem('dokumen_maker_api_url');
      }
    }
  },

  getDownloadURL(filename: string): string {
    const base = currentBaseUrl ? `${currentBaseUrl}` : '';
    return `${base}/api/download/${filename}`;
  },

  async downloadFile(filename: string): Promise<Blob> {
    const response = await api.get(`/api/download/${filename}`, {
      responseType: 'blob',
    });
    return response.data;
  },

  async getDocumentTypes(): Promise<{ document_types: string[]; default: string }> {
    const response = await api.get('/api/document-types');
    return response.data;
  },

  async healthCheck(): Promise<HealthStatus> {
    const response = await api.get<HealthStatus>('/health');
    return response.data;
  },

  async regeneratePasal2(data: {
    file_id: string;
    lhp_text: string;
    document_type: string;
    custom_pasal2_prompt?: string;
    jumlah_kegiatan?: number;
  }): Promise<{ work_activities: string[] }> {
    const response = await api.post<{ work_activities: string[] }>('/api/regenerate-pasal2', data);
    return response.data;
  },
};

export default apiService;
