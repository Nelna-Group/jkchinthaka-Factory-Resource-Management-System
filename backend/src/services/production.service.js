const BaseService = require('./base.service');
const db = require('../models/db');

class ProductionService extends BaseService {
  constructor() {
    super('production_target_new');
  }

  async findAllWithDetails(params) {
    const { page = 1, limit = 20, sort = 'date', order = 'desc', startDate, endDate, line_id, product_group } = params;
    const offset = (page - 1) * limit;
    let where = ['1=1'];
    let queryParams = [];

    if (startDate) { where.push('date >= ?'); queryParams.push(startDate); }
    if (endDate) { where.push('date <= ?'); queryParams.push(endDate); }
    if (line_id) { where.push('line_id = ?'); queryParams.push(line_id); }
    if (product_group) { where.push('product_group = ?'); queryParams.push(product_group); }

    const whereClause = where.join(' AND ');

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM production_target_new WHERE ${whereClause}`, queryParams
    );

    const [rows] = await db.query(
      `SELECT * FROM production_target_new
       WHERE ${whereClause}
       ORDER BY ${sort === 'date' ? 'date' : 'id'} ${order === 'asc' ? 'ASC' : 'DESC'}
       OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
      [...queryParams, offset, limit]
    );

    return {
      data: rows,
      pagination: { page, limit, total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) }
    };
  }

  async getMonthlyAchievement(year) {
    const [rows] = await db.query(
      `SELECT MONTH(date) as month, 
              SUM(target) as total_target, SUM(actual) as total_actual,
              ROUND(SUM(actual)/SUM(target)*100, 2) as achievement_pct,
              COUNT(DISTINCT line_id) as active_lines
       FROM production_target_new
       WHERE YEAR(date) = ?
       GROUP BY MONTH(date)
       ORDER BY month`,
      [year]
    );
    return rows;
  }

  async getLinePerformance(startDate, endDate) {
    const [rows] = await db.query(
      `SELECT line_id, product_group,
              SUM(target) as total_target, SUM(actual) as total_actual,
              ROUND(SUM(actual)/SUM(target)*100, 2) as efficiency
       FROM production_target_new
       WHERE date BETWEEN ? AND ?
       GROUP BY line_id, product_group
       ORDER BY efficiency DESC`,
      [startDate, endDate]
    );
    return rows;
  }
}

module.exports = new ProductionService();
