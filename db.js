const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

const STATE_TABLE = `
  CREATE TABLE IF NOT EXISTS app_state (
    data_key TEXT PRIMARY KEY,
    data JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

async function ensureStateTable() {
  if (!pool) return;
  await pool.query(STATE_TABLE);
}

async function syncRides(rides) {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rides (
      trip_number TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  for (const ride of rides) {
    await pool.query(
      `INSERT INTO rides (trip_number, data, created_at, updated_at)
       VALUES ($1, $2::jsonb, COALESCE($3::timestamptz, NOW()), NOW())
       ON CONFLICT (trip_number) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [ride.tripNumber, JSON.stringify(ride), ride.createdAt || null]
    );
  }
}

async function persistState(dataKey, data) {
  if (!pool) return;
  await ensureStateTable();
  await pool.query(
    `INSERT INTO app_state (data_key, data, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (data_key) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
    [dataKey, JSON.stringify(data)],
  );
}

async function loadPersistentState(localSnapshots) {
  if (!pool) return localSnapshots;
  await ensureStateTable();
  const result = await pool.query('SELECT data_key, data FROM app_state');
  const stored = new Map(result.rows.map(row => [row.data_key, row.data]));
  const hydrated = {};
  for (const [dataKey, localData] of Object.entries(localSnapshots)) {
    if (stored.has(dataKey)) {
      hydrated[dataKey] = stored.get(dataKey);
      continue;
    }
    // Migrate the existing JSON snapshot once; never replace an existing database row.
    await persistState(dataKey, localData);
    hydrated[dataKey] = localData;
  }
  return hydrated;
}

async function loadRides() {
  if (!pool) return null;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS rides (
      trip_number TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  const result = await pool.query('SELECT data FROM rides ORDER BY created_at DESC');
  return result.rows.map(row => row.data);
}

module.exports = { pool, syncRides, loadRides, persistState, loadPersistentState };
