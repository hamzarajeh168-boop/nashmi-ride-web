const { Pool } = require('pg');

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    })
  : null;

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

module.exports = { pool, syncRides, loadRides };
