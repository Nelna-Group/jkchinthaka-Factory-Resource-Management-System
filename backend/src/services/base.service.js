const db = require('../models/db');

class BaseService {
  constructor(tableName) {
    this.table = tableName;
  }

  async findAll({ page = 1, limit = 20, sort = 'id', order = 'desc', search, startDate, endDate, filters = {} }) {
    const offset = (page - 1) * limit;
    let where = ['1=1'];
    let params = [];

    if (startDate) {
      where.push('date >= ?');
      params.push(startDate);
    }
    if (endDate) {
      where.push('date <= ?');
      params.push(endDate);
    }

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        where.push(`${key} = ?`);
        params.push(value);
      }
    });

    const whereClause = where.join(' AND ');
    const allowedSorts = ['id', 'date', 'created_at', 'name'];
    const safeSort = allowedSorts.includes(sort) ? sort : 'id';
    const safeOrder = order === 'asc' ? 'ASC' : 'DESC';

    const [countResult] = await db.query(
      `SELECT COUNT(*) as total FROM ${this.table} WHERE ${whereClause}`, params
    );

    const [rows] = await db.query(
      `SELECT * FROM ${this.table} WHERE ${whereClause} ORDER BY ${safeSort} ${safeOrder} OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
      [...params, offset, limit]
    );

    return {
      data: rows,
      pagination: {
        page,
        limit,
        total: countResult[0].total,
        totalPages: Math.ceil(countResult[0].total / limit)
      }
    };
  }

  async findById(id) {
    const [rows] = await db.query(`SELECT * FROM ${this.table} WHERE id = ?`, [id]);
    return rows[0] || null;
  }

  async create(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map(() => '?').join(', ');
    
    const [result] = await db.query(
      `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders}); SELECT SCOPE_IDENTITY() AS insertId`,
      values
    );
    return { id: result.insertId, ...data };
  }

  async update(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    
    await db.query(
      `UPDATE ${this.table} SET ${setClause} WHERE id = ?`,
      [...values, id]
    );
    return this.findById(id);
  }

  async delete(id) {
    const item = await this.findById(id);
    if (!item) return null;
    await db.query(`DELETE FROM ${this.table} WHERE id = ?`, [id]);
    return item;
  }
}

module.exports = BaseService;
