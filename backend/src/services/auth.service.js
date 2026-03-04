const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models/db');
const logger = require('../utils/logger');

class AuthService {
  async login(email, password) {
    const [users] = await db.query(
      `SELECT u.*, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email = ? AND u.is_active = 1`,
      [email]
    );

    if (users.length === 0) {
      throw { status: 401, message: 'Invalid credentials' };
    }

    const user = users[0];
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      throw { status: 401, message: 'Invalid credentials' };
    }

    // Update last login
    await db.query('UPDATE users SET last_login = GETDATE() WHERE id = ?', [user.id]);

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    return {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    };
  }

  async register(data) {
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [data.email]);
    if (existing.length > 0) {
      throw { status: 409, message: 'Email already registered' };
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, role_id) VALUES (?, ?, ?, ?); SELECT SCOPE_IDENTITY() AS insertId',
      [data.name, data.email, passwordHash, data.role_id || 3]
    );

    logger.info(`New user registered: ${data.email}`);
    return { id: result.insertId, name: data.name, email: data.email };
  }

  async changePassword(userId, oldPassword, newPassword) {
    const [users] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      throw { status: 404, message: 'User not found' };
    }

    const isValid = await bcrypt.compare(oldPassword, users[0].password_hash);
    if (!isValid) {
      throw { status: 401, message: 'Current password is incorrect' };
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [newHash, userId]);
    return { message: 'Password changed successfully' };
  }
}

module.exports = new AuthService();
