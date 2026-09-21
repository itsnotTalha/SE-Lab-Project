const { run, all } = require('../database');

// Adds the auction and fractional-ownership schema to databases created before
// those features existed. Safe to re-run.

const NEW_COLUMNS = [
  { table: 'marketplace_listings', column: 'starting_price', definition: 'REAL' },
  { table: 'marketplace_listings', column: 'reserve_price', definition: 'REAL' },
  { table: 'marketplace_listings', column: 'min_bid_increment', definition: 'REAL' },
  { table: 'marketplace_listings', column: 'ends_at', definition: 'DATETIME' },
  { table: 'marketplace_listings', column: 'share_count', definition: 'INTEGER' },
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

    await run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

async function createTables() {
  await run(
    `CREATE TABLE IF NOT EXISTS auction_bids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      listing_id INTEGER NOT NULL,
      bidder_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      status TEXT DEFAULT 'held',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(listing_id) REFERENCES marketplace_listings(id) ON DELETE CASCADE,
      FOREIGN KEY(bidder_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );

  await run(
    `CREATE TABLE IF NOT EXISTS fractional_assets (
      asset_id INTEGER PRIMARY KEY,
      total_shares INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(asset_id) REFERENCES assets(id) ON DELETE CASCADE
    )`
  );
}

async function replaceActiveListingIndex() {
  // Migration 001 allowed only one active listing per asset. That is still
  // right for whole-asset listings, but a fractionalised asset can have
  // several co-owners each offering their own shares at the same time, so the
  // index is narrowed to sale and auction listings and a second index keeps
  // one active share offer per seller.
  await run('DROP INDEX IF EXISTS idx_marketplace_listings_one_active_per_asset');

  await run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_listings_one_active_whole_asset
     ON marketplace_listings(asset_id)
     WHERE status = 'active' AND listing_type IN ('sale', 'auction')`
  );

  await run(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_marketplace_listings_one_active_share_offer
     ON marketplace_listings(asset_id, seller_id)
     WHERE status = 'active' AND listing_type = 'fractional'`
  );
}

async function createIndexes() {
  await run('CREATE INDEX IF NOT EXISTS idx_auction_bids_listing_id ON auction_bids(listing_id)');
  await run(
    'CREATE INDEX IF NOT EXISTS idx_fractional_ownership_asset_id ON fractional_ownership(asset_id)'
  );
}

async function up() {
  await addMissingColumns();
  await createTables();
  await replaceActiveListingIndex();
  await createIndexes();
}

module.exports = { name: '002_auctions_and_fractional', up };
