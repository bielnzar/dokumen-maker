import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import type { ExtractedData } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  CheckCircle2,
  RefreshCw,
  Loader2,
  FileText,
  Download,
  FileSpreadsheet
} from 'lucide-react';

function numberToTerbilang(number: number): string {
  if (number === 0) return 'nol rupiah';

  const units = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan'];
  const teens = ['sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas', 'tujuh belas', 'delapan belas', 'sembilan belas'];
  const tens = ['', '', 'dua puluh', 'tiga puluh', 'empat puluh', 'lima puluh', 'enam puluh', 'tujuh puluh', 'delapan puluh', 'sembilan puluh'];

  function convertChunk(n: number): string {
    if (n < 10) return units[n];
    if (n < 20) return teens[n - 10];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
    if (n === 100) return 'seratus';
    if (n < 1000) {
      const hundreds = Math.floor(n / 100);
      const remainder = n % 100;
      if (hundreds === 1) {
        return 'seratus' + (remainder !== 0 ? ' ' + convertChunk(remainder) : '');
      }
      return units[hundreds] + ' ratus' + (remainder !== 0 ? ' ' + convertChunk(remainder) : '');
    }
    if (n === 1000) return 'seribu';
    if (n < 1000000) return convertChunk(Math.floor(n / 1000)) + ' ribu' + (n % 1000 !== 0 ? ' ' + convertChunk(n % 1000) : '');
    if (n === 1000000) return 'sejuta';
    if (n < 1000000000) return convertChunk(Math.floor(n / 1000000)) + ' juta' + (n % 1000000 !== 0 ? ' ' + convertChunk(n % 1000000) : '');
    const billions = Math.floor(n / 1000000000);
    const remainder = n % 1000000000;
    return convertChunk(billions) + ' miliar' + (remainder > 0 ? ' ' + convertChunk(remainder) : '');
  }

  const intNum = Math.floor(number);
  return convertChunk(intNum) + ' rupiah';
}

interface GenerateStepProps {
  data: ExtractedData;
}

export const GenerateStep: React.FC<GenerateStepProps> = ({ data }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedFiles, setGeneratedFiles] = useState<{
    rab?: string;
    rks?: string;
    rab_xlsx?: string;
    nodin?: string;
    rab_pdf?: string;
    rks_pdf?: string;
    nodin_pdf?: string;
  } | null>(null);

  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [rksHtml, setRksHtml] = useState<string | null>(null);

  const rksPreviewHtml = rksHtml || '';

  useEffect(() => {
    const fetchPreview = async () => {
      setPreviewLoading(true);
      setPreviewError(null);

      try {
        const result = await apiService.previewDocuments(data);
        setRksHtml(result.rks);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Pratinjau gagal dimuat';
        setPreviewError(errorMessage);
      } finally {
        setPreviewLoading(false);
      }
    };
    fetchPreview();
  }, [data]);

  const rabTotal = data.items.reduce((sum, item) => {
    const vol = parseFloat(String(item.volume)) || 0;
    const harga = parseFloat(String(item.harga_satuan)) || 0;
    return sum + (vol * harga);
  }, 0);
  const rabPPN = Math.round(rabTotal * 0.11);
  const rabGrandTotal = rabTotal + rabPPN;

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    setGeneratedFiles(null);

    try {
      const result = await apiService.generateDocuments(data);
      setGeneratedFiles(result.files);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Gagal membuat dokumen';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (filename: string) => {
    const url = apiService.getDownloadURL(filename);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Pratinjau & Penerbitan Dokumen
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Tinjau lembar kerja RAB dan naskah RKS, lalu buat berkas resmi (DOCX, XLSX, dan PDF).
        </p>
      </div>

      {/* Unified Executive Summary Strip (Single unfragmented card, no separate boxed blocks) */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/70 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          <div className="pt-2 md:pt-0 md:px-3 first:pl-0 space-y-0.5">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider block">
              Jenis Pekerjaan
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate block" title={data.work_type}>
              {data.work_type || '-'}
            </span>
          </div>

          <div className="pt-2 md:pt-0 md:px-3 space-y-0.5">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider block">
              Waktu Pelaksanaan
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate block" title={data.timeline}>
              {data.timeline || '-'}
            </span>
          </div>

          <div className="pt-2 md:pt-0 md:px-3 space-y-0.5">
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wider block">
              Tipe Dokumen
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 block">
              {data.document_type}
            </span>
          </div>

          <div className="pt-2 md:pt-0 md:px-3 space-y-0.5">
            <span className="text-[11px] text-primary font-medium uppercase tracking-wider block">
              Nilai Total RAB
            </span>
            <span className="text-xs sm:text-sm font-bold text-primary block">
              Rp {rabGrandTotal.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* Preview Section */}
      <Card className="border-slate-200/70 dark:border-slate-800 shadow-xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
            <FileText className="w-4 h-4 text-primary" />
            Pratinjau Dokumen Pengadaan
          </CardTitle>
          <CardDescription className="text-xs">
            Periksa tampilan lembar RAB dan struktur naskah dokumen RKS sebelum finalisasi.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4">
          <Tabs defaultValue="rab" className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="rab" className="text-xs">
                Rencana Anggaran Biaya (RAB)
              </TabsTrigger>
              <TabsTrigger value="rks" className="text-xs">
                Rencana Kerja & Syarat (RKS)
              </TabsTrigger>
            </TabsList>

            {/* TAB RAB */}
            <TabsContent value="rab">
              <div className="rounded-lg border border-slate-200/70 dark:border-slate-800 overflow-hidden shadow-2xs">
                <Table>
                  <TableHeader className="bg-slate-100/80 dark:bg-slate-800">
                    <TableRow className="border-b border-slate-200/80 dark:border-slate-700/80">
                      <TableHead className="w-12 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">NO</TableHead>
                      <TableHead className="text-xs font-semibold text-slate-700 dark:text-slate-200">URAIAN PEKERJAAN</TableHead>
                      <TableHead className="w-24 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">VOLUME</TableHead>
                      <TableHead className="w-24 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">SATUAN</TableHead>
                      <TableHead className="w-36 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">HARGA SATUAN</TableHead>
                      <TableHead className="w-40 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">JUMLAH HARGA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item, idx) => {
                      const vol = parseFloat(String(item.volume)) || 0;
                      const harga = parseFloat(String(item.harga_satuan)) || 0;
                      const jumlah = vol * harga;
                      return (
                        <TableRow key={idx} className="border-b border-slate-100 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                          <TableCell className="text-center text-xs text-slate-700 dark:text-slate-300">{idx + 1}</TableCell>
                          <TableCell className="text-xs text-slate-900 dark:text-slate-100 font-medium">{item.uraian || '-'}</TableCell>
                          <TableCell className="text-center text-xs text-slate-700 dark:text-slate-300">{item.volume || '-'}</TableCell>
                          <TableCell className="text-center text-xs text-slate-700 dark:text-slate-300">{item.satuan || '-'}</TableCell>
                          <TableCell className="text-right text-xs text-slate-700 dark:text-slate-300">Rp {harga.toLocaleString('id-ID')}</TableCell>
                          <TableCell className="text-right text-xs font-medium text-slate-900 dark:text-slate-100">Rp {jumlah.toLocaleString('id-ID')}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow className="font-medium bg-slate-50/40 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800">
                      <TableCell rowSpan={3} colSpan={4} className="text-left align-top text-slate-700 dark:text-slate-300 border-r border-slate-200/80 dark:border-slate-800 p-4">
                        <span className="font-semibold text-xs text-slate-900 dark:text-slate-100">Terbilang:</span><br />
                        <span className="italic text-xs text-slate-600 dark:text-slate-400 capitalize">{numberToTerbilang(rabGrandTotal)}</span>
                      </TableCell>
                      <TableCell className="text-right text-xs text-slate-700 dark:text-slate-300">Total Biaya</TableCell>
                      <TableCell className="text-right text-xs font-semibold text-slate-900 dark:text-slate-100">Rp {rabTotal.toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                    <TableRow className="bg-slate-50/40 dark:bg-slate-800/20 border-b border-slate-200 dark:border-slate-800">
                      <TableCell className="text-right text-xs text-slate-700 dark:text-slate-300">PPN (11%)</TableCell>
                      <TableCell className="text-right text-xs font-semibold text-slate-900 dark:text-slate-100">Rp {rabPPN.toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                    <TableRow className="font-bold bg-slate-100/70 dark:bg-slate-800/40">
                      <TableCell className="text-right text-xs text-slate-900 dark:text-slate-100 font-bold">Grand Total</TableCell>
                      <TableCell className="text-right text-primary text-sm font-bold">Rp {rabGrandTotal.toLocaleString('id-ID')}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            {/* TAB RKS */}
            <TabsContent value="rks">
              <div className="bg-slate-100/70 dark:bg-slate-950 p-4 sm:p-6 rounded-xl border border-slate-200/60 dark:border-slate-800 max-h-[65vh] overflow-y-auto">
                {previewLoading ? (
                  <div className="flex flex-col items-center justify-center h-[350px] gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    <p className="text-xs text-slate-500">Memuat naskah pratinjau RKS...</p>
                  </div>
                ) : previewError ? (
                  <div className="flex flex-col items-center justify-center h-[350px] gap-3">
                    <p className="text-xs text-destructive">{previewError}</p>
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="text-xs">
                      <RefreshCw className="w-3.5 h-3.5 mr-2" />
                      Muat Ulang
                    </Button>
                  </div>
                ) : (
                  <div className="document-sheet max-w-3xl mx-auto shadow-sm">
                    <div
                      className="font-serif text-xs sm:text-sm text-slate-900 dark:text-slate-900 leading-relaxed [&_table]:border-collapse [&_table]:w-full [&_table]:my-4 [&_td]:border [&_td]:border-slate-300 [&_td]:p-2 [&_th]:border [&_th]:border-slate-300 [&_th]:p-2 [&_th]:bg-slate-100 [&_th]:font-semibold"
                      dangerouslySetInnerHTML={{ __html: rksPreviewHtml }}
                    />
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Generate Action Card */}
      <Card className="border-slate-200/70 dark:border-slate-800 shadow-xs">
        <CardContent className="pt-6">
          <Button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full h-11 text-xs sm:text-sm font-semibold shadow-xs"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Menerbitkan Dokumen (DOCX, XLSX & PDF)...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Terbitkan Dokumen Lengkap (DOCX, XLSX & PDF)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Error Notice */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/20 text-xs sm:text-sm text-destructive text-center">
          {error}
        </div>
      )}

      {/* Download Section (Unified List inside one card, no fragmented loose boxes) */}
      {generatedFiles && (
        <Card className="border-emerald-200/80 dark:border-emerald-900/60 bg-white dark:bg-slate-900 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <CardTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 text-sm font-semibold">
              <CheckCircle2 className="w-4.5 h-4.5" />
              Dokumen Pengadaan Berhasil Diterbitkan
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Silakan unduh dokumen sesuai kebutuhan format (berkas kerja atau berkas cetak PDF resmi):
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {/* RAB Document */}
            {(generatedFiles.rab_xlsx || generatedFiles.rab_pdf) && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mt-0.5">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                      Rencana Anggaran Biaya (RAB)
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5 max-w-[260px] sm:max-w-md font-mono">
                      {generatedFiles.rab_xlsx || generatedFiles.rab_pdf}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  {generatedFiles.rab_xlsx && (
                    <Button
                      onClick={() => handleDownload(generatedFiles.rab_xlsx!)}
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      XLSX
                    </Button>
                  )}
                  {generatedFiles.rab_pdf && (
                    <Button
                      onClick={() => handleDownload(generatedFiles.rab_pdf!)}
                      size="sm"
                      className="text-xs h-8 bg-red-600 hover:bg-red-700 text-white shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      PDF
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* RKS Document */}
            {(generatedFiles.rks || generatedFiles.rks_pdf) && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 last:pb-0">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                      Rencana Kerja dan Syarat (RKS)
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5 max-w-[260px] sm:max-w-md font-mono">
                      {generatedFiles.rks || generatedFiles.rks_pdf}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  {generatedFiles.rks && (
                    <Button
                      onClick={() => handleDownload(generatedFiles.rks!)}
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      DOCX
                    </Button>
                  )}
                  {generatedFiles.rks_pdf && (
                    <Button
                      onClick={() => handleDownload(generatedFiles.rks_pdf!)}
                      size="sm"
                      className="text-xs h-8 bg-red-600 hover:bg-red-700 text-white shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      PDF
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* NODIN Document */}
            {(generatedFiles.nodin || generatedFiles.nodin_pdf) && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 last:pb-0">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mt-0.5">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                      Nota Dinas Ijin Prinsip
                    </p>
                    <p className="text-[11px] text-slate-400 truncate mt-0.5 max-w-[260px] sm:max-w-md font-mono">
                      {generatedFiles.nodin || generatedFiles.nodin_pdf}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  {generatedFiles.nodin && (
                    <Button
                      onClick={() => handleDownload(generatedFiles.nodin!)}
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      DOCX
                    </Button>
                  )}
                  {generatedFiles.nodin_pdf && (
                    <Button
                      onClick={() => handleDownload(generatedFiles.nodin_pdf!)}
                      size="sm"
                      className="text-xs h-8 bg-red-600 hover:bg-red-700 text-white shadow-2xs"
                    >
                      <Download className="w-3.5 h-3.5 mr-1.5" />
                      PDF
                    </Button>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};