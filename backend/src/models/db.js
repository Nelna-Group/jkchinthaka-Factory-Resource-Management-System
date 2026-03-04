const sql = require('mssql');

const config = {
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  user: process.env.DB_USER || 'nelna_user',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fupms',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true'
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  }
};

const pool = new sql.ConnectionPool(config);
const poolConnect = pool.connect();

poolConnect.then(() => {
  console.log('Connected to SQL Server');
}).catch(err => {
  console.error('SQL Server connection failed:', err.message);
});

/**
 * Execute a SQL query with mysql2-compatible ? placeholder auto-conversion.
 * Returns [recordset] for SELECT, or [{ insertId, affectedRows }] for INSERT.
 */
async function query(sqlStr, params = []) {
  await poolConnect;
  const request = pool.request();

  // Replace ? placeholders with @p1, @p2, ...
  let paramIndex = 0;
  const convertedSql = sqlStr.replace(/\?/g, () => {
    paramIndex++;
    return `@p${paramIndex}`;
  });

  // Bind parameters
  params.forEach((value, i) => {
    if (value === undefined) value = null;
    request.input(`p${i + 1}`, value);
  });

  const result = await request.query(convertedSql);

  // If the recordset contains an insertId field (from SCOPE_IDENTITY()), return mysql2-compatible format
  if (result.recordset && result.recordset.length > 0 && result.recordset[0].insertId !== undefined) {
    return [{ insertId: result.recordset[0].insertId, affectedRows: result.rowsAffected?.[0] || 0 }];
  }

  // For SELECT: return [rows] mimicking mysql2's [rows, fields]
  return [result.recordset || []];
}

module.exports = { query, pool, sql };
