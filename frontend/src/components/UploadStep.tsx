import React, { useState, useRef } from 'react';
import { apiService } from '../services/api';
import type { UploadResponse, UploadProgress } from '../types';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  FileCheck
} from 'lucide-react';
import { cn } from '../lib/utils';

interface UploadStepProps {
  onNext: (data: UploadResponse) => void;
}

export const UploadStep: React.FC<UploadStepProps> = ({ onNext }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const resultFetchedRef = useRef(false);

  const handleFileChange = (selectedFile: File | null) => {
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf' || selectedFile.name.toLowerCase().endsWith('.pdf')) {
        setFile(selectedFile);
        setError(null);
      } else {
        setError('Format berkas tidak sesuai. Harap pilih berkas PDF.');
      }
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setProgress(null);
    resultFetchedRef.current = false;

    try {
      const uploadResult = await apiService.uploadPDF(file);

      const cleanup = apiService.subscribeToProgress(uploadResult.file_id, (progressData) => {
        setProgress(progressData);

        if (progressData.status === 'completed' && !resultFetchedRef.current) {
          resultFetchedRef.current = true;
          apiService.getUploadResult(uploadResult.file_id).then((result) => {
            onNext(result);
            setLoading(false);
            cleanup();
          }).catch((err) => {
            setError(err.message || 'Gagal memuat hasil ekstraksi');
            setLoading(false);
            cleanup();
          });
        } else if (progressData.status === 'error') {
          setError(progressData.message || 'Terjadi kesalahan saat pemrosesan');
          setLoading(false);
          cleanup();
        }
      });

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unggah berkas gagal';
      setError(errorMessage);
      setLoading(false);
    }
  };

  const getOcrPercentage = () => {
    if (!progress || !progress.current_page || !progress.total_pages || progress.total_pages === 0) return 0;
    return Math.round((progress.current_page / progress.total_pages) * 100);
  };

  return (
    <div className="py-6 sm:py-10">
      <div className="max-w-2xl mx-auto bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/70 dark:border-slate-800 p-6 sm:p-10 shadow-xs space-y-7">
        {/* Title & Guidance */}
        <div className="space-y-1.5 text-center">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Unggah Laporan Hasil Pemeriksaan (LHP)
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
            Sistem mengekstraksi judul proyek, rincian biaya (RAB), dan spesifikasi teknis (RKS) dari berkas PDF LHP.
          </p>
        </div>

        {/* Drop Zone (Soft, natural surface without rigid harsh dashed boxes) */}
        <div
          className={cn(
            "relative rounded-xl p-8 sm:p-10 text-center transition-all duration-200 border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 hover:bg-slate-50 dark:hover:bg-slate-950/70 hover:border-slate-300 dark:hover:border-slate-700",
            dragActive && "border-primary bg-primary/5 ring-2 ring-primary/20",
            loading && "opacity-60 pointer-events-none"
          )}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
            disabled={loading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            id="pdf-upload"
          />

          {file ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <FileCheck className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm">
                  {file.name}
                </p>
                <p className="text-xs text-slate-400">
                  {(file.size / 1024 / 1024).toFixed(2)} MB • Berkas siap diproses
                </p>
              </div>
              {!loading && (
                <span className="text-xs text-primary font-medium hover:underline cursor-pointer">
                  Klik untuk mengganti berkas
                </span>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center">
                <UploadCloud className="w-6 h-6 stroke-[1.8]" />
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-medium text-slate-700 dark:text-slate-200">
                  <span className="text-primary font-semibold">Pilih berkas PDF</span> atau tarik berkas ke sini
                </p>
                <p className="text-xs text-slate-400">
                  Maksimal ukuran berkas 50 MB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Error Notice */}
        {error && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="flex-1 leading-relaxed">{error}</p>
          </div>
        )}

        {/* Structured Progress Display (Clean linear layout without rigid nested boxes) */}
        {loading && progress && (
          <div className="space-y-4 pt-3 border-t border-slate-100 dark:border-slate-800 text-left">
            {/* Stage 1 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  {progress.phase === 'ai' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  )}
                  Tahap 1: Pemindaian & Pembacaan Teks (OCR)
                </span>
                <span className="text-slate-500">
                  {progress.phase === 'ai' ? 'Selesai' : `${getOcrPercentage()}%`}
                </span>
              </div>
              <Progress
                value={progress.phase === 'ai' ? 100 : getOcrPercentage()}
                className="h-1.5"
              />
              {progress.phase === 'ocr' && progress.message && (
                <p className="text-[11px] text-slate-400">
                  {progress.message}
                </p>
              )}
            </div>

            {/* Stage 2 */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className={cn(
                  "flex items-center gap-2",
                  progress.phase === 'ai' ? "text-slate-800 dark:text-slate-200" : "text-slate-400"
                )}>
                  {progress.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  ) : progress.phase === 'ai' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[10px] text-slate-500">2</span>
                  )}
                  Tahap 2: Ekstraksi Data Spesifikasi Pekerjaan
                </span>
                <span className="text-slate-500">
                  {progress.status === 'completed' ? 'Selesai' : progress.phase === 'ai' ? `${progress.ai_progress || 0}%` : 'Menunggu'}
                </span>
              </div>
              <Progress
                value={progress.status === 'completed' ? 100 : (progress.phase === 'ai' ? (progress.ai_progress || 0) : 0)}
                className="h-1.5"
              />
              {progress.phase === 'ai' && (
                <p className="text-[11px] text-slate-400">
                  Menyusun item RAB, pasal spesifikasi teknis, dan jadwal pelaksanaan...
                </p>
              )}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={handleUpload}
          disabled={!file || loading}
          className="w-full h-11 text-xs sm:text-sm font-semibold shadow-xs"
          size="lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Memproses Dokumen...
            </>
          ) : (
            <>
              <FileText className="w-4 h-4 mr-2" />
              Mulai Ekstraksi Berkas
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
