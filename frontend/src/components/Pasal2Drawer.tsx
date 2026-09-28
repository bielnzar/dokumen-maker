import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from './ui/sheet';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Sliders, Loader2, RefreshCw } from 'lucide-react';

interface Pasal2DrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customPasal2Prompt: string;
  jumlahKegiatan: number | undefined;
  onCustomPromptChange: (value: string) => void;
  onJumlahChange: (value: number | undefined) => void;
  onRegenerate: () => void;
  isLoading: boolean;
}

export function Pasal2Drawer({
  open,
  onOpenChange,
  customPasal2Prompt,
  jumlahKegiatan,
  onCustomPromptChange,
  onJumlahChange,
  onRegenerate,
  isLoading,
}: Pasal2DrawerProps) {
  const handleRegenerate = () => {
    onRegenerate();
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2 text-xs font-medium border-slate-300 dark:border-slate-700">
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          Penyesuaian Lingkup
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[420px] max-w-full p-6 flex flex-col justify-between">
        <div>
          <SheetHeader className="space-y-1.5 pb-4 border-b border-slate-200 dark:border-slate-800">
            <SheetTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Penyesuaian Lingkup Pasal 2 RKS
            </SheetTitle>
            <SheetDescription className="text-xs text-slate-500 dark:text-slate-400">
              Sesuaikan rincian uraian tahapan pekerjaan teknis Pasal 2 sesuai kebutuhan pengadaan.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-5 mt-6">
            <div className="space-y-2">
              <Label htmlFor="custom-prompt" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Catatan Penyesuaian Lingkup (Opsional)
              </Label>
              <Textarea
                id="custom-prompt"
                value={customPasal2Prompt}
                onChange={(e) => onCustomPromptChange(e.target.value)}
                placeholder="Contoh: Menambahkan kewajiban pembersihan akhir area kerja, pengujian komisioning, dan pelaporan inspeksi..."
                rows={5}
                className="resize-none text-xs leading-relaxed"
                disabled={isLoading}
              />
              <p className="text-[11px] text-slate-400">
                Kosongkan untuk menggunakan susunan standar teknis TPS.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="jumlah-kegiatan" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Target Jumlah Poin Kegiatan
              </Label>
              <Input
                id="jumlah-kegiatan"
                type="number"
                min={1}
                max={20}
                value={jumlahKegiatan ?? ''}
                onChange={(e) => {
                  const val = e.target.value;
                  onJumlahChange(val ? parseInt(val) : undefined);
                }}
                placeholder="Kosongkan untuk jumlah standar sistem"
                className="text-xs"
                disabled={isLoading}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="flex-1 text-xs"
          >
            Tutup
          </Button>
          <Button
            onClick={handleRegenerate}
            disabled={isLoading}
            className="flex-1 text-xs gap-2 font-semibold shadow-xs"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Memproses...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" />
                Terapkan Perubahan
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
