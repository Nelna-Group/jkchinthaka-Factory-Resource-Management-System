const BaseService = require('./base.service');
const db = require('../models/db');

class ElectricityService extends BaseService {
  constructor() {
    super('electricity_data');
  }

  async findAllWithAsset(params) {
    const { page = 1, limit = 20, sort = 'date', order = 'desc', startDate, endDate, asset_id } = params;
    const offset = (page - 1) * limit;
    let where = ['1=1'];
    let queryParams = [];

    if (startDate) { where.push('e.date >= ?'); queryParams.push(startDate); }
    if (endDate) { where.push('e.date <= ?'); queryParams.push(endDate); }
    if (asset_id) { where.push('e.asset_id = ?'); queryParams.push(asset_id); }

    const whereClause = where.join(' AND ');

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM electricity_data e WHERE ${whereClause}`, queryParams
    );

    const [rows] = await db.query(
      `SELECT e.*, a.name as asset_name, a.location as asset_location
       FROM electricity_data e
       LEFT JOIN assets a ON e.asset_id = a.id
       WHERE ${whereClause}
       ORDER BY e.${sort === 'date' ? 'date' : 'id'} ${order === 'asc' ? 'ASC' : 'DESC'}
       OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
      [...queryParams, offset, limit]
    );

    return {
      data: rows,
      pagination: {
        page, limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    };
  }

  async getMonthlyTrend(year) {
    const [rows] = await db.query(
      `SELECT MONTH(date) as month, SUM(energy_kWh) as total_kWh, SUM(cost) as total_cost,
              AVG(energy_kWh) as avg_kWh, COUNT(*) as readings
       FROM electricity_data
       WHERE YEAR(date) = ?
       GROUP BY MONTH(date)
       ORDER BY month`,
      [year]
    );
    return rows;
  }

  async getDailySummary(startDate, endDate) {
    const [rows] = await db.query(
      `SELECT date, SUM(energy_kWh) as total_kWh, SUM(cost) as total_cost
       FROM electricity_data
       WHERE date BETWEEN ? AND ?
       GROUP BY date ORDER BY date`,
      [startDate, endDate]
    );
    return rows;
  }
}

module.exports = new ElectricityService();
