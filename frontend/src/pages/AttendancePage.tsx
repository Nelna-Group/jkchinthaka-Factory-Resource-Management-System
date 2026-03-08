import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { useToast } from '../components/ui/toast-provider';
import { attendanceService } from '../services/dataService';
import type { AttendanceDateResponse, AttendanceEntry, AttendanceSummary } from '../models/types';
import { UserCheck, ArrowRight, ArrowLeft, RefreshCw } from 'lucide-react';

function todayString() {
  return new Date().toISOString().split('T')[0];
}

function statusBadge(status?: 'active' | 'deactive' | null) {
  if (status === 'active') return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
  if (status === 'deactive') return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
  return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
}

export default function AttendancePage() {
  const [selectedDate, setSelectedDate] = useState(todayString());
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary>({
    date: todayString(),
    total_marked: 0,
    total_active: 0,
    total_deactive: 0
  });
  const [loading, setLoading] = useState(true);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [list, sum] = await Promise.all([
        attendanceService.getByDate(selectedDate) as Promise<AttendanceDateResponse>,
        attendanceService.getSummary(selectedDate) as Promise<AttendanceSummary>
      ]);
      setEntries(list.data || []);
      setSummary(sum || {
        date: selectedDate,
        total_marked: 0,
        total_active: 0,
        total_deactive: 0
      });
    } catch {
      toast({ type: 'error', title: 'Failed to load attendance data' });
      setEntries([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (cancelled) return;
      await loadData();
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  const markAttendance = async (entry: AttendanceEntry, status: 'active' | 'deactive') => {
    try {
      setSavingUserId(entry.user_id);
      await attendanceService.mark({
        attendance_date: selectedDate,
        user_id: entry.user_id,
        status
      });

      setEntries((prev) => prev.map((e) => {
        if (e.user_id !== entry.user_id) return e;
        return { ...e, status };
      }));

      await loadData();
      toast({
        type: 'success',
        title: `${entry.user_name}: ${status === 'active' ? 'Active' : 'Deactive'}`
      });
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Failed to mark attendance';
      toast({ type: 'error', title: msg });
    } finally {
      setSavingUserId(null);
    }
  };

  const pendingCount = Math.max((entries?.length || 0) - (summary.total_marked || 0), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <UserCheck className="h-7 w-7 text-emerald-500" />
            User Attendance Marking
          </h1>
          <p className="text-muted-foreground">Swipe right for Active, swipe left for Deactive</p>
        </div>

        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-[180px]"
          />
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Marked</p>
            <p className="text-2xl font-bold">{summary.total_marked}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-2xl font-bold text-green-600">{summary.total_active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Swipe Instructions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-green-600" /> Swipe right: mark as Active</p>
          <p className="flex items-center gap-2"><ArrowLeft className="h-4 w-4 text-red-600" /> Swipe left: mark as Deactive</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {loading ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">Loading attendance...</CardContent>
          </Card>
        ) : entries.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">No users found</CardContent>
          </Card>
        ) : entries.map((entry) => (
          <motion.div
            key={entry.user_id}
            drag="x"
            dragElastic={0.25}
            dragSnapToOrigin
            onDragEnd={(_, info) => {
              if (savingUserId) return;
              if (info.offset.x > 90) markAttendance(entry, 'active');
              if (info.offset.x < -90) markAttendance(entry, 'deactive');
            }}
            whileDrag={{ scale: 1.02 }}
            className={savingUserId === entry.user_id ? 'opacity-70 pointer-events-none' : ''}
          >
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold">{entry.user_name}</p>
                    <p className="text-xs text-muted-foreground">{entry.user_email}</p>
                    <p className="text-xs text-muted-foreground mt-1">Role: {entry.role}</p>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium capitalize ${statusBadge(entry.status)}`}>
                    {entry.status || 'pending'}
                  </span>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-green-400 text-green-700 hover:bg-green-50"
                    onClick={() => markAttendance(entry, 'active')}
                  >
                    Active
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-400 text-red-700 hover:bg-red-50"
                    onClick={() => markAttendance(entry, 'deactive')}
                  >
                    Deactive
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
