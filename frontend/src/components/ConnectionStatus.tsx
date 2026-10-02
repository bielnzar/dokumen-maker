import React, { useState, useRef, useEffect } from 'react';
import { useConnection } from '../context/ConnectionContext';
import { RefreshCw, Server, Layers, WifiOff, CheckCircle2, ChevronDown, ShieldCheck } from 'lucide-react';
import { cn } from '../lib/utils';

export const ConnectionStatus: React.FC = () => {
  const { isOnline, isChecking, healthData, latencyMs, lastChecked, checkConnection } = useConnection();
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
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
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 font-semibold text-slate-800 dark:text-slate-200">
            <Server className="w-4 h-4 text-primary" />
            <span>Status Koneksi Sistem</span>
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

          {/* Action / Helper Info when offline */}
          {isOnline === false && (
            <div className="mt-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[11px] text-rose-700 dark:text-rose-300 space-y-1.5">
              <p className="font-medium leading-snug">
                Layanan backend tidak terhubung.
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Pastikan backend aktif pada port 8090 (localhost) atau jalankan:
              </p>
              <code className="block bg-rose-100/70 dark:bg-rose-900/60 px-2 py-1 rounded text-[10px] font-mono select-all">
                ./run.sh
              </code>
            </div>
          )}

          {/* Architecture / Security Info (Read-Only Corporate Display) */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 font-medium">
                <ShieldCheck
                  className={cn(
                    "w-3.5 h-3.5",
                    isOnline === true && "text-emerald-500",
                    isOnline === false && "text-rose-500",
                    isOnline === null && "text-amber-500"
                  )}
                />
                Arsitektur Jaringan
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium px-2 py-0.5 rounded border",
                  isOnline === true &&
                    "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
                  isOnline === false &&
                    "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20",
                  isOnline === null &&
                    "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20"
                )}
              >
                {isOnline === true && "Internal Proxy (Aktif)"}
                {isOnline === false && "Internal Proxy (Offline)"}
                {isOnline === null && "Internal Proxy (Memeriksa...)"}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
              Backend terisolasi di jaringan internal server. Akses publik dienkripsi & dilindungi melalui Reverse Proxy.
            </p>
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
