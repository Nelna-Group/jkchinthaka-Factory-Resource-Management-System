require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const sql = require('mssql');
const logger = require('./logger');

async function seed() {
  try {
    logger.info('Starting database seed...');

    // Step 1: Ensure the database exists (connect to master first)
    const masterConfig = {
      server: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '1433'),
      user: process.env.DB_USER || 'nelna_user',
      password: process.env.DB_PASSWORD || '',
      database: 'master',
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_CERT === 'true'
      }
    };

    try {
      const masterPool = new sql.ConnectionPool(masterConfig);
      await masterPool.connect();
      const dbName = process.env.DB_NAME || 'fupms';
      await masterPool.request().query(`
        IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = '${dbName}')
          CREATE DATABASE [${dbName}]
      `);
      await masterPool.close();
      logger.info(`Database '${dbName}' ensured`);
    } catch (err) {
      logger.warn(`Could not create database (may already exist): ${err.message}`);
    }

    // Step 2: Connect to the target database
    const db = require('../models/db');

    // Step 3: Run schema (split on semicolons)
    const schema = fs.readFileSync(path.join(__dirname, '../models/schema.sql'), 'utf8');
    const statements = schema.split(';').filter(s => s.trim() && !s.trim().startsWith('--'));
    for (const stmt of statements) {
      if (stmt.trim()) {
        await db.query(stmt);
      }
    }
    logger.info('Schema created successfully');

    // Step 4: Seed assets
    const assets = [
      ['Main Factory', 'Building', 'Zone A', 'Main production facility'],
      ['PPU Block', 'Building', 'Zone B', 'Pre-Production Unit'],
      ['FPU Block', 'Building', 'Zone C', 'Final Production Unit'],
      ['Chiller Plant', 'Equipment', 'Zone D', 'Central chiller system'],
      ['Admin Building', 'Building', 'Zone E', 'Administrative offices'],
      ['Warehouse', 'Building', 'Zone F', 'Storage warehouse']
    ];
    for (const a of assets) {
      try {
        await db.query(
          'INSERT INTO assets (name, type, location, description) VALUES (?, ?, ?, ?)', a
        );
      } catch (e) { /* ignore if already exists */ }
    }
    logger.info('Assets seeded');

    // Step 5: Seed users
    const managerHash = await bcrypt.hash('Manager@123', 10);
    const entryHash = await bcrypt.hash('Entry@123', 10);
    try {
      await db.query(
        'INSERT INTO users (name, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
        ['Factory Manager', 'manager@fupms.com', managerHash, 2]
      );
    } catch (e) { /* ignore if already exists */ }
    try {
      await db.query(
        'INSERT INTO users (name, email, password_hash, role_id) VALUES (?, ?, ?, ?)',
        ['Data Operator', 'operator@fupms.com', entryHash, 3]
      );
    } catch (e) { /* ignore if already exists */ }
    logger.info('Users seeded');

    // Step 6: Seed electricity data (12 months of 2025)
    const [assetRows] = await db.query('SELECT TOP 3 id FROM assets');
    for (let month = 1; month <= 12; month++) {
      const daysInMonth = new Date(2025, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        for (const asset of assetRows) {
          const kWh = Math.round((3000 + Math.random() * 5000) * 100) / 100;
          const cost = Math.round(kWh * (0.08 + Math.random() * 0.04) * 100) / 100;
          const peak = Math.round((kWh * 0.3 + Math.random() * 200) * 100) / 100;
          const offPeak = Math.round((kWh * 0.4) * 100) / 100;
          await db.query(
            'INSERT INTO electricity_data (date, energy_kWh, cost, peak_kW, off_peak_kWh, asset_id, created_by) VALUES (?, ?, ?, ?, ?, ?, 1)',
            [date, kWh, cost, peak, offPeak, asset.id]
          );
        }
      }
    }
    logger.info('Electricity data seeded');

    // Step 7: Seed water meter data
    for (let month = 1; month <= 12; month++) {
      const daysInMonth = new Date(2025, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const intake = Math.round((200 + Math.random() * 400) * 100) / 100;
        const ppu = Math.round(intake * 0.3 * 100) / 100;
        const fpu = Math.round(intake * 0.25 * 100) / 100;
        const chiller = Math.round(intake * 0.2 * 100) / 100;
        const cooling = Math.round(intake * 0.15 * 100) / 100;
        const cost = Math.round(intake * 2.5 * 100) / 100;
        await db.query(
          'INSERT INTO water_meter_data (date, intake, ppu_reading, fpu_reading, chiller, cooling_tower, cost, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 1)',
          [date, intake, ppu, fpu, chiller, cooling, cost]
        );
      }
    }
    logger.info('Water meter data seeded');

    // Step 8: Seed work schedule
    for (let month = 1; month <= 12; month++) {
      const daysInMonth = new Date(2025, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dow = new Date(2025, month - 1, day).getDay();
        const isHoliday = dow === 0 ? 1 : 0;
        const ppuP = isHoliday ? 0 : 80 + Math.floor(Math.random() * 20);
        const ppuA = isHoliday ? 0 : ppuP - Math.floor(Math.random() * 10);
        const fpuP = isHoliday ? 0 : 60 + Math.floor(Math.random() * 15);
        const fpuA = isHoliday ? 0 : fpuP - Math.floor(Math.random() * 8);
        const fmuP = isHoliday ? 0 : 40 + Math.floor(Math.random() * 10);
        const fmuA = isHoliday ? 0 : fmuP - Math.floor(Math.random() * 5);
        await db.query(
          'INSERT INTO work_schedule (day, is_holiday, ppu_planned, ppu_actual, fpu_planned, fpu_actual, fmu_planned, fmu_actual, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)',
          [date, isHoliday, ppuP, ppuA, fpuP, fpuA, fmuP, fmuA]
        );
      }
    }
    logger.info('Work schedule seeded');

    // Step 9: Seed production targets
    const lines = ['LINE-A', 'LINE-B', 'LINE-C', 'LINE-D'];
    const products = ['Widget-X', 'Widget-Y', 'Component-A', 'Component-B'];
    const units = ['pcs', 'kg', 'pcs', 'kg'];
    for (let month = 1; month <= 12; month++) {
      const daysInMonth = new Date(2025, month, 0).getDate();
      for (let day = 1; day <= daysInMonth; day++) {
        const date = `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dow = new Date(2025, month - 1, day).getDay();
        if (dow === 0) continue; // skip sundays
        for (let li = 0; li < lines.length; li++) {
          const target = Math.round((500 + Math.random() * 500) * 100) / 100;
          const actual = Math.round((target * (0.7 + Math.random() * 0.35)) * 100) / 100;
          await db.query(
            'INSERT INTO production_target_new (line_id, product_group, production_unit, date, target, actual, created_by) VALUES (?, ?, ?, ?, ?, ?, 1)',
            [lines[li], products[li], units[li], date, target, actual]
          );
        }
      }
    }
    logger.info('Production targets seeded');

    logger.info('Database seed completed successfully!');
    process.exit(0);
  } catch (error) {
    logger.error('Seed failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seed();
