import { useState } from 'react';
import { UploadStep } from './components/UploadStep';
import { ReviewStep } from './components/ReviewStep';
import { GenerateStep } from './components/GenerateStep';
import type { ExtractedData, UploadResponse } from './types';
import { Button } from './components/ui/button';
import { ArrowLeft, ArrowRight, Check, RotateCcw } from 'lucide-react';
import { ThemeToggle } from './components/ThemeToggle';
import { ConnectionStatus } from './components/ConnectionStatus';
import { cn } from './lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './components/ui/alert-dialog';

type Step = 1 | 2 | 3;

const STEPS = [
  { step: 1, title: 'Unggah LHP', desc: 'Laporan Hasil Pemeriksaan' },
  { step: 2, title: 'Telaah Dokumen', desc: 'Rincian Biaya & Spesifikasi' },
  { step: 3, title: 'Penerbitan', desc: 'Finalisasi Berkas Resmi' },
] as const;

function App() {
  const [step, setStep] = useState<Step>(1);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const handleUploadComplete = (response: UploadResponse) => {
    setExtractedData(response.extracted_data);
    setUploadResponse(response);
    setStep(2);
  };

  const handleReset = () => {
    setStep(1);
    setExtractedData(null);
    setUploadResponse(null);
  };

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-primary/15 selection:text-primary">
      {/* Top Header (Crisp, fixed-height enterprise navigation) */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200/70 dark:border-slate-800 transition-all">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & Corporate Identity */}
          <div className="flex items-center gap-3.5 shrink-0">
            {/* Monochrome Pelindo TPS Logo (Dark Mode = White, Light Mode = Charcoal Slate) */}
            <img
              src="/logo-tps-monokrom-black.png"
              alt="Logo Pelindo Terminal Petikemas TPS Surabaya"
              className="h-8 sm:h-9 w-auto object-contain block dark:hidden shrink-0 select-none"
            />
            <img
              src="/logo-tps-monokrom.png"
              alt="Logo Pelindo Terminal Petikemas TPS Surabaya"
              className="h-8 sm:h-9 w-auto object-contain hidden dark:block shrink-0 select-none"
            />

            {/* Subtle Divider */}
            <div className="h-6 w-px bg-slate-200/80 dark:bg-slate-800 shrink-0 hidden sm:block" />

            {/* Application Title */}
            <div className="flex flex-col whitespace-nowrap justify-center">
              <h1 className="text-sm sm:text-[15px] font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-none">
                Pengadaan RAB & RKS
              </h1>
            </div>
          </div>

          {/* Stepper Navigation & Actions */}
          <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
            <nav aria-label="Alur Pengadaan" className="hidden sm:flex items-center gap-2 sm:gap-3 text-xs">
              {STEPS.map((s, idx) => {
                const isCompleted = step > s.step;
                const isCurrent = step === s.step;
                return (
                  <div key={s.step} className="flex items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-1.5 whitespace-nowrap">
                      <span
                        className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-semibold transition-colors shrink-0",
                          isCurrent && "bg-primary text-primary-foreground font-bold",
                          isCompleted && "bg-emerald-600 text-white font-bold",
                          !isCurrent && !isCompleted && "bg-slate-200/80 dark:bg-slate-800 text-slate-500"
                        )}
                      >
                        {isCompleted ? <Check className="w-3 h-3 stroke-[3]" /> : s.step}
                      </span>
                      <span
                        className={cn(
                          "transition-colors text-xs select-none",
                          isCurrent && "text-slate-900 dark:text-slate-100 font-semibold",
                          isCompleted && "text-slate-600 dark:text-slate-300 font-medium",
                          !isCurrent && !isCompleted && "text-slate-400 dark:text-slate-500 hidden md:inline"
                        )}
                      >
                        {s.title}
                      </span>
                    </div>
                    {idx < STEPS.length - 1 && (
                      <span className="text-slate-300 dark:text-slate-700 text-xs select-none">/</span>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block shrink-0" />

            {/* Backend Connection Status */}
            <ConnectionStatus />

            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800 hidden sm:block shrink-0" />

            {/* Theme Toggle (Light / Dark / System) */}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main Content Area (Unboxed, natural canvas) */}
      <main className="flex-1 container mx-auto max-w-5xl px-4 py-6 sm:py-8">
        {step === 1 && <UploadStep onNext={handleUploadComplete} />}

        {step === 2 && extractedData && uploadResponse && (
          <ReviewStep
            data={extractedData}
            fileId={uploadResponse.file_id}
            lhpText={uploadResponse.lhp_text}
            onUpdate={setExtractedData}
          />
        )}

        {step === 3 && extractedData && (
          <GenerateStep
            data={extractedData}
          />
        )}
      </main>

      {/* Sticky Bottom Action Bar */}
      {(step === 2 || step === 3) && (
        <footer className="sticky bottom-0 left-0 right-0 z-20 border-t border-slate-200/70 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-3 shadow-md">
          <div className="container mx-auto max-w-5xl px-4 flex items-center justify-between">
            <div className="text-xs text-slate-500 hidden sm:block">
              {step === 2 && 'Pastikan rincian data dan termin telah sesuai sebelum melanjutkan ke pratinjau.'}
              {step === 3 && 'Dokumen siap diterbitkan dan diunduh dalam format resmi.'}
            </div>
            <div className="flex items-center gap-3 ml-auto">
              {step === 2 && extractedData && (
                <>
                  <Button variant="outline" onClick={() => setStep(1)} className="gap-2 text-xs">
                    <ArrowLeft className="w-4 h-4" />
                    Kembali
                  </Button>
                  <Button
                    onClick={() => {
                      const items = extractedData.items;
                      const validItems = items.every(item =>
                        item.uraian.trim() !== '' &&
                        item.volume !== '' &&
                        item.satuan.trim() !== ''
                      );

                      if (!validItems) {
                        setAlertMessage('Mohon lengkapi semua field wajib pada tabel item (No, Uraian, Volume, Satuan)');
                        return;
                      }

                      // Check validation errors
                      if (extractedData.validation_errors && extractedData.validation_errors.length > 0) {
                        setAlertMessage('Mohon perbaiki kendala berikut:\n' + extractedData.validation_errors.join('\n'));
                        return;
                      }

                      // Validate termin percentage totals to 100%
                      if (extractedData.document_type !== 'PADI_UMKM' && extractedData.payment_terms) {
                        const totalPercent = Object.entries(extractedData.payment_terms).reduce((sum, [key, value]) => {
                          if (key.startsWith('termin_') && key.endsWith('_percent')) {
                            return sum + (parseFloat(value) || 0);
                          }
                          return sum;
                        }, 0);
                        if (totalPercent !== 100) {
                          setAlertMessage(`Total persentase termin harus tepat 100%. Saat ini: ${totalPercent.toFixed(2)}%`);
                          return;
                        }
                      }

                      setStep(3);
                    }}
                    className="gap-2 text-xs font-semibold shadow-xs"
                  >
                    Lanjut: Pratinjau Dokumen
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </>
              )}

              {step === 3 && extractedData && (
                <>
                  <Button variant="outline" onClick={() => setStep(2)} className="gap-2 text-xs">
                    <ArrowLeft className="w-4 h-4" />
                    Kembali ke Koreksi
                  </Button>
                  <Button variant="outline" onClick={handleReset} className="gap-2 text-xs text-slate-600 dark:text-slate-300 hover:text-slate-900">
                    <RotateCcw className="w-4 h-4" />
                    Mulai Berkas Baru
                  </Button>
                </>
              )}
            </div>
          </div>
        </footer>
      )}

      {/* Alert Dialog */}
      <AlertDialog open={!!alertMessage} onOpenChange={() => setAlertMessage(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Perhatian</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-line">{alertMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setAlertMessage(null)}>Mengerti</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default App;
