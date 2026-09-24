import React, { useState, useEffect } from 'react';
import type { ExtractedData, Item, SortableActivityProps, ReviewStepProps } from '../types';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Plus, Trash2, Package, GripVertical, FileText, ListOrdered } from 'lucide-react';
import { TerminPreview } from './TerminPreview';
import { Pasal2Drawer } from './Pasal2Drawer';
import { apiService } from '../services/api';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Helper function to move array item
function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = [...array];
  const [removed] = newArray.splice(from, 1);
  newArray.splice(to, 0, removed);
  return newArray;
}

function SortableActivity({ activity, index, animationIndex, onUpdate, onDelete }: SortableActivityProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useSortable({ id: index });

  const isNew = animationIndex !== -1 && index < animationIndex;
  const delay = isNew ? index * 60 : 0;

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? undefined : 'opacity 0.3s ease-out, transform 0.3s ease-out',
    opacity: isDragging ? 0.5 : 1,
    animationDelay: isNew ? `${delay}ms` : '0ms',
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-start gap-2.5 p-1 rounded-lg ${isNew ? 'animate-slide-in' : ''}`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1.5 rounded-md mt-6 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        title="Geser untuk mengubah urutan"
      >
        <GripVertical className="w-4.5 h-4.5" />
      </div>

      {/* Activity input */}
      <div className="flex-1 space-y-1.5">
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          Poin 2.{index + 1}
        </Label>
        <Textarea
          value={activity}
          onChange={(e) => onUpdate(index, e.target.value)}
          rows={2}
          className="resize-none text-xs leading-relaxed border-slate-200 dark:border-slate-800 focus-visible:ring-1"
          placeholder="Uraian lingkup kegiatan..."
        />
      </div>

      {/* Delete button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(index)}
        className="mt-6 text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors h-8 w-8"
        title="Hapus poin ini"
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  );
}

export const ReviewStep: React.FC<ReviewStepProps> = ({ data, fileId, lhpText, onUpdate }) => {
  const [editedData, setEditedData] = useState<ExtractedData>({
    ...data,
    termin_count: data.termin_count || 1
  });
  const [paymentTerms, setPaymentTerms] = useState<Record<string, string>>(data.payment_terms || {});
  const [tempTerminCount, setTempTerminCount] = useState<string>(String(data.termin_count || 1));
  const [isTerminValid, setIsTerminValid] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [customPasal2Prompt, setCustomPasal2Prompt] = useState('');
  const [jumlahKegiatan, setJumlahKegiatan] = useState<number | undefined>(undefined);
  const [regenerating, setRegenerating] = useState(false);
  const [animationIndex, setAnimationIndex] = useState<number>(-1);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setEditedData((prev) => ({
        ...prev,
        work_activities: arrayMove(prev.work_activities, active.id as number, over.id as number)
      }));
    }
  };

  useEffect(() => {
    const validationErrors: string[] = [];
    if (editedData.document_type !== 'PADI_UMKM' && !isTerminValid) {
      validationErrors.push('Total persentase termin melebihi 100%');
    }
    const dataToSync = { ...editedData, payment_terms: paymentTerms, validation_errors: validationErrors };
    onUpdate(dataToSync);
  }, [editedData, paymentTerms, isTerminValid, onUpdate]);

  const handleInputChange = (field: keyof ExtractedData, value: string | number) => {
    setEditedData((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (index: number, field: keyof Item, value: string | number) => {
    setEditedData((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      ),
    }));
  };

  const handleActivityChange = (index: number, value: string) => {
    setEditedData((prev) => ({
      ...prev,
      work_activities: prev.work_activities.map((act, i) =>
        i === index ? value : act
      ),
    }));
  };

  const handleDeleteActivity = (index: number) => {
    setEditedData((prev) => ({
      ...prev,
      work_activities: prev.work_activities.filter((_, i) => i !== index)
    }));
  };

  const handleAddActivity = () => {
    setEditedData((prev) => ({
      ...prev,
      work_activities: [...prev.work_activities, '']
    }));
  };

  const handleRegeneratePasal2 = async () => {
    if (!fileId) return;
    setRegenerating(true);
    try {
      const result = await apiService.regeneratePasal2({
        file_id: fileId,
        lhp_text: lhpText,
        document_type: editedData.document_type,
        custom_pasal2_prompt: customPasal2Prompt || undefined,
        jumlah_kegiatan: jumlahKegiatan,
      });
      setEditedData((prev) => ({
        ...prev,
        work_activities: result.work_activities,
      }));
      setDrawerOpen(false);
      setTimeout(() => {
        setAnimationIndex(result.work_activities.length);
        setTimeout(() => setAnimationIndex(-1), 1000);
      }, 300);
      setCustomPasal2Prompt('');
      setJumlahKegiatan(undefined);
    } catch (error) {
      console.error('Failed to regenerate Pasal 2:', error);
      alert('Gagal memperbarui redaksi Pasal 2. Silakan coba kembali.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDeleteItem = (index: number) => {
    setEditedData((prev) => {
      const newItems = prev.items.filter((_, i) => i !== index);
      return {
        ...prev,
        items: newItems.map((item, i) => ({ ...item, no: i + 1 }))
      };
    });
  };

  const handleAddItem = () => {
    const newNo = editedData.items.length + 1;
    setEditedData((prev) => ({
      ...prev,
      items: [...prev.items, {
        no: newNo,
        uraian: '',
        volume: '',
        satuan: '',
        harga_satuan: ''
      }],
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header Overview */}
      <div className="space-y-1">
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Telaah & Koreksi Berkas
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Verifikasi kelengkapan informasi pengadaan, jadwal pelaksanaan, tahapan termin, dan rincian harga RAB.
        </p>
      </div>

      <div className="space-y-6">
        {/* Basic Information Card */}
        <Card className="border-slate-200/70 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <FileText className="w-4 h-4 text-primary" />
              Informasi Pengadaan & Klasifikasi Dokumen
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-5 space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Tipe Dokumen
                </Label>
                <Select
                  value={editedData.document_type}
                  onValueChange={(value) => handleInputChange('document_type', value)}
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENGADAAN">PENGADAAN</SelectItem>
                    <SelectItem value="PEMELIHARAAN">PEMELIHARAAN</SelectItem>
                    <SelectItem value="PADI_UMKM">PADI_UMKM</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-2 space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nama Proyek / Pekerjaan
                </Label>
                <Input
                  value={editedData.project_name}
                  onChange={(e) => handleInputChange('project_name', e.target.value)}
                  placeholder="Masukkan nama proyek pengadaan"
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Jenis Pekerjaan
                </Label>
                <Input
                  value={editedData.work_type}
                  onChange={(e) => handleInputChange('work_type', e.target.value)}
                  placeholder="Contoh: Pekerjaan Sipil / Mekanikal"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Waktu Pelaksanaan (Timeline)
                </Label>
                <Input
                  value={editedData.timeline}
                  onChange={(e) => handleInputChange('timeline', e.target.value)}
                  placeholder="Contoh: 30 (tiga puluh) hari kalender"
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Kepada (Penerima Nota Dinas)
                </Label>
                <Input
                  value={editedData.kepada || ''}
                  onChange={(e) => handleInputChange('kepada', e.target.value)}
                  placeholder="Penerima Nota Dinas"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Dari (Pengirim Nota Dinas)
                </Label>
                <Input
                  value={editedData.dari || ''}
                  onChange={(e) => handleInputChange('dari', e.target.value)}
                  placeholder="Pengirim Nota Dinas"
                  className="text-xs h-9"
                />
              </div>

              {editedData.document_type !== 'PADI_UMKM' && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Jumlah Termin Pembayaran
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min="1"
                      max="16"
                      value={tempTerminCount}
                      onChange={(e) => setTempTerminCount(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      placeholder="1"
                      className="text-xs h-9"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const num = parseInt(tempTerminCount);
                        if (!isNaN(num) && num >= 1 && num <= 16) {
                          handleInputChange('termin_count', num);
                        }
                      }}
                      className="text-xs h-9 px-3"
                    >
                      Terapkan
                    </Button>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Rata-rata: {(100 / (editedData.termin_count || 1)).toFixed(1)}% per termin
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Termin Preview */}
        {editedData.document_type !== 'PADI_UMKM' && (
          <TerminPreview
            terminCount={Number(editedData.termin_count) || 1}
            initialValues={editedData.payment_terms}
            onChange={setPaymentTerms}
            onValidationChange={(isValid) => {
              setIsTerminValid(isValid);
            }}
          />
        )}

        {/* Work Activities (Pasal 2) */}
        <Card className="border-slate-200/70 dark:border-slate-800 shadow-xs">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <ListOrdered className="w-4 h-4 text-primary" />
                  Pasal 2 - Lingkup Pekerjaan & Spesifikasi
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Uraian tahapan kegiatan teknis yang wajib dilaksanakan oleh pelaksana pekerjaan.
                </CardDescription>
              </div>
              <Pasal2Drawer
                open={drawerOpen}
                onOpenChange={setDrawerOpen}
                customPasal2Prompt={customPasal2Prompt}
                jumlahKegiatan={jumlahKegiatan}
                onCustomPromptChange={setCustomPasal2Prompt}
                onJumlahChange={setJumlahKegiatan}
                onRegenerate={handleRegeneratePasal2}
                isLoading={regenerating}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={editedData.work_activities.map((_, index) => index)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {editedData.work_activities.map((activity, index) => (
                    <SortableActivity
                      key={index}
                      activity={activity}
                      index={index}
                      animationIndex={animationIndex}
                      onUpdate={handleActivityChange}
                      onDelete={handleDeleteActivity}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-2 text-xs text-slate-600 dark:text-slate-300 hover:text-primary"
              onClick={handleAddActivity}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Tambah Poin Kegiatan
            </Button>
          </CardContent>
        </Card>

        {/* Items Table 3.1 (RAB) */}
        <Card className="border-slate-200/70 dark:border-slate-800 shadow-xs overflow-hidden">
          <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-semibold flex items-center gap-2 text-slate-900 dark:text-slate-100">
                  <Package className="w-4 h-4 text-primary" />
                  Rincian Item Pekerjaan & RAB (Tabel 3.1)
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">
                  Daftar satuan volume dan estimasi harga per item.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="text-xs gap-1.5 h-8"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Baris Item
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-slate-100/90 dark:bg-slate-800/95 z-10 border-b border-slate-200/80 dark:border-slate-700/80 backdrop-blur-xs">
                  <TableRow className="border-b border-slate-200/80 dark:border-slate-700/80">
                    <TableHead className="w-16 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">No</TableHead>
                    <TableHead className="min-w-[200px] text-xs font-semibold text-slate-700 dark:text-slate-200">Uraian Pekerjaan / Material</TableHead>
                    <TableHead className="w-24 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">Volume</TableHead>
                    <TableHead className="w-24 text-center text-xs font-semibold text-slate-700 dark:text-slate-200">Satuan</TableHead>
                    <TableHead className="w-44 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Harga Satuan (Rp)</TableHead>
                    <TableHead className="w-44 text-right text-xs font-semibold text-slate-700 dark:text-slate-200">Jumlah Total (Rp)</TableHead>
                    <TableHead className="w-12 text-center text-xs font-semibold text-slate-700 dark:text-slate-200"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {editedData.items.map((item, index) => {
                    const vol = parseFloat(String(item.volume)) || 0;
                    const harga = parseFloat(String(item.harga_satuan)) || 0;
                    const total = vol * harga;
                    return (
                      <TableRow key={index} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800/60">
                        <TableCell className="p-2">
                          <Input
                            type="number"
                            value={item.no}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              handleItemChange(index, 'no', val);
                            }}
                            className="text-xs text-center h-8"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            value={item.uraian}
                            onChange={(e) => handleItemChange(index, 'uraian', e.target.value)}
                            placeholder="Deskripsi pekerjaan"
                            className="text-xs h-8"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="number"
                            value={item.volume}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9.]/g, '');
                              handleItemChange(index, 'volume', val);
                            }}
                            placeholder="0"
                            className="text-xs text-center h-8"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            value={item.satuan}
                            onChange={(e) => handleItemChange(index, 'satuan', e.target.value)}
                            placeholder="Unit / Ls"
                            className="text-xs text-center h-8"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="number"
                            value={item.harga_satuan || ''}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^0-9]/g, '');
                              handleItemChange(index, 'harga_satuan', val);
                            }}
                            placeholder="0"
                            className="text-xs text-right h-8"
                          />
                        </TableCell>
                        <TableCell className="p-2 text-right text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-50/40 dark:bg-slate-800/20">
                          {total > 0
                            ? total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 })
                            : '-'}
                        </TableCell>
                        <TableCell className="p-2 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteItem(index)}
                            className="h-8 w-8 text-slate-400 hover:text-destructive hover:bg-destructive/10"
                            title="Hapus baris"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
