import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Input } from './ui/input';
import { cn } from '../lib/utils';
import { Receipt } from 'lucide-react';

interface TerminPreviewProps {
  terminCount: number;
  initialValues?: Record<string, string>;
  onChange: (payment_terms: Record<string, string>) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const TerminPreview: React.FC<TerminPreviewProps> = ({
  terminCount,
  initialValues,
  onChange,
  onValidationChange
}) => {
  const [userEdits, setUserEdits] = useState<Record<number, number | string>>({});

  // Reset user manual edits when the termin count changes
  useEffect(() => {
    setUserEdits({});
  }, [terminCount]);

  const basePercentages = useMemo(() => {
    const count = Math.max(1, terminCount);

    // If initialValues provided has all keys for 1..count
    let hasAllInitial = true;
    if (initialValues && Object.keys(initialValues).length > 0) {
      for (let i = 1; i <= count; i++) {
        const val = parseFloat(initialValues[`termin_${i}_percent`]);
        if (isNaN(val)) {
          hasAllInitial = false;
          break;
        }
      }
    } else {
      hasAllInitial = false;
    }

    if (hasAllInitial && initialValues) {
      const values: number[] = [];
      for (let i = 1; i <= count; i++) {
        values.push(parseFloat(initialValues[`termin_${i}_percent`]) || 0);
      }
      return values;
    }

    // Default uniform division summing to exactly 100.00
    const values: number[] = [];
    const baseVal = Math.floor((100 / count) * 100) / 100;
    let accumulated = 0;
    for (let i = 0; i < count; i++) {
      if (i === count - 1) {
        values.push(Number((100 - accumulated).toFixed(2)));
      } else {
        values.push(baseVal);
        accumulated += baseVal;
      }
    }
    return values;
  }, [terminCount, initialValues]);

  const percentages = useMemo(() => {
    return basePercentages.map((base, i) =>
      i in userEdits ? userEdits[i] : base
    );
  }, [basePercentages, userEdits]);

  const lastEmittedRef = useRef<string>('');

  useEffect(() => {
    const count = Math.max(1, terminCount);
    const payment_terms: Record<string, string> = {};
    for (let i = 0; i < count; i++) {
      const value = percentages[i];
      const numValue = typeof value === 'number' ? value : parseFloat(String(value));
      payment_terms[`termin_${i + 1}_percent`] = isNaN(numValue) ? '0' : String(numValue);
    }

    const serialized = JSON.stringify(payment_terms);
    if (lastEmittedRef.current !== serialized) {
      lastEmittedRef.current = serialized;
      onChange(payment_terms);
    }
  }, [percentages, terminCount, onChange]);

  const handleChange = (index: number, value: string) => {
    setUserEdits(prev => ({ ...prev, [index]: value }));
  };

  const totalPercentage = useMemo(() => {
    return percentages.reduce((sum: number, p) => {
      const numValue = typeof p === 'number' ? p : parseFloat(String(p));
      return sum + (isNaN(numValue) ? 0 : numValue);
    }, 0);
  }, [percentages]);

  const isValid = Math.abs(totalPercentage - 100) <= 0.05;
  const isOverLimit = totalPercentage > 100.05;
  const isUnderLimit = totalPercentage < 99.95;

  useEffect(() => {
    onValidationChange?.(isValid);
  }, [isValid, onValidationChange]);

  return (
    <Card className="border-slate-200/70 dark:border-slate-800 shadow-xs">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <Receipt className="w-4 h-4 text-primary" />
            Jadwal & Persentase Termin Pembayaran
          </CardTitle>
          <CardDescription className="text-xs mt-0.5">
            Pastikan akumulasi pembagian persentase seluruh termin tepat berjumlah 100%.
          </CardDescription>
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2 text-xs font-medium self-start sm:self-center">
          <span className={cn(
            "w-2 h-2 rounded-full",
            isValid ? "bg-emerald-500" : "bg-red-500"
          )} />
          <span className={isValid ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-red-600 dark:text-red-400 font-semibold"}>
            Total: {totalPercentage.toFixed(2)}%
          </span>
          {isOverLimit && <span className="text-red-500 font-normal">(Melebihi 100%)</span>}
          {isUnderLimit && <span className="text-amber-500 font-normal">(Kurang dari 100%)</span>}
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="rounded-lg border border-slate-200/70 dark:border-slate-800 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-100/80 dark:bg-slate-800">
              <TableRow className="border-b border-slate-200/80 dark:border-slate-700/80">
                <TableHead className="w-40 text-xs font-semibold text-slate-700 dark:text-slate-200">Tahap Termin</TableHead>
                <TableHead className="text-xs font-semibold text-slate-700 dark:text-slate-200">Alokasi Pembayaran (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {percentages.map((percent, index) => (
                <TableRow key={index} className="border-b border-slate-100 dark:border-slate-800/60">
                  <TableCell className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    Termin ke-{index + 1}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={percent}
                        onChange={(e) => handleChange(index, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="w-24 text-xs h-8 text-right font-medium"
                      />
                      <span className="text-xs text-slate-400 font-medium">%</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
