import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Zap, Droplets, Target, Users, TrendingUp, DollarSign, AlertTriangle, Calendar } from 'lucide-react';
import { analyticsService, electricityService, waterService, productionService } from '../services/dataService';
import type { DashboardKPIs, Alert } from '../models/types';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DashboardPage() {
  const dashboardYear = new Date().getFullYear();
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [elecTrend, setElecTrend] = useState<any[]>([]);
  const [waterTrend, setWaterTrend] = useState<any[]>([]);
  const [prodTrend, setProdTrend] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [kpiData, alertData, elecData, waterData, prodData] = await Promise.all([
        analyticsService.getDashboard(dashboardYear).catch(() => null),
        analyticsService.getAlerts().catch(() => []),
        electricityService.getTrend(dashboardYear).catch(() => []),
        waterService.getTrend(dashboardYear).catch(() => []),
        productionService.getAchievement(dashboardYear).catch(() => []),
      ]);
      setKpis(kpiData);
      setAlerts(alertData || []);
      setElecTrend((elecData || []).map((d: any) => ({ ...d, month: monthNames[d.month - 1] })));
      setWaterTrend((waterData || []).map((d: any) => ({ ...d, month: monthNames[d.month - 1] })));
      setProdTrend((prodData || []).map((d: any) => ({ ...d, month: monthNames[d.month - 1] })));
    } catch (error) {
      console.error('Dashboard load error:', error);
    } finally {
      setLoading(false);
    }
  };

  const cards = kpis ? [
    { title: 'Total Electricity Cost', value: `$${(kpis.electricity?.total_cost ?? 0).toLocaleString()}`, icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10' },
    { title: 'Total Water Usage', value: `${(kpis.water?.total_intake ?? 0).toLocaleString()} m³`, icon: Droplets, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { title: 'Production Achievement', value: `${kpis.production?.achievement_pct ?? 0}%`, icon: Target, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
    { title: 'Attendance Rate', value: `${kpis.attendance?.attendance_pct ?? 0}%`, icon: Users, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10' },
    { title: 'Holidays', value: `${kpis.attendance?.holidays ?? 0} days`, icon: Calendar, color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
    { title: 'Cost / Unit', value: `$${kpis.kpi?.cost_per_unit ?? 0}`, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { title: 'Energy / Unit', value: `${kpis.kpi?.energy_per_unit ?? 0} kWh`, icon: TrendingUp, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { title: 'Water / Unit', value: `${kpis.kpi?.water_per_unit ?? 0} m³`, icon: Droplets, color: 'text-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-500/10' },
  ] : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Factory Utility & Production Overview — {dashboardYear}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold mt-1">{card.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${card.bg}`}>
                    <card.icon className={`h-6 w-6 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-500" /> Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {alerts.slice(0, 5).map((alert, i) => (
                <div key={i} className={`flex items-center gap-3 p-3 rounded-lg ${
                  alert.type === 'critical' ? 'bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300' : 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300'
                }`}>
                  <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm">{alert.message}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Electricity Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Electricity Consumption Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={elecTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Area type="monotone" dataKey="total_kWh" name="Total kWh" stroke="#eab308" fill="#eab30830" strokeWidth={2} />
                  <Area type="monotone" dataKey="total_cost" name="Cost ($)" stroke="#22c55e" fill="#22c55e30" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Water Usage Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Water Usage Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={waterTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Line type="monotone" dataKey="total_intake" name="Total Intake (m³)" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="avg_intake" name="Avg Daily (m³)" stroke="#06b6d4" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Production Achievement */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Production Achievement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={prodTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                  <Legend />
                  <Bar dataKey="total_target" name="Target" fill="#3b82f680" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total_actual" name="Actual" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Production Efficiency Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Efficiency Trend (%)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={prodTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis domain={[0, 100]} className="text-xs" />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }} />
                  <Line type="monotone" dataKey="achievement_pct" name="Achievement %" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
