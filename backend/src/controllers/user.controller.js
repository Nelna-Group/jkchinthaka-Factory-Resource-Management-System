const db = require('../models/db');
const bcrypt = require('bcryptjs');
const { handleDbError, emptyPaginatedResponse, isDbConnectionError } = require('../utils/db-fallback');

const DEV_FALLBACK_ENABLED = process.env.NODE_ENV !== 'production' && process.env.ALLOW_DEV_AUTH_FALLBACK !== 'false';
const DEV_ROLES = [
  { id: 1, name: 'Admin' },
  { id: 2, name: 'Manager' },
  { id: 3, name: 'Data Entry' }
];
const ROLE_ID_TO_NAME = { 1: 'Admin', 2: 'Manager', 3: 'Data Entry' };
let devUsers = [
  {
    id: 1,
    name: 'System Admin',
    email: 'admin@fupms.com',
    password_hash: '$2a$10$ZJ3aBAvb24umIRrz2JIuFetiNRlmQA32cb1L7aqt19xrYEDinmGCK',
    role_id: 1,
    is_active: true,
    last_login: null,
    created_at: new Date().toISOString()
  },
  {
    id: 2,
    name: 'Factory Manager',
    email: 'manager@fupms.com',
    password_hash: '$2a$10$ZJ3aBAvb24umIRrz2JIuFetiNRlmQA32cb1L7aqt19xrYEDinmGCK',
    role_id: 2,
    is_active: true,
    last_login: null,
    created_at: new Date().toISOString()
  },
  {
    id: 3,
    name: 'Data Operator',
    email: 'operator@fupms.com',
    password_hash: '$2a$10$ZJ3aBAvb24umIRrz2JIuFetiNRlmQA32cb1L7aqt19xrYEDinmGCK',
    role_id: 3,
    is_active: true,
    last_login: null,
    created_at: new Date().toISOString()
  }
];
let devNextId = 4;

function mapDevUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: ROLE_ID_TO_NAME[user.role_id] || 'Data Entry',
    is_active: user.is_active,
    last_login: user.last_login,
    created_at: user.created_at
  };
}

function getDevUsersPage(page, limit, filter) {
  let rows = [...devUsers].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  if (typeof filter === 'string' && filter.startsWith('name:')) {
    const term = filter.substring(5).trim().toLowerCase();
    if (term) {
      rows = rows.filter((u) => String(u.name || '').toLowerCase().includes(term));
    }
  }

  const offset = (page - 1) * limit;
  const paged = rows.slice(offset, offset + limit).map(mapDevUser);
  return {
    data: paged,
    pagination: {
      page,
      limit,
      total: rows.length,
      totalPages: Math.ceil(rows.length / limit)
    }
  };
}

function useDevFallback(error) {
  return DEV_FALLBACK_ENABLED && isDbConnectionError(error);
}

const getAll = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    let result;
    try {
      const offset = (parsedPage - 1) * parsedLimit;
      
      const [countResult] = await db.query('SELECT COUNT(*) as total FROM users');
      const [users] = await db.query(
        `SELECT u.id, u.name, u.email, r.name as role, u.is_active, u.last_login, u.created_at
         FROM users u JOIN roles r ON u.role_id = r.id
         ORDER BY u.created_at DESC OFFSET ? ROWS FETCH NEXT ? ROWS ONLY`,
        [offset, parsedLimit]
      );

      result = {
        data: users,
        pagination: {
          page: parsedPage, limit: parsedLimit,
          total: countResult[0].total,
          totalPages: Math.ceil(countResult[0].total / parsedLimit)
        }
      };
    } catch (dbErr) {
      if (useDevFallback(dbErr)) {
        result = getDevUsersPage(parsedPage, parsedLimit, req.query.filter);
      } else {
        result = handleDbError(dbErr, emptyPaginatedResponse(parsedPage, parsedLimit));
      }
    }
    res.json(result);
  } catch (error) { next(error); }
};

const getById = async (req, res, next) => {
  try {
    try {
      const [users] = await db.query(
        `SELECT u.id, u.name, u.email, r.name as role, u.is_active, u.last_login, u.created_at
         FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
        [req.params.id]
      );
      if (users.length === 0) return res.status(404).json({ error: 'User not found' });
      res.json(users[0]);
    } catch (dbErr) {
      if (!useDevFallback(dbErr)) throw dbErr;
      const user = devUsers.find((u) => u.id === parseInt(req.params.id));
      if (!user) return res.status(404).json({ error: 'User not found' });
      res.json(mapDevUser(user));
    }
  } catch (error) { next(error); }
};

const ROLE_MAP = { admin: 1, manager: 2, 'data entry': 3, viewer: 3, operator: 3 };

function resolveRoleId(body) {
  if (body.role_id) return parseInt(body.role_id);
  if (body.role) return ROLE_MAP[body.role.toLowerCase()] || 3;
  return null;
}

const create = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;
    const roleId = resolveRoleId(req.body) || 3;
    const passwordHash = await bcrypt.hash(password, 10);
    try {
      const [result] = await db.query(
        'INSERT INTO users (name, email, password_hash, role_id) VALUES (?, ?, ?, ?); SELECT SCOPE_IDENTITY() AS insertId',
        [name, email, passwordHash, roleId]
      );
      res.status(201).json({ id: result.insertId, name, email });
    } catch (dbErr) {
      if (!useDevFallback(dbErr)) throw dbErr;
      if (devUsers.some((u) => String(u.email).toLowerCase() === String(email).toLowerCase())) {
        return res.status(409).json({ error: 'Email already exists' });
      }
      const newUser = {
        id: devNextId++,
        name,
        email,
        password_hash: passwordHash,
        role_id: roleId,
        is_active: true,
        last_login: null,
        created_at: new Date().toISOString()
      };
      devUsers.unshift(newUser);
      res.status(201).json({ id: newUser.id, name: newUser.name, email: newUser.email });
    }
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY' || error.number === 2627 || error.number === 2601) return res.status(409).json({ error: 'Email already exists' });
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const { name, email, is_active } = req.body;
    const roleId = resolveRoleId(req.body);
    try {
      await db.query(
        'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email), role_id = COALESCE(?, role_id), is_active = COALESCE(?, is_active) WHERE id = ?',
        [name, email, roleId, is_active, req.params.id]
      );
      const [users] = await db.query(
        `SELECT u.id, u.name, u.email, r.name as role, u.is_active FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?`,
        [req.params.id]
      );
      res.json(users[0]);
    } catch (dbErr) {
      if (!useDevFallback(dbErr)) throw dbErr;
      const idx = devUsers.findIndex((u) => u.id === parseInt(req.params.id));
      if (idx < 0) return res.status(404).json({ error: 'User not found' });
      const existing = devUsers[idx];
      const updated = {
        ...existing,
        name: name ?? existing.name,
        email: email ?? existing.email,
        role_id: roleId ?? existing.role_id,
        is_active: is_active ?? existing.is_active
      };
      devUsers[idx] = updated;
      res.json(mapDevUser(updated));
    }
  } catch (error) { next(error); }
};

const remove = async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }
    try {
      await db.query('DELETE FROM users WHERE id = ?', [req.params.id]);
      res.json({ message: 'User deleted' });
    } catch (dbErr) {
      if (!useDevFallback(dbErr)) throw dbErr;
      devUsers = devUsers.filter((u) => u.id !== parseInt(req.params.id));
      res.json({ message: 'User deleted' });
    }
  } catch (error) { next(error); }
};

const getRoles = async (req, res, next) => {
  try {
    try {
      const [roles] = await db.query('SELECT * FROM roles');
      res.json(roles);
    } catch (dbErr) {
      if (!useDevFallback(dbErr)) throw dbErr;
      res.json(DEV_ROLES);
    }
  } catch (error) { next(error); }
};

module.exports = { getAll, getById, create, update, remove, getRoles };
