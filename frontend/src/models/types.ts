export interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active?: boolean;
  last_login?: string;
  created_at?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ElectricityData {
  id: number;
  date: string;
  energy_kWh: number;
  cost: number;
  peak_kW?: number;
  off_peak_kWh?: number;
  asset_id: number;
  asset_name?: string;
  asset_location?: string;
  notes?: string;
}

export interface WaterMeterData {
  id: number;
  date: string;
  intake: number;
  ppu1_reading?: number;
  ppu2_reading?: number;
  fpu1_reading?: number;
  fpu2_reading?: number;
  chiller_reading?: number;
  cooling_tower_reading?: number;
  column1?: number;
  column2?: number;
  column3?: number;
  cost?: number;
  notes?: string;
}

export interface WorkSchedule {
  id: number;
  day: string;
  is_holiday: boolean;
  holiday_name?: string;
  ppu_planned: number;
  ppu_actual: number;
  fpu_planned: number;
  fpu_actual: number;
  fmu_planned: number;
  fmu_actual: number;
  notes?: string;
}

export interface ProductionTarget {
  id: number;
  line_id: string;
  product_group: string;
  production_unit: string;
  date: string;
  target: number;
  actual: number;
  efficiency?: number;
  notes?: string;
}

export interface Asset {
  id: number;
  name: string;
  type: string;
  location?: string;
  description?: string;
  is_active?: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardKPIs {
  electricity: { total_kWh: number; total_cost: number };
  water: { total_intake: number; total_cost: number };
  production: { total_target: number; total_actual: number; achievement_pct: number };
  attendance: { total_days: number; holidays: number; attendance_pct: number };
  kpi: { cost_per_unit: number; energy_per_unit: number; water_per_unit: number };
}

export interface Alert {
  type: 'warning' | 'critical';
  metric: string;
  message: string;
  date: string;
}
