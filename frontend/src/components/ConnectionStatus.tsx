import React, { useState, useRef, useEffect } from 'react';
import { useConnection } from '../context/ConnectionContext';
import { RefreshCw, Server, Layers, WifiOff, CheckCircle2, ChevronDown, Globe, Edit2, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export const ConnectionStatus: React.FC = () => {
  const { isOnline, isChecking, healthData, latencyMs, lastChecked, apiUrl, checkConnection, updateApiUrl } = useConnection();
  const [isOpen, setIsOpen] = useState(false);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const [inputUrl, setInputUrl] = useState(apiUrl);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setInputUrl(apiUrl);
  }, [apiUrl]);

  const handleSaveUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;
    await updateApiUrl(inputUrl.trim());
    setIsEditingUrl(false);
  };

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsEditingUrl(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative" ref={popoverRef}>
      {/* Sleek, corporate trigger badge */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-7 px-2.5 flex items-center gap-2 rounded-md text-[11px] font-medium transition-colors cursor-pointer border select-none whitespace-nowrap shrink-0",
          isOnline === true &&
            "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/25 hover:bg-emerald-500/15",
          isOnline === false &&
            "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/25 hover:bg-rose-500/15",
          isOnline === null &&
            "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20 hover:bg-slate-500/15"
        )}
        title="Klik untuk melihat status koneksi sistem"
      >
        {/* Status Dot */}
        {isOnline === true && (
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0"></span>
        )}
        {isOnline === false && (
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0"></span>
        )}
        {isOnline === null && (
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0"></span>
        )}

        {/* Status Label */}
        <span className="leading-none">
          {isOnline === true && "Server Terhubung"}
          {isOnline === false && "Server Terputus"}
          {isOnline === null && "Memeriksa..."}
        </span>

        <ChevronDown
          className={cn(
            "w-3 h-3 opacity-50 shrink-0 transition-transform duration-200",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Popover Details */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 sm:w-80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-4 text-xs animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-200">
              <Server className="w-4 h-4 text-primary" />
              <span>Status Koneksi Sistem</span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                checkConnection();
              }}
              disabled={isChecking}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
              title="Periksa ulang koneksi"
            >
              <RefreshCw
                className={cn("w-3.5 h-3.5", isChecking && "animate-spin text-primary")}
              />
            </button>
          </div>

          {/* Details List */}
          <div className="py-3 space-y-2.5">
            {/* Backend Server Status */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5 opacity-70" />
                Server Aplikasi
              </span>
              <span
                className={cn(
                  "font-medium flex items-center gap-1",
                  isOnline ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                )}
              >
                {isOnline ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Terhubung
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5" />
                    Terputus
                  </>
                )}
              </span>
            </div>

            {/* Document Processing Engine */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-500 opacity-80" />
                Layanan Ekstraksi & Data
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {isOnline && healthData?.ai_configured ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Siap Operasi
                  </span>
                ) : isOnline ? (
                  <span className="text-amber-600 dark:text-amber-400">Konfigurasi Belum Lengkap</span>
                ) : (
                  <span className="text-slate-400">Tidak Tersedia</span>
                )}
              </span>
            </div>

            {/* Latency */}
            {isOnline && latencyMs !== null && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Waktu Respon</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {latencyMs} ms
                </span>
              </div>
            )}

            {/* Last Checked */}
            {lastChecked && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Sinkronisasi Terakhir</span>
                <span>{lastChecked.toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          {/* Action / Helper Info */}
          {isOnline === false && (
            <div className="mt-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[11px] text-rose-700 dark:text-rose-300 space-y-1.5">
              <p className="font-medium leading-snug">
                Layanan backend tidak terhubung.
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Pastikan server aktif atau sesuaikan URL API di bawah:
              </p>
              <code className="block bg-rose-100/70 dark:bg-rose-900/60 px-2 py-1 rounded text-[10px] font-mono select-all">
                ./start_public_server.sh
              </code>
            </div>
          )}

          {/* API Server Endpoint configuration */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                <Globe className="w-3.5 h-3.5 text-slate-400" />
                Alamat Backend API
              </span>
              {!isEditingUrl ? (
                <button
                  type="button"
                  onClick={() => setIsEditingUrl(true)}
                  className="text-primary hover:underline text-[10px] flex items-center gap-1 cursor-pointer font-medium"
                >
                  <Edit2 className="w-2.5 h-2.5" />
                  Ubah
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingUrl(false);
                    setInputUrl(apiUrl);
                  }}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px] cursor-pointer"
                >
                  Batal
                </button>
              )}
            </div>

            {isEditingUrl ? (
              <form onSubmit={handleSaveUrl} className="space-y-1.5">
                <div className="flex gap-1.5">
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://...trycloudflare.com"
                    required
                    className="flex-1 min-w-0 px-2 py-1 text-[11px] font-mono rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    disabled={isChecking}
                    className="px-2.5 py-1 text-[11px] font-medium rounded-md bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    Simpan
                  </button>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Tempel URL Cloudflare tunnel terbaru jika server di-restart.
                </p>
              </form>
            ) : (
              <div
                onClick={() => setIsEditingUrl(true)}
                title="Klik untuk mengubah URL server API"
                className="px-2 py-1 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-300 truncate cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                {apiUrl}
              </div>
            )}
          </div>

          {/* Re-check Button */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => checkConnection()}
              disabled={isChecking}
              className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer"
            >
              <RefreshCw
                className={cn("w-3.5 h-3.5", isChecking && "animate-spin text-primary")}
              />
              <span>{isChecking ? 'Memeriksa...' : 'Periksa Koneksi Sistem'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
