require('dotenv').config();
const sql = require('mssql');

async function migrate() {
  const cfg = {
    server: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    options: { encrypt: true, trustServerCertificate: true }
  };

  const pool = await sql.connect(cfg);
  console.log('Connected to', process.env.DB_NAME);

  // Drop old columns
  const dropCols = ['ppu_reading', 'fpu_reading', 'chiller', 'cooling_tower', 'column_data'];
  for (const col of dropCols) {
    try {
      await pool.request().query(`ALTER TABLE water_meter_data DROP COLUMN [${col}]`);
      console.log(`  Dropped column: ${col}`);
    } catch (e) {
      console.log(`  Column ${col} already removed or not found: ${e.message}`);
    }
  }

  // Add new columns
  const newCols = [
    { name: 'PPU 1 Reading', type: 'DECIMAL(12,2)' },
    { name: 'PPU 2 Reading', type: 'DECIMAL(12,2)' },
    { name: 'FPU 1 Reading', type: 'DECIMAL(12,2)' },
    { name: 'FPU 2 Reading', type: 'DECIMAL(12,2)' },
    { name: 'Chiller Reading', type: 'DECIMAL(12,2)' },
    { name: 'Cooling tower Reading', type: 'DECIMAL(12,2)' },
    { name: 'Column 1', type: 'DECIMAL(12,2)' },
    { name: 'Column 2', type: 'DECIMAL(12,2)' },
    { name: 'Column 3', type: 'DECIMAL(12,2)' },
  ];

  for (const col of newCols) {
    try {
      await pool.request().query(`ALTER TABLE water_meter_data ADD [${col.name}] ${col.type} NULL`);
      console.log(`  Added column: [${col.name}]`);
    } catch (e) {
      console.log(`  Column [${col.name}] already exists or error: ${e.message}`);
    }
  }

  // Verify final structure
  const result = await pool.request().query(
    "SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='water_meter_data' ORDER BY ORDINAL_POSITION"
  );
  console.log('\n=== Final water_meter_data columns ===');
  result.recordset.forEach(c => console.log(`  ${c.COLUMN_NAME} (${c.DATA_TYPE})`));

  await pool.close();
  console.log('\nMigration complete!');
}

migrate().catch(e => { console.error('Migration FAILED:', e.message); process.exit(1); });
