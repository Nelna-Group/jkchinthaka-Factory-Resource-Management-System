const { z } = require('zod');

const validate = (schema) => {
  return (req, res, next) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
};

const validateQuery = (schema) => {
  return (req, res, next) => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
          }))
        });
      }
      next(error);
    }
  };
};

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role_id: z.number().int().min(1).max(3).optional()
});

const electricitySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  energy_kWh: z.number().positive('Energy must be positive'),
  cost: z.number().min(0, 'Cost cannot be negative'),
  peak_kW: z.number().optional(),
  off_peak_kWh: z.number().optional(),
  asset_id: z.number().int().positive('Asset ID required'),
  notes: z.string().optional()
});

const waterMeterSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  intake: z.number().positive('Intake must be positive'),
  ppu_reading: z.number().optional(),
  fpu_reading: z.number().optional(),
  chiller: z.number().optional(),
  cooling_tower: z.number().optional(),
  column_data: z.any().optional(),
  cost: z.number().optional(),
  notes: z.string().optional()
});

const workScheduleSchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  is_holiday: z.boolean().optional(),
  holiday_name: z.string().optional(),
  ppu_planned: z.number().int().min(0).optional(),
  ppu_actual: z.number().int().min(0).optional(),
  fpu_planned: z.number().int().min(0).optional(),
  fpu_actual: z.number().int().min(0).optional(),
  fmu_planned: z.number().int().min(0).optional(),
  fmu_actual: z.number().int().min(0).optional(),
  notes: z.string().optional()
});

const productionTargetSchema = z.object({
  line_id: z.string().min(1, 'Line ID required'),
  product_group: z.string().min(1, 'Product group required'),
  production_unit: z.string().min(1, 'Production unit required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  target: z.number().positive('Target must be positive'),
  actual: z.number().min(0).optional(),
  notes: z.string().optional()
});

const assetSchema = z.object({
  name: z.string().min(1, 'Name required'),
  type: z.string().min(1, 'Type required'),
  location: z.string().optional(),
  description: z.string().optional()
});

const attendanceMarkSchema = z.object({
  attendance_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  user_id: z.number().int().positive('User ID required'),
  status: z.enum(['active', 'deactive']),
  notes: z.string().max(255).optional()
});

const paginationSchema = z.object({
  page: z.string().transform(Number).pipe(z.number().int().min(1)).optional(),
  limit: z.string().transform(Number).pipe(z.number().int().min(1).max(100)).optional(),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional()
});

module.exports = {
  validate,
  validateQuery,
  loginSchema,
  registerSchema,
  electricitySchema,
  waterMeterSchema,
  workScheduleSchema,
  productionTargetSchema,
  assetSchema,
  attendanceMarkSchema,
  paginationSchema
};
