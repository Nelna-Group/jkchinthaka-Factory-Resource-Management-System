const BaseService = require('./base.service');
const db = require('../models/db');

// Mapping from API field names to DB column names (with spaces/brackets)
const COLUMN_MAP = {
  ppu1_reading: '[PPU 1 Reading]',
  ppu2_reading: '[PPU 2 Reading]',
  fpu1_reading: '[FPU 1 Reading]',
  fpu2_reading: '[FPU 2 Reading]',
  chiller_reading: '[Chiller Reading]',
  cooling_tower_reading: '[Cooling tower Reading]',
  column1: '[Column 1]',
  column2: '[Column 2]',
  column3: '[Column 3]',
};

// Reverse mapping: DB column name -> API field name
const REVERSE_MAP = {
  'PPU 1 Reading': 'ppu1_reading',
  'PPU 2 Reading': 'ppu2_reading',
  'FPU 1 Reading': 'fpu1_reading',
  'FPU 2 Reading': 'fpu2_reading',
  'Chiller Reading': 'chiller_reading',
  'Cooling tower Reading': 'cooling_tower_reading',
  'Column 1': 'column1',
  'Column 2': 'column2',
  'Column 3': 'column3',
};

class WaterService extends BaseService {
  constructor() {
    super('dbo.water_meter_data');
    this.ensureTablePromise = null;
  }

  async ensureTable() {
    if (!this.ensureTablePromise) {
      this.ensureTablePromise = db.query(`
        IF OBJECT_ID('dbo.water_meter_data', 'U') IS NULL
        BEGIN
          CREATE TABLE dbo.water_meter_data (
            id INT IDENTITY(1,1) PRIMARY KEY,
            date DATE NOT NULL,
            intake DECIMAL(12,2) NOT NULL,
            [PPU 1 Reading] DECIMAL(12,2) NULL,
            [PPU 2 Reading] DECIMAL(12,2) NULL,
            [FPU 1 Reading] DECIMAL(12,2) NULL,
            [FPU 2 Reading] DECIMAL(12,2) NULL,
            [Chiller Reading] DECIMAL(12,2) NULL,
            [Cooling tower Reading] DECIMAL(12,2) NULL,
            [Column 1] DECIMAL(12,2) NULL,
            [Column 2] DECIMAL(12,2) NULL,
            [Column 3] DECIMAL(12,2) NULL,
            cost DECIMAL(12,2) NULL,
            notes NVARCHAR(MAX) NULL,
            created_by INT NULL,
            created_at DATETIME2 DEFAULT GETDATE(),
            updated_at DATETIME2 DEFAULT GETDATE()
          );
        END;

        IF NOT EXISTS (
          SELECT 1
          FROM sys.indexes
          WHERE name = 'idx_water_date' AND object_id = OBJECT_ID('dbo.water_meter_data')
        )
        BEGIN
          CREATE INDEX idx_water_date ON dbo.water_meter_data(date);
        END;
      `).catch((error) => {
        this.ensureTablePromise = null;
        throw error;
      });
    }

    await this.ensureTablePromise;
  }

  // Convert API field names to DB column names for INSERT/UPDATE
  _toDbData(data) {
    const dbData = {};
    for (const [key, value] of Object.entries(data)) {
      if (COLUMN_MAP[key]) {
        dbData[COLUMN_MAP[key]] = value;
      } else {
        dbData[key] = value;
      }
    }
    return dbData;
  }

  // Convert DB row to API-friendly field names
  _fromDbRow(row) {
    if (!row) return row;
    const result = {};
    for (const [key, value] of Object.entries(row)) {
      if (REVERSE_MAP[key]) {
        result[REVERSE_MAP[key]] = value;
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  _fromDbRows(rows) {
    return (rows || []).map(r => this._fromDbRow(r));
  }

  async findAll(params) {
    await this.ensureTable();
    const result = await super.findAll(params);
    result.data = this._fromDbRows(result.data);
    return result;
  }

  async findById(id) {
    await this.ensureTable();
    const row = await super.findById(id);
    return this._fromDbRow(row);
  }

  async create(data) {
    await this.ensureTable();
    const dbData = this._toDbData(data);
    const keys = Object.keys(dbData);
    const values = Object.values(dbData);
    const placeholders = keys.map(() => '?').join(', ');
    const cols = keys.join(', ');

    const [result] = await db.query(
      `INSERT INTO dbo.water_meter_data (${cols}) VALUES (${placeholders}); SELECT SCOPE_IDENTITY() AS insertId`,
      values
    );
    return { id: result.insertId, ...data };
  }

  async update(id, data) {
    await this.ensureTable();
    const dbData = this._toDbData(data);
    const keys = Object.keys(dbData);
    const values = Object.values(dbData);
    const setClause = keys.map(k => `${k} = ?`).join(', ');

    await db.query(
      `UPDATE dbo.water_meter_data SET ${setClause} WHERE id = ?`,
      [...values, id]
    );
    return this.findById(id);
  }

  async getMonthlyTrend(year) {
    await this.ensureTable();
    const [rows] = await db.query(
      `SELECT MONTH(date) as month, SUM(intake) as total_intake,
              AVG(intake) as avg_intake, SUM(cost) as total_cost, COUNT(*) as readings
        FROM dbo.water_meter_data
       WHERE YEAR(date) = ?
       GROUP BY MONTH(date)
       ORDER BY month`,
      [year]
    );
    return rows;
  }

  async getDailySummary(startDate, endDate) {
    await this.ensureTable();
    const [rows] = await db.query(
      `SELECT date, SUM(intake) as total_intake,
              SUM([PPU 1 Reading]) as total_ppu1, SUM([PPU 2 Reading]) as total_ppu2,
              SUM([FPU 1 Reading]) as total_fpu1, SUM([FPU 2 Reading]) as total_fpu2,
              SUM([Chiller Reading]) as total_chiller,
              SUM([Cooling tower Reading]) as total_cooling
        FROM dbo.water_meter_data
       WHERE date BETWEEN ? AND ?
       GROUP BY date ORDER BY date`,
      [startDate, endDate]
    );
    return rows;
  }

  async delete(id) {
    await this.ensureTable();
    return super.delete(id);
  }
}

module.exports = new WaterService();
