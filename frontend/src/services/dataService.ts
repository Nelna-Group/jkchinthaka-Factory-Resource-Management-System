import api from './api';
import type { AuthResponse } from '../models/types';

export const authService = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data } = await api.post('/auth/login', { email, password });
    return data;
  },
  getProfile: async () => {
    const { data } = await api.get('/auth/profile');
    return data;
  },
  changePassword: async (oldPassword: string, newPassword: string) => {
    const { data } = await api.post('/auth/change-password', { oldPassword, newPassword });
    return data;
  },
};

export const electricityService = {
  getAll: async (params?: Record<string, string | number>) => {
    const { data } = await api.get('/electricity', { params });
    return data;
  },
  getById: async (id: number) => {
    const { data } = await api.get(`/electricity/${id}`);
    return data;
  },
  create: async (body: Record<string, unknown>) => {
    const { data } = await api.post('/electricity', body);
    return data;
  },
  update: async (id: number, body: Record<string, unknown>) => {
    const { data } = await api.put(`/electricity/${id}`, body);
    return data;
  },
  delete: async (id: number) => {
    const { data } = await api.delete(`/electricity/${id}`);
    return data;
  },
  getTrend: async (year?: number) => {
    const { data } = await api.get('/electricity/trend', { params: { year } });
    return data;
  },
};

export const waterService = {
  getAll: async (params?: Record<string, string | number>) => {
    const { data } = await api.get('/water', { params });
    return data;
  },
  getById: async (id: number) => {
    const { data } = await api.get(`/water/${id}`);
    return data;
  },
  create: async (body: Record<string, unknown>) => {
    const { data } = await api.post('/water', body);
    return data;
  },
  update: async (id: number, body: Record<string, unknown>) => {
    const { data } = await api.put(`/water/${id}`, body);
    return data;
  },
  delete: async (id: number) => {
    const { data } = await api.delete(`/water/${id}`);
    return data;
  },
  getTrend: async (year?: number) => {
    const { data } = await api.get('/water/trend', { params: { year } });
    return data;
  },
};

export const scheduleService = {
  getAll: async (params?: Record<string, string | number>) => {
    const { data } = await api.get('/schedule', { params });
    return data;
  },
  getById: async (id: number) => {
    const { data } = await api.get(`/schedule/${id}`);
    return data;
  },
  create: async (body: Record<string, unknown>) => {
    const { data } = await api.post('/schedule', body);
    return data;
  },
  update: async (id: number, body: Record<string, unknown>) => {
    const { data } = await api.put(`/schedule/${id}`, body);
    return data;
  },
  delete: async (id: number) => {
    const { data } = await api.delete(`/schedule/${id}`);
    return data;
  },
  getMonthSchedule: async (year?: number, month?: number) => {
    const { data } = await api.get('/schedule/month', { params: { year, month } });
    return data;
  },
  getAttendance: async (year?: number, month?: number) => {
    const { data } = await api.get('/schedule/attendance', { params: { year, month } });
    return data;
  },
};

export const productionService = {
  getAll: async (params?: Record<string, string | number>) => {
    const { data } = await api.get('/production', { params });
    return data;
  },
  getById: async (id: number) => {
    const { data } = await api.get(`/production/${id}`);
    return data;
  },
  create: async (body: Record<string, unknown>) => {
    const { data } = await api.post('/production', body);
    return data;
  },
  update: async (id: number, body: Record<string, unknown>) => {
    const { data } = await api.put(`/production/${id}`, body);
    return data;
  },
  delete: async (id: number) => {
    const { data } = await api.delete(`/production/${id}`);
    return data;
  },
  getAchievement: async (year?: number) => {
    const { data } = await api.get('/production/achievement', { params: { year } });
    return data;
  },
  getPerformance: async (startDate?: string, endDate?: string) => {
    const { data } = await api.get('/production/performance', { params: { startDate, endDate } });
    return data;
  },
};

export const analyticsService = {
  getDashboard: async (year?: number, month?: number) => {
    const { data } = await api.get('/analytics/dashboard', { params: { year, month } });
    return data;
  },
  getAlerts: async () => {
    const { data } = await api.get('/analytics/alerts');
    return data;
  },
};

export const userService = {
  getAll: async (params?: Record<string, string | number>) => {
    const { data } = await api.get('/users', { params });
    return data;
  },
  getById: async (id: number) => {
    const { data } = await api.get(`/users/${id}`);
    return data;
  },
  create: async (body: Record<string, unknown>) => {
    const { data } = await api.post('/users', body);
    return data;
  },
  update: async (id: number, body: Record<string, unknown>) => {
    const { data } = await api.put(`/users/${id}`, body);
    return data;
  },
  delete: async (id: number) => {
    const { data } = await api.delete(`/users/${id}`);
    return data;
  },
  getRoles: async () => {
    const { data } = await api.get('/users/roles');
    return data;
  },
};

export const reportService = {
  downloadElectricity: (params: Record<string, string>) =>
    api.get('/reports/electricity', { params, responseType: 'blob' }),
  downloadWater: (params: Record<string, string>) =>
    api.get('/reports/water', { params, responseType: 'blob' }),
  downloadProduction: (params: Record<string, string>) =>
    api.get('/reports/production', { params, responseType: 'blob' }),
  downloadSchedule: (params: Record<string, string>) =>
    api.get('/reports/schedule', { params, responseType: 'blob' }),
};

export const assetService = {
  getAll: async (params?: Record<string, string | number>) => {
    const { data } = await api.get('/assets', { params });
    return data;
  },
  create: async (body: Record<string, unknown>) => {
    const { data } = await api.post('/assets', body);
    return data;
  },
  update: async (id: number, body: Record<string, unknown>) => {
    const { data } = await api.put(`/assets/${id}`, body);
    return data;
  },
  delete: async (id: number) => {
    const { data } = await api.delete(`/assets/${id}`);
    return data;
  },
};

export const attendanceService = {
  getByDate: async (date: string) => {
    const { data } = await api.get('/attendance', { params: { date } });
    return data;
  },
  getSummary: async (date: string) => {
    const { data } = await api.get('/attendance/summary', { params: { date } });
    return data;
  },
  mark: async (body: { attendance_date: string; user_id: number; status: 'active' | 'deactive'; notes?: string }) => {
    const { data } = await api.post('/attendance/mark', body);
    return data;
  }
};
