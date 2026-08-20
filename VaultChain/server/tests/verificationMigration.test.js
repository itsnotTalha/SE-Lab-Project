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
	const indexes = await all('PRAGMA index_list(verification_reports)');
	assert.equal(indexes.some((index) => index.name === 'idx_verification_reports_user_id'), true);
	const tables = await all("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('vaults', 'vault_assets')");
	assert.deepEqual(new Set(tables.map((table) => table.name)), new Set(['vaults', 'vault_assets']));
	const membershipIndexes = await all('PRAGMA index_list(vault_assets)');
	assert.equal(membershipIndexes.some((index) => index.origin === 'pk'), true);
});
