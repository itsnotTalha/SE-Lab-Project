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

async function migrateMarketplaceOwnership() {
  const listingColumns = await all('PRAGMA table_info(marketplace_listings)');
  const listingAdditions = [
    ['public_reference', 'TEXT'],
    ['buyer_id', 'INTEGER REFERENCES users(id) ON DELETE SET NULL'],
    ['title', 'TEXT'],
    ['description', 'TEXT'],
    ['sold_at', 'DATETIME'],
  ];
  for (const [name, definition] of listingAdditions) {
    if (!listingColumns.some((column) => column.name === name)) await run(`ALTER TABLE marketplace_listings ADD COLUMN ${name} ${definition}`);
  }
  await run(`UPDATE marketplace_listings
    SET public_reference = 'ML-' || printf('%06X', id)
    WHERE public_reference IS NULL`);
  await run(`UPDATE marketplace_listings
    SET title = COALESCE((SELECT title FROM assets WHERE assets.id = marketplace_listings.asset_id), 'Marketplace asset')
    WHERE title IS NULL`);
  await run("UPDATE marketplace_listings SET status = 'cancelled' WHERE status = 'removed'");
  await run(`UPDATE marketplace_listings SET status = 'cancelled'
    WHERE status = 'active' AND id NOT IN (
      SELECT MAX(id) FROM marketplace_listings WHERE status = 'active' GROUP BY asset_id
    )`);
  await exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_public_reference ON marketplace_listings(public_reference)');
  await exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_active_asset ON marketplace_listings(asset_id) WHERE status = 'active'");

  const historyColumns = await all('PRAGMA table_info(ownership_history)');
  const historyAdditions = [
    ['listing_id', 'INTEGER REFERENCES marketplace_listings(id) ON DELETE SET NULL'],
    ['price', 'REAL'],
    ['transaction_reference', 'TEXT'],
  ];
  for (const [name, definition] of historyAdditions) {
    if (!historyColumns.some((column) => column.name === name)) await run(`ALTER TABLE ownership_history ADD COLUMN ${name} ${definition}`);
  }
  await run(`UPDATE ownership_history
    SET transaction_reference = 'TX-' || printf('%06X', id)
    WHERE transaction_reference IS NULL`);
  await exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_ownership_transaction_reference ON ownership_history(transaction_reference)');
}

async function initializeDatabase() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf8');

      await exec(schema);
      await migrateVerificationReports();
      await migrateVaultPasswords();
      await migrateMarketplaceOwnership();
    })();
  }

  return initializationPromise;
}

module.exports = { initializeDatabase };
