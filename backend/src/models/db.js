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

let pool = null;
let connectPromise = null;

function isConnectionError(error) {
  const msg = String(error?.message || '').toLowerCase();
  return msg.includes('failed to connect') ||
    msg.includes('econnrefused') ||
    msg.includes('timeout') ||
    msg.includes('not connected') ||
    msg.includes('connection is closed') ||
    msg.includes('connectionerror') ||
    msg.includes('socket hang up');
}

function resetPool() {
  if (pool) {
    pool.close().catch(() => {});
  }
  pool = null;
  connectPromise = null;
}

async function ensureConnected() {
  if (pool?.connected) {
    return pool;
  }

  if (!connectPromise) {
    pool = new sql.ConnectionPool(config);
    connectPromise = pool.connect()
      .then(() => {
        console.log('Connected to SQL Server');
        return pool;
      })
      .catch((err) => {
        console.error('SQL Server connection failed:', err.message);
        resetPool();
        throw err;
      });
  }

  return connectPromise;
}

/**
 * Execute a SQL query with mysql2-compatible ? placeholder auto-conversion.
 * Returns [recordset] for SELECT, or [{ insertId, affectedRows }] for INSERT.
 */
async function query(sqlStr, params = []) {
  const runQuery = async () => {
    const activePool = await ensureConnected();
    const request = activePool.request();

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
  };

  try {
    return await runQuery();
  } catch (error) {
    if (!isConnectionError(error)) {
      throw error;
    }

    // Connection can become stale after startup failures; reconnect once and retry.
    resetPool();
    return runQuery();
  }
}

module.exports = {
  query,
  sql,
  get pool() {
    return pool;
  }
};
