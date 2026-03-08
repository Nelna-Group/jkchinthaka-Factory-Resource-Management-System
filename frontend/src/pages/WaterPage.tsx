import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../components/ui/alert-dialog';
import { useToast } from '../components/ui/toast-provider';
import { waterService } from '../services/dataService';
import type { WaterMeterData } from '../models/types';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Droplets, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

type MeterType = 'ppu1_reading' | 'ppu2_reading' | 'fpu1_reading' | 'fpu2_reading' | 'chiller_reading' | 'other';

const METER_OPTIONS: Array<{ value: MeterType; label: string }> = [
  { value: 'ppu1_reading', label: 'PPU1' },
  { value: 'ppu2_reading', label: 'PPU2' },
  { value: 'fpu1_reading', label: 'FPU1' },
  { value: 'fpu2_reading', label: 'FPU2' },
  { value: 'chiller_reading', label: 'Chiller Reading' },
  { value: 'other', label: 'Other' },
];

const schema = z.object({
  date: z.string().min(1, 'Date required'),
  meter_type: z.enum(['ppu1_reading', 'ppu2_reading', 'fpu1_reading', 'fpu2_reading', 'chiller_reading', 'other']),
  reading: z.coerce.number().positive('Reading must be greater than 0'),
  notes: z.string().optional(),
}).superRefine((data, ctx) => {
  if (data.meter_type === 'other' && !data.notes?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['notes'],
      message: 'Please add a note for Other meter type',
    });
  }
});

type FormData = z.infer<typeof schema>;

const getMeterTypeFromRecord = (rec: WaterMeterData): MeterType => {
  if (rec.ppu1_reading != null) return 'ppu1_reading';
  if (rec.ppu2_reading != null) return 'ppu2_reading';
  if (rec.fpu1_reading != null) return 'fpu1_reading';
  if (rec.fpu2_reading != null) return 'fpu2_reading';
  if (rec.chiller_reading != null) return 'chiller_reading';
  return 'other';
};

const getMeterLabel = (meterType: MeterType): string => {
  return METER_OPTIONS.find(opt => opt.value === meterType)?.label || 'Other';
};

const getReadingForMeter = (rec: WaterMeterData, meterType: MeterType): number => {
  if (meterType === 'ppu1_reading') return rec.ppu1_reading ?? rec.intake;
  if (meterType === 'ppu2_reading') return rec.ppu2_reading ?? rec.intake;
  if (meterType === 'fpu1_reading') return rec.fpu1_reading ?? rec.intake;
  if (meterType === 'fpu2_reading') return rec.fpu2_reading ?? rec.intake;
  if (meterType === 'chiller_reading') return rec.chiller_reading ?? rec.intake;
  return rec.intake;
};

export default function WaterPage() {
  const [records, setRecords] = useState<WaterMeterData[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      meter_type: 'ppu1_reading',
      notes: '',
    },
  });

  const selectedMeterType = watch('meter_type');

  const loadData = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { page, limit: 15, sort: 'date', order: 'DESC' };
      if (search) params.filter = `date:${search}`;
      const res = await waterService.getAll(params);
      setRecords(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { loadData(); }, [loadData]);

  const onSubmit = async (data: FormData) => {
    const normalizedDate = /^\d{4}-\d{2}-\d{2}$/.test(data.date)
      ? data.date
      : new Date(data.date).toISOString().split('T')[0];

    const payload: Record<string, unknown> = {
      date: normalizedDate,
      intake: data.reading,
    };

    if (data.meter_type !== 'other') {
      payload[data.meter_type] = data.reading;
    }

    if (data.meter_type === 'other' && data.notes?.trim()) {
      payload.notes = data.notes.trim();
    }

    try {
      if (editId) {
        await waterService.update(editId, payload);
        toast({ type: 'success', title: 'Record updated' });
      } else {
        await waterService.create(payload);
        toast({ type: 'success', title: 'Record created' });
      }
      setShowForm(false);
      setEditId(null);
      reset();
      loadData();
    } catch (err: any) {
      const detail = err.response?.data?.details?.[0];
      toast({
        type: 'error',
        title: detail ? `${detail.field}: ${detail.message}` : (err.response?.data?.error || 'Error saving record')
      });
    }
  };

  const handleEdit = (rec: WaterMeterData) => {
    const meterType = getMeterTypeFromRecord(rec);

    setEditId(rec.id);
    if (rec.date) setValue('date', new Date(rec.date).toISOString().split('T')[0]);
    setValue('meter_type', meterType);
    setValue('reading', getReadingForMeter(rec, meterType));
    setValue('notes', rec.notes || '');
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try { await waterService.delete(id); toast({ type: 'success', title: 'Record deleted' }); loadData(); }
    catch { toast({ type: 'error', title: 'Delete failed' }); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Droplets className="h-7 w-7 text-blue-500" />
            Water Meter Data
          </h1>
          <p className="text-muted-foreground">Manage daily water meter records</p>
        </div>
        <Button onClick={() => { setEditId(null); reset(); setShowForm(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Record
        </Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          <Card>
            <CardHeader><CardTitle>{editId ? 'Edit' : 'New'} Water Record</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Date</Label>
                  <Input type="date" {...register('date')} />
                  {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
                </div>

                <div>
                  <Label>Meter Type</Label>
                  <select
                    {...register('meter_type')}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {METER_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  {errors.meter_type && <p className="text-xs text-red-500 mt-1">{errors.meter_type.message}</p>}
                </div>

                <div>
                  <Label>Reading</Label>
                  <Input type="number" step="0.01" {...register('reading')} placeholder="0.00" />
                  {errors.reading && <p className="text-xs text-red-500 mt-1">{errors.reading.message}</p>}
                </div>

                {selectedMeterType === 'other' && (
                  <div className="md:col-span-2">
                    <Label>Note</Label>
                    <Input {...register('notes')} placeholder="Add custom note" />
                    {errors.notes && <p className="text-xs text-red-500 mt-1">{errors.notes.message}</p>}
                  </div>
                )}

                <div className="md:col-span-2 lg:col-span-4 flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditId(null); reset(); }}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Saving...' : editId ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filter by date (YYYY-MM-DD)"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Meter Type</TableHead>
                <TableHead className="text-right">Reading</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : records.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No records found</TableCell></TableRow>
              ) : records.map(rec => {
                const meterType = getMeterTypeFromRecord(rec);
                const reading = getReadingForMeter(rec, meterType);

                return (
                  <TableRow key={rec.id}>
                    <TableCell>{new Date(rec.date).toLocaleDateString()}</TableCell>
                    <TableCell>{getMeterLabel(meterType)}</TableCell>
                    <TableCell className="text-right font-medium">{reading != null ? reading.toFixed(2) : '—'}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{rec.notes || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(rec)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Record?</AlertDialogTitle>
                              <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(rec.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}