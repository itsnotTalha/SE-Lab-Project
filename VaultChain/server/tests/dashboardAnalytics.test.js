const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'vaultchain-dashboard-'));
process.env.DATABASE_PATH = path.join(directory, 'test.sqlite');
const { database, run } = require('../src/database/database');
const { initializeDatabase } = require('../src/database/initDatabase');
const { getSummary } = require('../src/repositories/dashboardRepository');
test.after(async () => { await new Promise((resolve) => database.close(resolve)); fs.rmSync(directory, { recursive: true, force: true }); });

test('analytics aggregate beyond recent activity, isolate users and include only completed trades in range', async () => {
	await initializeDatabase();
	await run("INSERT INTO users (id,full_name,email,password_hash) VALUES (1,'One','one@test','hash'),(2,'Two','two@test','hash'),(3,'Empty','empty@test','hash')");
	for (let index = 0; index < 12; index++) {
		await run("INSERT INTO assets (owner_id,title,category,file_name,file_path) VALUES (1,?,'photography','image.png','/unused')", [`Asset ${index}`]);
	}
	await run("INSERT INTO assets (owner_id,title,category,file_name,file_path) VALUES (2,'Other','private','other.png','/unused')");
	await run("INSERT INTO assets (owner_id,title,category,file_name,file_path,created_at) VALUES (1,'Older','artwork','old.png','/unused',datetime('now','-40 days'))");
	for (let index = 0; index < 10; index++) await run("INSERT INTO verification_reports(user_id,status) VALUES (1,'verified')");
	await run("INSERT INTO verification_reports(user_id,status) VALUES (2,'other-user-status')");
	await run("INSERT INTO documents(owner_id,original_name,stored_name,file_path,mime_type,file_size,sha256_hash,ocr_status) VALUES (1,'note','note','/unused','image/png',10,'abc','completed'),(2,'private','private','/unused','image/png',10,'xyz','failed')");
	for (const [id, seller, buyer, amount, status, offset] of [
		['sale',1,2,100,'completed','0 days'], ['buy',2,1,50,'completed','0 days'],
		['failed',1,2,999,'failed','0 days'], ['old',1,2,800,'completed','-40 days'],
	]) await run("INSERT INTO marketplace_transactions(transaction_id,asset_id,seller_id,buyer_id,sale_amount,seller_amount,platform_fee,status,created_at) VALUES (?,1,?,?,?,?,?,?,datetime('now',?))", [id,seller,buyer,amount,amount * .9,amount * .1,status,offset]);
	const summary = await getSummary(1);
	assert.equal(summary.recentActivity.length, 8);
	assert.equal(summary.analytics.daily.length, 30);
	const sums = summary.analytics.daily.reduce((a,d) => ({ assets:a.assets+d.assets, documents:a.documents+d.documents, verifications:a.verifications+d.verifications, earnings:a.earnings+d.earnings, spending:a.spending+d.spending }), {assets:0,documents:0,verifications:0,earnings:0,spending:0});
	assert.deepEqual(sums, {assets:12,documents:1,verifications:10,earnings:90,spending:50});
	assert.equal(summary.totalAssets, 13);
	assert.deepEqual(summary.analytics.ocr, [{name:'completed',value:1}]);
	assert.deepEqual(summary.analytics.verification, [{name:'verified',value:10}]);
	assert.equal(summary.analytics.categories.reduce((sum,row) => sum+row.value,0),13);
	assert.ok(!JSON.stringify(summary.analytics).includes('private'));
	const empty = await getSummary(3);
	assert.equal(empty.analytics.daily.length,30);
	assert.ok(empty.analytics.daily.every((day) => day.assets === 0 && day.earnings === 0));
	assert.deepEqual(empty.analytics.ocr,[]);
});
