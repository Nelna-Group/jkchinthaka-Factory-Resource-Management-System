const db = require('../models/db');
const waterService = require('./water.service');

class AnalyticsService {
  async getDashboardKPIs(year, month) {
    await waterService.ensureTable();

    const safeYear = parseInt(year) || new Date().getFullYear();
    const safeMonth = month ? parseInt(month) : null;

    const dateCondition = safeMonth
      ? 'YEAR(date) = ? AND MONTH(date) = ?'
      : 'YEAR(date) = ?';
    const dateParams = safeMonth ? [safeYear, safeMonth] : [safeYear];

    const dayCondition = safeMonth
      ? 'YEAR(day) = ? AND MONTH(day) = ?'
      : 'YEAR(day) = ?';
    const dayParams = safeMonth ? [safeYear, safeMonth] : [safeYear];

    // Electricity summary
    const [elec] = await db.query(
      `SELECT COALESCE(SUM(energy_kWh), 0) as total_kWh, COALESCE(SUM(cost), 0) as total_cost
       FROM electricity_data WHERE ${dateCondition}`,
      dateParams
    );

    // Water summary
    const [water] = await db.query(
      `SELECT COALESCE(SUM(intake), 0) as total_intake, COALESCE(SUM(cost), 0) as total_cost
       FROM dbo.water_meter_data WHERE ${dateCondition}`,
      dateParams
    );

    // Production summary
    const [prod] = await db.query(
      `SELECT COALESCE(SUM(target), 0) as total_target, COALESCE(SUM(actual), 0) as total_actual
       FROM production_target_new WHERE ${dateCondition}`,
      dateParams
    );

    // Schedule summary
    const [sched] = await db.query(
      `SELECT COUNT(*) as total_days,
              SUM(CASE WHEN is_holiday = 1 THEN 1 ELSE 0 END) as holidays,
              COALESCE(SUM(ppu_planned + fpu_planned + fmu_planned), 0) as total_planned,
              COALESCE(SUM(ppu_actual + fpu_actual + fmu_actual), 0) as total_actual
       FROM work_schedule WHERE ${dayCondition}`,
      dayParams
    );

    const totalTarget = parseFloat(prod[0].total_target) || 1;
    const totalActual = parseFloat(prod[0].total_actual) || 0;
    const totalPlanned = parseInt(sched[0].total_planned) || 1;
    const totalActualAttendance = parseInt(sched[0].total_actual) || 0;

    return {
      electricity: {
        total_kWh: parseFloat(elec[0].total_kWh),
        total_cost: parseFloat(elec[0].total_cost)
      },
      water: {
        total_intake: parseFloat(water[0].total_intake),
        total_cost: parseFloat(water[0].total_cost)
      },
      production: {
        total_target: totalTarget,
        total_actual: totalActual,
        achievement_pct: Math.round((totalActual / totalTarget) * 100 * 100) / 100
      },
      attendance: {
        total_days: parseInt(sched[0].total_days) || 0,
        holidays: parseInt(sched[0].holidays) || 0,
        attendance_pct: Math.round((totalActualAttendance / totalPlanned) * 100 * 100) / 100
      },
      kpi: {
        cost_per_unit: totalActual > 0 ? Math.round((parseFloat(elec[0].total_cost) + parseFloat(water[0].total_cost)) / totalActual * 100) / 100 : 0,
        energy_per_unit: totalActual > 0 ? Math.round(parseFloat(elec[0].total_kWh) / totalActual * 100) / 100 : 0,
        water_per_unit: totalActual > 0 ? Math.round(parseFloat(water[0].total_intake) / totalActual * 100) / 100 : 0
      }
    };
  }

  async getAlerts() {
    await waterService.ensureTable();

    const [thresholds] = await db.query('SELECT * FROM alert_thresholds WHERE is_active = 1');
    const alerts = [];

    for (const t of thresholds) {
      if (t.metric === 'electricity_daily_kWh') {
        const [recent] = await db.query(
          `SELECT date, SUM(energy_kWh) as total FROM electricity_data WHERE date >= DATEADD(DAY, -7, GETDATE()) GROUP BY date HAVING SUM(energy_kWh) > ?`,
          [t.warning_threshold]
        );
        recent.forEach(r => {
          alerts.push({
            type: parseFloat(r.total) > t.critical_threshold ? 'critical' : 'warning',
            metric: 'Electricity',
            message: `High electricity usage on ${r.date}: ${r.total} kWh`,
            date: r.date
          });
        });
      }
      if (t.metric === 'water_daily_intake') {
        const [recent] = await db.query(
          `SELECT date, SUM(intake) as total FROM dbo.water_meter_data WHERE date >= DATEADD(DAY, -7, GETDATE()) GROUP BY date HAVING SUM(intake) > ?`,
          [t.warning_threshold]
        );
        recent.forEach(r => {
          alerts.push({
            type: parseFloat(r.total) > t.critical_threshold ? 'critical' : 'warning',
            metric: 'Water',
            message: `High water usage on ${r.date}: ${r.total} m³`,
            date: r.date
          });
        });
      }
      if (t.metric === 'production_efficiency') {
        const [recent] = await db.query(
          `SELECT date, line_id, ROUND(actual/target*100, 2) as eff FROM production_target_new WHERE date >= DATEADD(DAY, -7, GETDATE()) AND target > 0 AND ROUND(actual/target*100, 2) < ?`,
          [t.warning_threshold]
        );
        recent.forEach(r => {
          alerts.push({
            type: parseFloat(r.eff) < t.critical_threshold ? 'critical' : 'warning',
            metric: 'Production',
            message: `Low production efficiency on line ${r.line_id} (${r.date}): ${r.eff}%`,
            date: r.date
          });
        });
      }
    }

    return alerts.sort((a, b) => (a.type === 'critical' ? -1 : 1));
  }
}

module.exports = new AnalyticsService();
