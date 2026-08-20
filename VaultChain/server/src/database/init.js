const fs = require('fs').promises;
const path = require('path');
const { database, exec, run } = require('./database');

let initializationPromise = null;

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    database.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows));
  });
}

async function migrateVerificationReports() {
  const columns = await all('PRAGMA table_info(verification_reports)');
  if (!columns.some((column) => column.name === 'user_id')) {
    await run('ALTER TABLE verification_reports ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE');
  }
  await run(`UPDATE verification_reports
    SET user_id = (SELECT owner_id FROM assets WHERE assets.id = verification_reports.asset_id)
    WHERE user_id IS NULL`);
  await exec('CREATE INDEX IF NOT EXISTS idx_verification_reports_user_id ON verification_reports(user_id)');
}

async function migrateVaultPasswords() {
  const columns = await all('PRAGMA table_info(vaults)');
  if (!columns.some((column) => column.name === 'password_hash')) {
    await run('ALTER TABLE vaults ADD COLUMN password_hash TEXT');
  }
  if (!columns.some((column) => column.name === 'auto_lock_minutes')) {
    await run('ALTER TABLE vaults ADD COLUMN auto_lock_minutes INTEGER NOT NULL DEFAULT 10 CHECK(auto_lock_minutes IN (5, 10, 30))');
  }
}

async function initializeDatabase() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf8');

      await exec(schema);
      await migrateVerificationReports();
      await migrateVaultPasswords();
    })();
  }

  return initializationPromise;
}

module.exports = { initializeDatabase };
