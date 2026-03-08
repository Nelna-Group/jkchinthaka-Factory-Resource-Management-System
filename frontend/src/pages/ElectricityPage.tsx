import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../components/ui/alert-dialog';
import { useToast } from '../components/ui/toast-provider';
import { electricityService, assetService } from '../services/dataService';
import type { ElectricityData, Asset } from '../models/types';
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, Zap, Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const REQUIRED_ASSET_NAMES = [
  'CEB IN 01',
  'FPU 01',
  'REFRIGIRATION AREA',
  'PPU',
  'OLD COLD ROOM',
  'OFFICE AREA',
  'CEB IN 02',
  'CHEMICAL TREATMENT PLANT',
  'FPU 02'
];

const schema = z.object({
  asset_id: z.coerce.number().min(1, 'Select an asset'),
  date: z.string().min(1, 'Date required'),
  energy_kWh: z.coerce.number().min(0),
  cost: z.coerce.number().min(0),
  peak_kW: z.coerce.number().min(0).optional(),
  off_peak_kWh: z.coerce.number().min(0).optional(),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

function sortAssetsForDropdown(inputAssets: Asset[]) {
  const requiredIndex = new Map(REQUIRED_ASSET_NAMES.map((name, idx) => [name.toLowerCase(), idx]));
  return [...inputAssets].sort((a, b) => {
    const ai = requiredIndex.get(String(a.name || '').toLowerCase());
    const bi = requiredIndex.get(String(b.name || '').toLowerCase());
    if (ai !== undefined && bi !== undefined) return ai - bi;
    if (ai !== undefined) return -1;
    if (bi !== undefined) return 1;
    return String(a.name || '').localeCompare(String(b.name || ''));
  });
}

export default function ElectricityPage() {
  const [records, setRecords] = useState<ElectricityData[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const loadData = useCallback(async () => {
    try {
      const params: Record<string, string | number> = { page, limit: 15, sort: 'date', order: 'DESC' };
      if (search) params.filter = `date:${search}`;
      const res = await electricityService.getAll(params);
      setRecords(res.data || []);
      setTotalPages(res.pagination?.totalPages || 1);
    } catch { /* ignore */ } finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => {
    const loadAssets = async () => {
      try {
        const initial = await assetService.getAll({ page: 1, limit: 300, sort: 'id', order: 'asc' });
        let fetchedAssets: Asset[] = initial.data || [];

        const existing = new Set(fetchedAssets.map((a) => String(a.name || '').toLowerCase()));
        const missing = REQUIRED_ASSET_NAMES.filter((name) => !existing.has(name.toLowerCase()));

        // Try to create missing required assets so dropdown always has the expected values.
        if (missing.length > 0) {
          await Promise.all(
            missing.map((name) =>
              assetService.create({
                name,
                type: 'Area',
                location: '',
                description: 'Auto-created for electricity entry dropdown'
              }).catch(() => null)
            )
          );
          const refreshed = await assetService.getAll({ page: 1, limit: 300, sort: 'id', order: 'asc' });
          fetchedAssets = refreshed.data || fetchedAssets;
        }

        setAssets(sortAssetsForDropdown(fetchedAssets));
      } catch {
        setAssets([]);
      }
    };

    loadAssets();
  }, []);

  const onSubmit = async (data: FormData) => {
    try {
      if (editId) {
        await electricityService.update(editId, data);
        toast({ type: 'success', title: 'Record updated' });
      } else {
        await electricityService.create(data);
        toast({ type: 'success', title: 'Record created' });
      }
      setShowForm(false); setEditId(null); reset(); loadData();
    } catch (err: any) {
      toast({ type: 'error', title: err.response?.data?.error || 'Error saving record' });
    }
  };

  const handleEdit = (rec: ElectricityData) => {
    setEditId(rec.id);
    setValue('asset_id', rec.asset_id);
    setValue('energy_kWh', rec.energy_kWh);
    setValue('cost', rec.cost);
    setValue('peak_kW', rec.peak_kW || 0);
    setValue('off_peak_kWh', rec.off_peak_kWh || 0);
    setValue('notes', rec.notes || '');
    if (rec.date) setValue('date', new Date(rec.date).toISOString().split('T')[0]);
    setShowForm(true);
  };

  const handleDelete = async (id: number) => {
    try {
      await electricityService.delete(id);
      toast({ type: 'success', title: 'Record deleted' });
      loadData();
    } catch { toast({ type: 'error', title: 'Delete failed' }); }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><Zap className="h-7 w-7 text-yellow-500" /> Electricity Data</h1>
          <p className="text-muted-foreground">Manage daily electricity consumption records</p>
        </div>
        <Button onClick={() => { setEditId(null); reset(); setShowForm(true); }}><Plus className="h-4 w-4 mr-2" /> Add Record</Button>
      </div>

      {showForm && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}>
          <Card>
            <CardHeader><CardTitle>{editId ? 'Edit' : 'New'} Electricity Record</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label>Asset</Label>
                  <select {...register('asset_id')} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select asset</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                  {errors.asset_id && <p className="text-xs text-red-500 mt-1">{errors.asset_id.message}</p>}
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" {...register('date')} />
                  {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date.message}</p>}
                </div>
                <div>
                  <Label>Energy (kWh)</Label>
                  <Input type="number" step="0.01" {...register('energy_kWh')} placeholder="0.00" />
                </div>
                <div>
                  <Label>Cost ($)</Label>
                  <Input type="number" step="0.01" {...register('cost')} placeholder="0.00" />
                </div>
                <div>
                  <Label>Peak kW</Label>
                  <Input type="number" step="0.01" {...register('peak_kW')} placeholder="0.00" />
                </div>
                <div>
                  <Label>Off-peak kWh</Label>
                  <Input type="number" step="0.01" {...register('off_peak_kWh')} placeholder="0.00" />
                </div>
                <div className="lg:col-span-2">
                  <Label>Notes</Label>
                  <Input {...register('notes')} placeholder="Optional" />
                </div>
                <div className="md:col-span-2 lg:col-span-4 flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => { setShowForm(false); setEditId(null); reset(); }}>Cancel</Button>
                  <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving...' : editId ? 'Update' : 'Create'}</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="flex items-center gap-2 max-w-sm">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input placeholder="Filter by date (YYYY-MM-DD)" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Asset</TableHead>
                <TableHead className="text-right">Energy (kWh)</TableHead>
                <TableHead className="text-right">Peak kW</TableHead>
                <TableHead className="text-right">Off-peak kWh</TableHead>
                <TableHead className="text-right">Cost ($)</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : records.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No records found</TableCell></TableRow>
              ) : records.map(rec => (
                <TableRow key={rec.id}>
                  <TableCell>{new Date(rec.date).toLocaleDateString()}</TableCell>
                  <TableCell>{rec.asset_name || `Asset #${rec.asset_id}`}</TableCell>
                  <TableCell className="text-right font-medium">{rec.energy_kWh.toFixed(2)}</TableCell>
                  <TableCell className="text-right">{rec.peak_kW?.toFixed(2) ?? '—'}</TableCell>
                  <TableCell className="text-right">{rec.off_peak_kWh?.toFixed(2) ?? '—'}</TableCell>
                  <TableCell className="text-right font-medium">${rec.cost.toFixed(2)}</TableCell>
                  <TableCell className="max-w-[150px] truncate">{rec.notes || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(rec)}><Pencil className="h-4 w-4" /></Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></Button>
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /> Prev</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </motion.div>
  );
}
