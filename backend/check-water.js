require('dotenv').config();
const sql = require('mssql');

async function main() {
  const cfg = {
    server: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    options: { encrypt: true, trustServerCertificate: true }
  };

  const pool = await sql.connect(cfg);

  // Check columns
  const cols = await pool.request().query(
    "SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH, IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='water_meter_data' ORDER BY ORDINAL_POSITION"
  );
  console.log('=== water_meter_data columns ===');
  cols.recordset.forEach(c => console.log(`  ${c.COLUMN_NAME} - ${c.DATA_TYPE}${c.CHARACTER_MAXIMUM_LENGTH ? '(' + c.CHARACTER_MAXIMUM_LENGTH + ')' : ''} ${c.IS_NULLABLE}`));

  // Check row count
  const cnt = await pool.request().query('SELECT COUNT(*) as cnt FROM water_meter_data');
  console.log('\nRow count:', cnt.recordset[0].cnt);

  // Show sample data
  const sample = await pool.request().query('SELECT TOP 3 * FROM water_meter_data');
  console.log('\n=== Sample rows ===');
  console.log(JSON.stringify(sample.recordset, null, 2));

  await pool.close();
}

main().catch(e => { console.error('ERROR:', e.message); process.exit(1); });
