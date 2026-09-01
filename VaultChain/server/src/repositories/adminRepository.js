const { database } = require('../database/database');

function get(sql, params = []) { return new Promise((resolve, reject) => database.get(sql, params, (error, row) => error ? reject(error) : resolve(row))); }
function all(sql, params = []) { return new Promise((resolve, reject) => database.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows))); }
function run(sql, params = []) { return new Promise((resolve, reject) => database.run(sql, params, function done(error) { return error ? reject(error) : resolve(this); })); }

async function getOverview() {
	const [users, assets, verified, listings, sales] = await Promise.all([
		get('SELECT COUNT(*) AS count FROM users'),
		get('SELECT COUNT(*) AS count FROM assets'),
		get("SELECT COUNT(DISTINCT asset_id) AS count FROM verification_reports WHERE status IN ('verified', 'match', 'completed') OR similarity_score >= 90"),
		get("SELECT COUNT(*) AS count FROM marketplace_listings WHERE status = 'active'"),
		get(`SELECT COUNT(*) AS transactions, COALESCE(SUM(sale_amount), 0) AS gross_volume,
			COALESCE(SUM(platform_fee), 0) AS revenue FROM marketplace_transactions WHERE status = 'completed'`),
	]);
	return { totalUsers: users.count, totalAssets: assets.count, verifiedAssets: verified.count, activeListings: listings.count, totalTransactions: sales.transactions, grossVolume: sales.gross_volume, marketplaceRevenue: sales.revenue };
}

async function getUsers() {
	return all(`SELECT u.id, u.full_name, u.email, u.role, u.status, u.created_at,
		(SELECT COUNT(*) FROM assets a WHERE a.owner_id = u.id) AS assets,
		(SELECT COUNT(*) FROM marketplace_transactions mt WHERE mt.seller_id = u.id OR mt.buyer_id = u.id) AS transactions,
		(SELECT COALESCE(SUM(mt.platform_fee), 0) FROM marketplace_transactions mt WHERE mt.seller_id = u.id) AS revenue_generated
		FROM users u ORDER BY u.created_at DESC`);
}

async function getTransactions() {
	return all(`SELECT mt.transaction_id, a.title AS asset, seller.full_name AS seller,
		buyer.full_name AS buyer, mt.sale_amount, mt.platform_fee, mt.seller_amount,
		mt.status, mt.created_at FROM marketplace_transactions mt
		JOIN assets a ON a.id = mt.asset_id JOIN users seller ON seller.id = mt.seller_id
		JOIN users buyer ON buyer.id = mt.buyer_id ORDER BY mt.created_at DESC`);
}

async function updateUser(id, { role, status }) {
	const fields = []; const params = [];
	if (role) { fields.push('role = ?'); params.push(role); }
	if (status) { fields.push('status = ?'); params.push(status); }
	if (!fields.length) return get('SELECT id, full_name, email, role, status FROM users WHERE id = ?', [id]);
	params.push(id); await run(`UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params);
	return get('SELECT id, full_name, email, role, status FROM users WHERE id = ?', [id]);
}

async function logAction({ adminId, action, targetType, targetId, details, ipAddress }) {
	await run(`INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, details_json, ip_address)
		VALUES (?, ?, ?, ?, ?, ?)`, [adminId, action, targetType || null, targetId || null, details ? JSON.stringify(details) : null, ipAddress || null]);
}

async function getActivityLogs() {
	return all(`SELECT l.id, u.full_name AS admin, l.action, l.target_type, l.target_id,
		l.details_json, l.ip_address, l.created_at FROM admin_activity_logs l
		JOIN users u ON u.id = l.admin_id ORDER BY l.created_at DESC LIMIT 250`);
}

async function getSettings() {
	const rows = await all('SELECT setting_key, setting_value, updated_at FROM platform_settings ORDER BY setting_key');
	return Object.fromEntries(rows.map((row) => [row.setting_key, { value: row.setting_value, updatedAt: row.updated_at }]));
}

async function updateSetting(key, value, adminId) {
	await run(`INSERT INTO platform_settings (setting_key, setting_value, updated_by, updated_at)
		VALUES (?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value,
		updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP`, [key, value, adminId]);
}

module.exports = { getOverview, getUsers, getTransactions, updateUser, logAction, getActivityLogs, getSettings, updateSetting };
