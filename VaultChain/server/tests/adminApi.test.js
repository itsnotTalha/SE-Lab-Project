const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const { after, before, test } = require('node:test');

const testDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'vaultchain-admin-api-'));
process.env.DATABASE_PATH = path.join(testDirectory, 'admin.sqlite');
process.env.JWT_SECRET = 'vaultchain-admin-api-test-secret';

const app = require('../src/app');
const { database, run } = require('../src/database/database');
const { initializeDatabase } = require('../src/database/initDatabase');
const authService = require('../src/services/auth/authService');

let baseUrl; let server; let userToken; let moderatorToken; let financeToken; let superToken; let regularUserId;

async function api(pathname, { token, method = 'GET', json } = {}) {
	const response = await fetch(`${baseUrl}/api${pathname}`, { method, headers: { ...(token ? { Authorization:`Bearer ${token}` } : {}), ...(json === undefined ? {} : { 'Content-Type':'application/json' }) }, body: json === undefined ? undefined : JSON.stringify(json) });
	return { status:response.status, body:response.status === 204 ? null : await response.json() };
}

async function account(name, email, role) {
	const result = await authService.register({ fullName:name, email, password:'AdminPass123!' });
	if (role !== 'USER') await run('UPDATE users SET role = ? WHERE id = ?', [role, result.user.id]);
	const login = await authService.login({ email, password:'AdminPass123!' });
	return { id:result.user.id, token:login.token };
}

before(async () => {
	await initializeDatabase();
	const user = await account('Regular User','user@example.test','USER'); regularUserId=user.id; userToken=user.token;
	moderatorToken=(await account('Moderator','moderator@example.test','MODERATOR')).token;
	financeToken=(await account('Finance Admin','finance@example.test','FINANCE_ADMIN')).token;
	const superAdmin=await account('Super Admin','super@example.test','SUPER_ADMIN'); superToken=superAdmin.token;
	const seller=await account('Asset Seller','seller@example.test','USER'); const buyer=await account('Asset Buyer','buyer@example.test','USER');
	const asset=(await run(`INSERT INTO assets (owner_id,title,file_name,file_path,file_size,mime_type,status) VALUES (?,?,?,?,?,?,?)`,[buyer.id,'Database-backed art','art.png','/tmp/art.png',10,'image/png','active'])).lastID;
	await run(`INSERT INTO verification_reports (user_id,asset_id,verification_type,sha256_match,similarity_score,status,report_json) VALUES (?,?,?,?,?,?,?)`,[buyer.id,asset,'global_image_search',1,100,'matches_found','{}']);
	const listing=(await run(`INSERT INTO marketplace_listings (public_reference,asset_id,seller_id,buyer_id,title,listing_type,price,status,sold_at) VALUES (?,?,?,?,?,'sale',1000,'sold',CURRENT_TIMESTAMP)`,['ML-ABC123',asset,seller.id,buyer.id,'Database-backed art'])).lastID;
	await run(`INSERT INTO marketplace_transactions (transaction_id,asset_id,listing_id,seller_id,buyer_id,sale_amount,platform_fee,seller_amount,status) VALUES (?,?,?,?,?,?,?,?,?)`,['TX-ABC123',asset,listing,seller.id,buyer.id,1000,50,950,'completed']);
	server=app.listen(0,'127.0.0.1'); await once(server,'listening'); baseUrl=`http://127.0.0.1:${server.address().port}`;
});

after(async () => { if(server) await new Promise((resolve,reject)=>server.close((error)=>error?reject(error):resolve())); await new Promise((resolve)=>database.close(resolve)); fs.rmSync(testDirectory,{recursive:true,force:true}); });

test('admin routes reject regular users and enforce specialist role boundaries', async () => {
	assert.equal((await api('/admin/overview',{token:userToken})).status,403);
	await run('UPDATE users SET role = ? WHERE id = ?', ['MODERATOR', regularUserId]);
	assert.equal((await api('/admin/overview',{token:userToken})).status,200, 'a promotion must apply to an already-issued token');
	await run('UPDATE users SET role = ? WHERE id = ?', ['USER', regularUserId]);
	assert.equal((await api('/admin/overview',{token:userToken})).status,403, 'a demotion must apply to an already-issued token');
	assert.equal((await api('/admin/overview',{token:moderatorToken})).status,200);
	assert.equal((await api('/admin/security',{token:moderatorToken})).status,200);
	assert.equal((await api('/admin/revenue',{token:moderatorToken})).status,403);
	assert.equal((await api('/admin/revenue',{token:financeToken})).status,200);
	assert.equal((await api('/admin/transactions',{token:financeToken})).status,200);
	assert.equal((await api('/admin/security',{token:financeToken})).status,403);
});

test('overview and finance endpoints aggregate persisted marketplace records', async () => {
	const overview=await api('/admin/overview?range=30d',{token:superToken}); assert.equal(overview.status,200);
	assert.equal(overview.body.overview.period.marketplaceRevenue,50); assert.equal(overview.body.overview.period.transactions,1);
	assert.equal(overview.body.overview.totals.verifiedAssets,1); assert.ok(overview.body.overview.trend.some((point)=>point.revenue===50));
	const revenue=await api('/admin/revenue?range=30d',{token:superToken}); assert.equal(revenue.body.revenue.summary.totalRevenue,50); assert.equal(revenue.body.revenue.sources[0].percentage,100);
	const marketplace=await api('/admin/marketplace?range=30d',{token:superToken}); assert.equal(marketplace.body.marketplace.rows[0].platform_fee,50);
	const transactions=await api('/admin/transactions?range=30d',{token:superToken}); assert.equal(transactions.body.transactions.rows[0].transaction_id,'TX-ABC123');
});

test('super admin mutations persist settings and audited user access changes', async () => {
	const settings=await api('/admin/settings/marketplace',{token:superToken,method:'PATCH',json:{commissionPercentage:7.5,minimumListingPrice:25}}); assert.equal(settings.status,200);
	const stored=await api('/admin/settings',{token:superToken}); assert.equal(stored.body.settings.marketplace_commission_rate.value,'0.075'); assert.equal(stored.body.settings.minimum_listing_price.value,'25');
	const userUpdate=await api(`/admin/users/${regularUserId}`,{token:superToken,method:'PATCH',json:{status:'review',role:'MODERATOR'}}); assert.equal(userUpdate.status,200); assert.equal(userUpdate.body.user.status,'review');
	const logs=await api('/admin/logs',{token:superToken}); assert.equal(logs.status,200); assert.ok(logs.body.logs.some((row)=>row.action==='updated_marketplace_settings')); assert.ok(logs.body.logs.some((row)=>row.action==='updated_user_access'));
});

test('custom date ranges include the complete selected end date', async () => {
	const today=new Date().toISOString().slice(0,10); const response=await api(`/admin/transactions?range=custom&from=${today}&to=${today}`,{token:superToken}); assert.equal(response.status,200); assert.equal(response.body.transactions.rows.length,1);
});
