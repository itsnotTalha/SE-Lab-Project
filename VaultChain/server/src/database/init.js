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
  let columns = await all('PRAGMA table_info(verification_reports)');
  if (!columns.some((column) => column.name === 'user_id')) {
    await run('ALTER TABLE verification_reports ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE');
    columns = await all('PRAGMA table_info(verification_reports)');
  }
  await run(`UPDATE verification_reports
    SET user_id = (SELECT owner_id FROM assets WHERE assets.id = verification_reports.asset_id)
    WHERE user_id IS NULL`);
  const assetColumn = columns.find((column) => column.name === 'asset_id');
  if (assetColumn?.notnull) {
    await exec(`PRAGMA foreign_keys = OFF;
      BEGIN TRANSACTION;
      CREATE TABLE verification_reports_migrated (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        asset_id INTEGER,
        verification_type TEXT,
        sha256_match INTEGER,
        similarity_score REAL,
        status TEXT,
        report_json TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE SET NULL
      );
      INSERT INTO verification_reports_migrated
        (id, user_id, asset_id, verification_type, sha256_match, similarity_score, status, report_json, created_at)
      SELECT id, user_id, asset_id, verification_type, sha256_match, similarity_score, status, report_json, created_at
      FROM verification_reports;
      DROP TABLE verification_reports;
      ALTER TABLE verification_reports_migrated RENAME TO verification_reports;
      COMMIT;
      PRAGMA foreign_keys = ON;`);
  }
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

async function migrateDocuments() {
  const columns = await all('PRAGMA table_info(documents)');
  const additions = [
    ['original_name', 'TEXT'],
    ['stored_name', 'TEXT'],
    ['file_path', 'TEXT'],
    ['mime_type', 'TEXT'],
    ['file_size', 'INTEGER'],
    ['sha256_hash', 'TEXT'],
    ['ocr_status', "TEXT NOT NULL DEFAULT 'pending'"],
    ['ocr_error', 'TEXT'],
    ['ocr_processed_at', 'DATETIME'],
    ['description', 'TEXT'],
    ['category', "TEXT DEFAULT 'pdf'"],
  ];
  for (const [name, definition] of additions) {
    if (!columns.some((column) => column.name === name)) await run(`ALTER TABLE documents ADD COLUMN ${name} ${definition}`);
  }
  await exec('CREATE INDEX IF NOT EXISTS idx_documents_owner_id ON documents(owner_id)');
  await exec('CREATE INDEX IF NOT EXISTS idx_documents_sha256_hash ON documents(sha256_hash)');

  const ocrColumns = await all('PRAGMA table_info(ocr_results)');
  if (!ocrColumns.some((column) => column.name === 'text_sha256')) {
    await run('ALTER TABLE ocr_results ADD COLUMN text_sha256 TEXT');
  }
  await exec('CREATE INDEX IF NOT EXISTS idx_ocr_results_semantic_hash ON ocr_results(semantic_hash)');
  await exec('CREATE INDEX IF NOT EXISTS idx_ocr_results_text_sha256 ON ocr_results(text_sha256)');

  const reportColumns = await all('PRAGMA table_info(verification_reports)');
  if (!reportColumns.some((column) => column.name === 'document_id')) {
    await run('ALTER TABLE verification_reports ADD COLUMN document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE');
  }
  if (!reportColumns.some((column) => column.name === 'target_document_id')) {
    await run('ALTER TABLE verification_reports ADD COLUMN target_document_id INTEGER REFERENCES documents(id) ON DELETE SET NULL');
  }

  const vaultItemColumns = await all('PRAGMA table_info(vault_items)');
  if (!vaultItemColumns.some((column) => column.name === 'document_id')) {
    await run('ALTER TABLE vault_items ADD COLUMN document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE');
  }
  if (!vaultItemColumns.some((column) => column.name === 'iv')) {
    await run('ALTER TABLE vault_items ADD COLUMN iv TEXT');
  }
  if (!vaultItemColumns.some((column) => column.name === 'auth_tag')) {
    await run('ALTER TABLE vault_items ADD COLUMN auth_tag TEXT');
  }
}

async function migrateAdminPlatform() {
  const userColumns = await all('PRAGMA table_info(users)');
  if (!userColumns.some((column) => column.name === 'status')) {
    await run("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
  }
  await run("UPDATE users SET role = UPPER(role) WHERE role IS NOT NULL");
  await run("UPDATE users SET role = 'USER' WHERE role IS NULL OR role NOT IN ('SUPER_ADMIN', 'MODERATOR', 'FINANCE_ADMIN', 'VERIFICATION_ADMIN', 'USER')");
  await run("INSERT OR IGNORE INTO platform_settings (setting_key, setting_value) VALUES ('marketplace_commission_rate', '0.05')");
  await run("INSERT OR IGNORE INTO platform_settings (setting_key, setting_value) VALUES ('minimum_listing_price', '1')");
  await run(`INSERT OR IGNORE INTO marketplace_transactions
    (transaction_id, asset_id, listing_id, seller_id, buyer_id, sale_amount, platform_fee, seller_amount, status, created_at)
    SELECT oh.transaction_reference, oh.asset_id, oh.listing_id, oh.previous_owner, oh.new_owner, oh.price,
      ROUND(oh.price * CAST((SELECT setting_value FROM platform_settings WHERE setting_key = 'marketplace_commission_rate') AS REAL), 2),
      ROUND(oh.price - (oh.price * CAST((SELECT setting_value FROM platform_settings WHERE setting_key = 'marketplace_commission_rate') AS REAL)), 2),
      'completed', oh.transferred_at
    FROM ownership_history oh
    WHERE oh.transfer_type = 'marketplace_sale' AND oh.transaction_reference IS NOT NULL
      AND oh.previous_owner IS NOT NULL AND oh.new_owner IS NOT NULL AND oh.price IS NOT NULL`);
}

async function initializeDatabase() {
  if (!initializationPromise) {
    initializationPromise = (async () => {
      const schemaPath = path.join(__dirname, 'schema.sql');
      const schema = await fs.readFile(schemaPath, 'utf8');

      await run('PRAGMA journal_mode = WAL');
      await run('PRAGMA busy_timeout = 5000');
      await exec(schema);
      await migrateVerificationReports();
      await migrateVaultPasswords();
      await migrateMarketplaceOwnership();
      await migrateDocuments();
      await migrateAdminPlatform();
    })();
  }

  return initializationPromise;
}

module.exports = { initializeDatabase };
