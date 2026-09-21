const { run, get, all } = require('../database');

// schema.sql only ever runs CREATE TABLE IF NOT EXISTS, so it cannot add a
// column to a database that already exists. This migration brings older
// databases up to the marketplace settlement schema and is safe to re-run.

const NEW_COLUMNS = [
  { table: 'marketplace_listings', column: 'buyer_id', definition: 'INTEGER' },
  { table: 'marketplace_listings', column: 'description', definition: 'TEXT' },
  { table: 'marketplace_listings', column: 'updated_at', definition: 'DATETIME' },
  { table: 'marketplace_listings', column: 'sold_at', definition: 'DATETIME' },
];

async function hasColumn(table, column) {
  const columns = await all(`PRAGMA table_info(${table})`);

  return columns.some((existing) => existing.name === column);
}

async function addMissingColumns() {
  for (const { table, column, definition } of NEW_COLUMNS) {
    if (await hasColumn(table, column)) {
      continue;
    }

    // ALTER TABLE ADD COLUMN cannot use a non-constant default such as
    // CURRENT_TIMESTAMP, so updated_at is backfilled from created_at below.
    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }

  await run(
    `UPDATE marketplace_listings
     SET updated_at = created_at
     WHERE updated_at IS NULL`
  );
}

async function closeDuplicateActiveListings() {
  // Before the unique index can be created, any asset that somehow has more
  // than one active listing keeps only its most recent one.
  const duplicates = await all(
    `SELECT asset_id, COUNT(*) AS listing_count
     FROM marketplace_listings
     WHERE status = 'active'
     GROUP BY asset_id
     HAVING listing_count > 1`
  );

  for (const duplicate of duplicates) {
    await run(
      `UPDATE marketplace_listings
       SET status = 'removed', updated_at = CURRENT_TIMESTAMP
       WHERE status = 'active'
         AND asset_id = ?
         AND id <> (
           SELECT id FROM marketplace_listings
           WHERE status = 'active' AND asset_id = ?
           ORDER BY created_at DESC, id DESC
           LIMIT 1
         )`,
      [duplicate.asset_id, duplicate.asset_id]
    );

    console.warn(
      `Migration: asset ${duplicate.asset_id} had ${duplicate.listing_count} active listings; kept the newest and removed the rest.`
    );
  }
}

async function createIndexes() {
  // These can only be created once addMissingColumns() has run, because an
  // existing database's marketplace_listings table has no buyer_id column.
  await run('CREATE INDEX IF NOT EXISTS idx_marketplace_listings_buyer_id ON marketplace_listings(buyer_id)');

  await run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_listings_one_active_per_asset
     ON marketplace_listings(asset_id) WHERE status = 'active'`
  );
}

async function backfillUploadOwnershipHistory() {
  // Every asset should have an ownership row describing how its current owner
  // got it. Assets uploaded before the ownership module existed have none, so
  // the marketplace ownership timeline would start empty for them.
  const row = await get('SELECT COUNT(*) AS total FROM ownership_history');

  if (row && row.total > 0) {
    return;
  }

  await run(
    `INSERT INTO ownership_history (asset_id, previous_owner, new_owner, transfer_type, transferred_at)
     SELECT id, NULL, owner_id, 'upload', created_at FROM assets`
  );
}

async function up() {
  await addMissingColumns();
  await closeDuplicateActiveListings();
  await createIndexes();
  await backfillUploadOwnershipHistory();
}

module.exports = { name: '001_marketplace_settlement', up };
