require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const sql = require('mssql');
const fs = require('fs');
const path = require('path');

function getDbConfig() {
  return {
    server: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433'),
    user: process.env.DB_USER || 'nelna_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fupms',
    options: {
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_CERT === 'true'
    }
  };
}

async function run() {
  const config = getDbConfig();
  console.log(`Connecting to ${config.database}...`);

  const pool = await sql.connect(config);

  const existing = await pool.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"
  );
  console.log('Existing tables:', existing.recordset.map(t => t.TABLE_NAME).join(', ') || '(none)');

  const schemaPath = path.join(__dirname, 'src', 'models', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');

  // T-SQL batches should be split on GO only, not blank lines.
  const batches = schemaSql
    .split(/^\s*GO\s*$/gim)
    .map(b => b.trim())
    .filter(Boolean);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    await pool.query(batch);
    console.log(`  Batch ${i + 1}/${batches.length} OK`);
  }

  const verifyWater = await pool.query("SELECT OBJECT_ID('dbo.water_meter_data', 'U') AS object_id");
  if (!verifyWater.recordset?.[0]?.object_id) {
    throw new Error("Table dbo.water_meter_data was not created");
  }

  const tables = await pool.query(
    "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"
  );
  console.log(`\nTables in ${config.database}:`);
  tables.recordset.forEach(t => console.log('  -', t.TABLE_NAME));

  await pool.close();
  console.log('\nDatabase setup complete!');
}

run()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Fatal error:', e.message);
    process.exit(1);
  });
