import React, { useState, useRef, useEffect } from 'react';
import { useConnection } from '../context/ConnectionContext';
import { RefreshCw, Server, Sparkles, WifiOff, CheckCircle2, ChevronDown } from 'lucide-react';
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
      {/* Sleek, proportional trigger badge */}
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
        title="Klik untuk melihat status koneksi backend dan AI"
      >
        {/* Status Dot */}
        {isOnline === true && (
          <span className="relative flex h-1.5 w-1.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
          </span>
        )}
        {isOnline === false && (
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0"></span>
        )}
        {isOnline === null && (
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0 animate-pulse"></span>
        )}

        {/* Status Label */}
        <span className="leading-none">
          {isOnline === true && "AI & Server Aktif"}
          {isOnline === false && "Server Offline"}
          {isOnline === null && "Memeriksa..."}
        </span>

        {/* Latency if Online */}
        {isOnline === true && latencyMs !== null && (
          <span className="text-[10px] font-mono opacity-70 leading-none">
            {latencyMs}ms
          </span>
        )}

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
                Backend Server
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

            {/* AI Engine Status */}
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500 opacity-90" />
                Mesin AI Gemini
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {isOnline && healthData?.ai_configured ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {healthData.ai_model || 'Gemini Flash'} (Siap)
                  </span>
                ) : isOnline ? (
                  <span className="text-amber-600 dark:text-amber-400">API Key Belum Diisi</span>
                ) : (
                  <span className="text-slate-400">Tidak Tersedia</span>
                )}
              </span>
            </div>

            {/* Latency */}
            {isOnline && latencyMs !== null && (
              <div className="flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Respon Jaringan</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {latencyMs} ms
                </span>
              </div>
            )}

            {/* Last Checked */}
            {lastChecked && (
              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                <span>Pemeriksaan Terakhir</span>
                <span>{lastChecked.toLocaleTimeString()}</span>
              </div>
            )}
          </div>

          {/* Action / Helper Info */}
          {isOnline === false && (
            <div className="mt-2 p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-[11px] text-rose-700 dark:text-rose-300 space-y-1.5">
              <p className="font-medium leading-snug">
                Backend belum aktif atau tunnel terputus.
              </p>
              <p className="text-slate-600 dark:text-slate-400">
                Jalankan perintah ini di terminal komputer Anda:
              </p>
              <code className="block bg-rose-100/70 dark:bg-rose-900/60 px-2 py-1 rounded text-[10px] font-mono select-all">
                ./start_public_server.sh
              </code>
            </div>
          )}

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
              <span>{isChecking ? 'Memeriksa...' : 'Periksa Ulang Sekarang'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
