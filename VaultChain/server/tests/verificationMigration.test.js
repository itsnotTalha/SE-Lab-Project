const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { after, test } = require('node:test');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vaultchain-verification-migration-'));
process.env.DATABASE_PATH = path.join(testDirectory, 'migration.sqlite');

const { database, run } = require('../src/database/database');
const { initializeDatabase } = require('../src/database/initDatabase');

function all(sql) {
	return new Promise((resolve, reject) => {
		database.all(sql, (error, rows) => error ? reject(error) : resolve(rows));
	});
}

after(async () => {
	await new Promise((resolve) => database.close(resolve));
	fs.rmSync(testDirectory, { recursive: true, force: true });
});

test('database initialization adds report ownership to the legacy verification table', async () => {
	await run(`CREATE TABLE verification_reports (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		asset_id INTEGER NOT NULL,
		verification_type TEXT,
		sha256_match INTEGER,
		similarity_score REAL,
		status TEXT,
		report_json TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`);
	await initializeDatabase();
	const columns = await all('PRAGMA table_info(verification_reports)');
	assert.equal(columns.some((column) => column.name === 'user_id'), true);
	assert.equal(columns.find((column) => column.name === 'asset_id').notnull, 0);
	const indexes = await all('PRAGMA index_list(verification_reports)');
	assert.equal(indexes.some((index) => index.name === 'idx_verification_reports_user_id'), true);
	const tables = await all("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('vaults', 'vault_assets', 'vault_unlock_sessions', 'vault_unlock_attempts')");
	assert.deepEqual(new Set(tables.map((table) => table.name)), new Set(['vaults', 'vault_assets', 'vault_unlock_sessions', 'vault_unlock_attempts']));
	const vaultColumns = await all('PRAGMA table_info(vaults)');
	assert.equal(vaultColumns.some((column) => column.name === 'password_hash'), true);
	assert.equal(vaultColumns.some((column) => column.name === 'auto_lock_minutes'), true);
	const membershipIndexes = await all('PRAGMA index_list(vault_assets)');
	assert.equal(membershipIndexes.some((index) => index.origin === 'pk'), true);
	const listingColumns = await all('PRAGMA table_info(marketplace_listings)');
	for (const name of ['public_reference', 'buyer_id', 'title', 'description', 'sold_at']) {
		assert.equal(listingColumns.some((column) => column.name === name), true);
	}
	const listingIndexes = await all('PRAGMA index_list(marketplace_listings)');
	assert.equal(listingIndexes.some((index) => index.name === 'idx_marketplace_public_reference'), true);
	assert.equal(listingIndexes.some((index) => index.name === 'idx_marketplace_active_asset'), true);
	const historyColumns = await all('PRAGMA table_info(ownership_history)');
	for (const name of ['listing_id', 'price', 'transaction_reference']) {
		assert.equal(historyColumns.some((column) => column.name === name), true);
	}
});
