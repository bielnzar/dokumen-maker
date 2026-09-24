import { useTheme } from './theme-provider';
import { Sun, Moon, Monitor } from 'lucide-react';
import { cn } from '../lib/utils';

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Pilihan Tema"
      className={cn("flex items-center gap-0.5 text-xs text-slate-500 dark:text-slate-400", className)}
    >
      <button
        type="button"
        role="radio"
        aria-checked={theme === 'light'}
        onClick={() => setTheme('light')}
        className={cn(
          "p-1.5 rounded-md transition-colors cursor-pointer",
          theme === 'light'
            ? "text-primary bg-primary/10 font-semibold"
            : "hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        )}
        title="Mode Terang (Light)"
      >
        <Sun className="w-4 h-4" />
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'dark'}
        onClick={() => setTheme('dark')}
        className={cn(
          "p-1.5 rounded-md transition-colors cursor-pointer",
          theme === 'dark'
            ? "text-primary bg-primary/10 font-semibold"
            : "hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        )}
        title="Mode Gelap (Dark)"
      >
        <Moon className="w-4 h-4" />
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={theme === 'system'}
        onClick={() => setTheme('system')}
        className={cn(
          "p-1.5 rounded-md transition-colors cursor-pointer",
          theme === 'system'
            ? "text-primary bg-primary/10 font-semibold"
            : "hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
        )}
        title="Otomatis Ikuti Sistem (System)"
      >
        <Monitor className="w-4 h-4" />
      </button>
    </div>
  );
}
