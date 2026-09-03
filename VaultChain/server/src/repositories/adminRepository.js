const { database } = require('../database/database');

function get(sql, params = []) { return new Promise((resolve, reject) => database.get(sql, params, (error, row) => error ? reject(error) : resolve(row))); }
function all(sql, params = []) { return new Promise((resolve, reject) => database.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows))); }
function run(sql, params = []) { return new Promise((resolve, reject) => database.run(sql, params, function done(error) { return error ? reject(error) : resolve(this); })); }

function sqlDate(date) { return date.toISOString().slice(0, 19).replace('T', ' '); }
function startOfDay(date) { const value = new Date(date); value.setUTCHours(0, 0, 0, 0); return value; }
function startOfMonth(date) { const value = new Date(date); value.setUTCDate(1); value.setUTCHours(0, 0, 0, 0); return value; }
function addDays(date, count) { const value = new Date(date); value.setUTCDate(value.getUTCDate() + count); return value; }
function addMonths(date, count) { const value = new Date(date); value.setUTCMonth(value.getUTCMonth() + count); return value; }
function parseBoundary(value, endOfDay = false) { if (!value || Number.isNaN(Date.parse(value))) return null; if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date(`${value}T${endOfDay ? '23:59:59.999' : '00:00:00.000'}Z`); return new Date(value); }

function resolveRange({ range = '30d', from, to } = {}) {
	const end = parseBoundary(to, true) || new Date();
	let start;
	let resolution = 'day';
	if (parseBoundary(from)) start = parseBoundary(from);
	else if (range === 'today') { start = startOfDay(end); resolution = 'hour'; }
	else if (range === '7d') start = addDays(startOfDay(end), -6);
	else if (range === '1y') { start = addMonths(startOfMonth(end), -11); resolution = 'month'; }
	else start = addDays(startOfDay(end), -29);
	if ((end - start) / 86400000 > 62) resolution = 'month';
	const duration = Math.max(3600000, end - start);
	return { from: sqlDate(start), to: sqlDate(end), previousFrom: sqlDate(new Date(start.getTime() - duration)), previousTo: sqlDate(new Date(start.getTime() - 1)), resolution };
}

function percentChange(current, previous) {
	const now = Number(current || 0); const before = Number(previous || 0);
	if (!before) return now ? 100 : 0;
	return Math.round(((now - before) / Math.abs(before)) * 1000) / 10;
}

function bucketConfig(resolution) {
	if (resolution === 'hour') return { expression: "strftime('%Y-%m-%d %H', created_at)", step: (date) => new Date(date.getTime() + 3600000), key: (date) => date.toISOString().slice(0, 13).replace('T', ' '), label: (date) => date.toLocaleTimeString('en', { hour: 'numeric', timeZone: 'UTC' }) };
	if (resolution === 'month') return { expression: "strftime('%Y-%m', created_at)", step: (date) => addMonths(date, 1), key: (date) => date.toISOString().slice(0, 7), label: (date) => date.toLocaleDateString('en', { month: 'short', year: '2-digit', timeZone: 'UTC' }) };
	return { expression: "strftime('%Y-%m-%d', created_at)", step: (date) => addDays(date, 1), key: (date) => date.toISOString().slice(0, 10), label: (date) => date.toLocaleDateString('en', { month: 'short', day: 'numeric', timeZone: 'UTC' }) };
}

function fillTimeline(range, series) {
	const config = bucketConfig(range.resolution);
	const maps = Object.fromEntries(Object.entries(series).map(([name, rows]) => [name, new Map(rows.map((row) => [row.bucket, Number(row.value || 0)]))]));
	const result = [];
	let cursor = range.resolution === 'month' ? startOfMonth(new Date(`${range.from}Z`)) : range.resolution === 'day' ? startOfDay(new Date(`${range.from}Z`)) : new Date(`${range.from}Z`);
	const end = new Date(`${range.to}Z`);
	while (cursor <= end && result.length < 400) {
		const key = config.key(cursor); const point = { key, label: config.label(cursor) };
		for (const [name, values] of Object.entries(maps)) point[name] = values.get(key) || 0;
		result.push(point); cursor = config.step(cursor);
	}
	return result;
}

async function groupedCount(table, dateColumn, range, extraWhere = '', params = []) {
	const { expression } = bucketConfig(range.resolution);
	return all(`SELECT ${expression.replaceAll('created_at', dateColumn)} AS bucket, COUNT(*) AS value FROM ${table} WHERE ${dateColumn} >= ? AND ${dateColumn} <= ? ${extraWhere} GROUP BY bucket ORDER BY bucket`, [range.from, range.to, ...params]);
}

async function groupRevenue(range) {
	const { expression } = bucketConfig(range.resolution);
	return all(`SELECT ${expression} AS bucket, COALESCE(SUM(platform_fee), 0) AS value FROM marketplace_transactions WHERE status = 'completed' AND created_at BETWEEN ? AND ? GROUP BY bucket ORDER BY bucket`, [range.from, range.to]);
}

async function getOverview(options) {
	const range = resolveRange(options); const period = [range.from, range.to]; const previous = [range.previousFrom, range.previousTo];
	const [totals, current, prior, revenueRows, transactionRows, sales, priorSales, recent, operational, security, setting] = await Promise.all([
		get(`SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM assets) AS assets, (SELECT COUNT(DISTINCT asset_id) FROM verification_reports WHERE asset_id IS NOT NULL) AS verified_assets`),
		get(`SELECT (SELECT COUNT(*) FROM users WHERE created_at BETWEEN ? AND ?) AS users, (SELECT COUNT(*) FROM assets WHERE created_at BETWEEN ? AND ?) AS assets`, [...period, ...period]),
		get(`SELECT (SELECT COUNT(*) FROM users WHERE created_at BETWEEN ? AND ?) AS users, (SELECT COUNT(*) FROM assets WHERE created_at BETWEEN ? AND ?) AS assets`, [...previous, ...previous]),
		groupRevenue(range), groupedCount('marketplace_transactions', 'created_at', range, "AND status = 'completed'"),
		get(`SELECT COUNT(*) AS count, COALESCE(SUM(platform_fee), 0) AS revenue, COALESCE(SUM(sale_amount), 0) AS gross FROM marketplace_transactions WHERE status = 'completed' AND created_at BETWEEN ? AND ?`, period),
		get(`SELECT COUNT(*) AS count, COALESCE(SUM(platform_fee), 0) AS revenue FROM marketplace_transactions WHERE status = 'completed' AND created_at BETWEEN ? AND ?`, previous),
		getTransactions(options),
		get(`SELECT (SELECT COUNT(*) FROM marketplace_listings WHERE status='active') AS active_listings,
			(SELECT COUNT(*) FROM assets a WHERE NOT EXISTS (SELECT 1 FROM verification_reports vr WHERE vr.asset_id=a.id)) AS verification_queue,
			(SELECT COUNT(*) FROM users WHERE status='review') AS flagged_accounts,
			(SELECT COUNT(*) FROM marketplace_transactions WHERE created_at BETWEEN ? AND ?) AS payments,
			(SELECT COUNT(*) FROM marketplace_transactions WHERE status='completed' AND created_at BETWEEN ? AND ?) AS successful_payments`, [...period, ...period]),
		getSecurity(), get("SELECT setting_value FROM platform_settings WHERE setting_key='marketplace_commission_rate'"),
	]);
	return { range, totals: { users: totals.users, assets: totals.assets, verifiedAssets: totals.verified_assets, verificationRate: totals.assets ? Math.round(totals.verified_assets / totals.assets * 1000) / 10 : 0 }, period: { newUsers: current.users, newAssets: current.assets, transactions: sales.count, grossVolume: sales.gross, marketplaceRevenue: sales.revenue }, changes: { users: percentChange(current.users, prior.users), assets: percentChange(current.assets, prior.assets), transactions: percentChange(sales.count, priorSales.count), revenue: percentChange(sales.revenue, priorSales.revenue) }, trend: fillTimeline(range, { revenue: revenueRows, transactions: transactionRows }), recentTransactions: recent.rows.slice(0, 4), health: { ...security.health, activeListings: operational.active_listings, verificationQueue: operational.verification_queue, flaggedAccounts: operational.flagged_accounts, paymentSuccess: operational.payments ? Math.round(operational.successful_payments / operational.payments * 1000) / 10 : 0 }, securityEvents: security.events.slice(0, 3), commissionRate: Number(setting?.setting_value || 0) * 100 };
}

async function getTransactions(options) {
	const range = resolveRange(options); const period = [range.from, range.to];
	const [summary, rows] = await Promise.all([
		get(`SELECT COUNT(*) AS total, COALESCE(SUM(sale_amount), 0) AS gross_volume, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed, SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending, SUM(CASE WHEN status = 'refunded' THEN 1 ELSE 0 END) AS refunded, COALESCE(SUM(CASE WHEN status = 'refunded' THEN sale_amount ELSE 0 END), 0) AS refunded_value FROM marketplace_transactions WHERE created_at BETWEEN ? AND ?`, period),
		all(`SELECT mt.transaction_id, a.title AS asset, seller.full_name AS seller, buyer.full_name AS buyer, mt.sale_amount, mt.platform_fee, mt.seller_amount, mt.status, mt.created_at FROM marketplace_transactions mt JOIN assets a ON a.id = mt.asset_id JOIN users seller ON seller.id = mt.seller_id JOIN users buyer ON buyer.id = mt.buyer_id WHERE mt.created_at BETWEEN ? AND ? ORDER BY mt.created_at DESC`, period),
	]);
	return { range, summary: { ...summary, successRate: summary.total ? Math.round(summary.completed / summary.total * 1000) / 10 : 0 }, rows };
}

async function getRevenue(options) {
	const range = resolveRange(options); const period = [range.from, range.to];
	const [summary, prior, trend, volumeRows, transactions, setting] = await Promise.all([
		get(`SELECT COALESCE(SUM(CASE WHEN status = 'completed' THEN platform_fee ELSE 0 END), 0) AS revenue, COALESCE(SUM(CASE WHEN status = 'pending' THEN platform_fee ELSE 0 END), 0) AS pending, COALESCE(SUM(CASE WHEN status = 'refunded' THEN platform_fee ELSE 0 END), 0) AS refunds, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed, COUNT(*) AS total FROM marketplace_transactions WHERE created_at BETWEEN ? AND ?`, period),
		get(`SELECT COALESCE(SUM(CASE WHEN status = 'completed' THEN platform_fee ELSE 0 END), 0) AS revenue, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed FROM marketplace_transactions WHERE created_at BETWEEN ? AND ?`, [range.previousFrom, range.previousTo]),
		groupRevenue(range), groupedCount('marketplace_transactions', 'created_at', range, "AND status = 'completed'"), getTransactions(options), get("SELECT setting_value FROM platform_settings WHERE setting_key = 'marketplace_commission_rate'"),
	]);
	return { range, summary: { totalRevenue: summary.revenue, marketplaceFees: summary.revenue, pendingPayments: summary.pending, refunds: summary.refunds, completedTransactions: summary.completed || 0, totalTransactions: summary.total, commissionRate: Number(setting?.setting_value || 0) * 100 }, changes: { revenue: percentChange(summary.revenue, prior.revenue), transactions: percentChange(summary.completed, prior.completed) }, sources: summary.revenue ? [{ name: 'Marketplace commission', amount: summary.revenue, percentage: 100 }] : [], trend: fillTimeline(range, { revenue: trend, transactions: volumeRows }), transactions: transactions.rows.slice(0, 5) };
}

async function getMarketplace(options) {
	const range = resolveRange(options); const period = [range.from, range.to];
	const [summary, rows, rate, commission] = await Promise.all([
		get(`SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN status = 'sold' THEN 1 ELSE 0 END) AS sold, COALESCE(AVG(CASE WHEN status = 'sold' THEN price END), 0) AS average_price FROM marketplace_listings WHERE created_at BETWEEN ? AND ?`, period),
		all(`SELECT ml.id, ml.public_reference, COALESCE(ml.title, a.title) AS asset, u.full_name AS owner, ml.price, ml.status, ml.created_at, ml.sold_at, COALESCE(mt.platform_fee, 0) AS platform_fee FROM marketplace_listings ml JOIN assets a ON a.id = ml.asset_id JOIN users u ON u.id = ml.seller_id LEFT JOIN marketplace_transactions mt ON mt.listing_id = ml.id WHERE ml.created_at BETWEEN ? AND ? ORDER BY ml.created_at DESC`, period),
		get("SELECT setting_value FROM platform_settings WHERE setting_key = 'marketplace_commission_rate'"), get(`SELECT COALESCE(SUM(platform_fee), 0) AS value FROM marketplace_transactions WHERE status = 'completed' AND created_at BETWEEN ? AND ?`, period),
	]);
	const commissionRate = Number(rate?.setting_value || 0);
	return { range, summary: { totalListings: summary.total, activeListings: summary.active || 0, soldAssets: summary.sold || 0, averageSellingPrice: summary.average_price, commissionEarned: commission.value }, rows: rows.map((row) => ({ ...row, platform_fee: row.platform_fee || Number(row.price || 0) * commissionRate })) };
}

async function getUsers(options) {
	const range = resolveRange(options);
	const [stats, rows] = await Promise.all([
		get(`SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active, SUM(CASE WHEN role != 'USER' THEN 1 ELSE 0 END) AS admins, SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) AS review, SUM(CASE WHEN created_at BETWEEN ? AND ? THEN 1 ELSE 0 END) AS new_users FROM users`, [range.from, range.to]),
		all(`SELECT u.id, u.full_name, u.email, u.role, u.status, u.created_at, (SELECT COUNT(*) FROM assets a WHERE a.owner_id = u.id) AS assets, (SELECT COUNT(*) FROM marketplace_transactions mt WHERE mt.seller_id = u.id OR mt.buyer_id = u.id) AS transactions, (SELECT COALESCE(SUM(mt.platform_fee), 0) FROM marketplace_transactions mt WHERE mt.seller_id = u.id) AS revenue_generated FROM users u ORDER BY u.created_at DESC`),
	]);
	return { range, summary: stats, rows };
}

async function getAssets(options) {
	const range = resolveRange(options); const period = [range.from, range.to];
	const [summary, rows] = await Promise.all([
		get(`SELECT COUNT(*) AS total, SUM(CASE WHEN EXISTS (SELECT 1 FROM verification_reports vr WHERE vr.asset_id = a.id) THEN 1 ELSE 0 END) AS verified, SUM(CASE WHEN LOWER(a.status) IN ('suspicious','review') THEN 1 ELSE 0 END) AS suspicious, SUM(CASE WHEN NOT EXISTS (SELECT 1 FROM verification_reports vr WHERE vr.asset_id = a.id) THEN 1 ELSE 0 END) AS pending FROM assets a WHERE a.created_at BETWEEN ? AND ?`, period),
		all(`SELECT a.id, a.title, a.category, a.status AS asset_status, a.created_at, u.full_name AS owner, (SELECT MAX(CASE WHEN vr.sha256_match = 1 THEN 100 ELSE vr.similarity_score END) FROM verification_reports vr WHERE vr.asset_id = a.id) AS verification_score, (SELECT ml.status FROM marketplace_listings ml WHERE ml.asset_id = a.id ORDER BY ml.created_at DESC LIMIT 1) AS marketplace_status, EXISTS(SELECT 1 FROM verification_reports vr WHERE vr.asset_id = a.id) AS has_verification FROM assets a JOIN users u ON u.id = a.owner_id WHERE a.created_at BETWEEN ? AND ? ORDER BY a.created_at DESC`, period),
	]);
	return { range, summary: { total: summary.total, verified: summary.verified || 0, suspicious: summary.suspicious || 0, pending: summary.pending || 0 }, rows };
}

function verificationScore(row) {
	if (row.sha256_match) return 100;
	if (row.similarity_score !== null && Number.isFinite(Number(row.similarity_score))) return Number(row.similarity_score);
	try { const match = JSON.parse(row.report_json || '{}').matches?.[0]; if (match && Number(match.hashBits)) return Math.max(0, Math.round((1 - Number(match.distance) / Number(match.hashBits)) * 1000) / 10); } catch { /* Invalid historical report JSON is ignored. */ }
	return null;
}

async function getVerification(options) {
	const range = resolveRange(options); const rows = await all(`SELECT id, asset_id, sha256_match, similarity_score, status, report_json, created_at FROM verification_reports WHERE created_at BETWEEN ? AND ? ORDER BY created_at`, [range.from, range.to]);
	const scored = rows.map((row) => ({ ...row, score: verificationScore(row) }));
	const confidence = [{ range: '<80%', count: 0 }, { range: '80–90%', count: 0 }, { range: '90–95%', count: 0 }, { range: '95–100%', count: 0 }];
	for (const row of scored) { if (row.score === null) continue; if (row.score < 80) confidence[0].count += 1; else if (row.score < 90) confidence[1].count += 1; else if (row.score < 95) confidence[2].count += 1; else confidence[3].count += 1; }
	const { expression } = bucketConfig(range.resolution);
	const trendRows = await all(`SELECT ${expression} AS bucket, COUNT(*) AS total, SUM(CASE WHEN status NOT IN ('failed','rejected') THEN 1 ELSE 0 END) AS successful FROM verification_reports WHERE created_at BETWEEN ? AND ? GROUP BY bucket`, [range.from, range.to]);
	const base = fillTimeline(range, { total: trendRows.map((row) => ({ bucket: row.bucket, value: row.total })), successful: trendRows.map((row) => ({ bucket: row.bucket, value: row.successful })) });
	return { range, summary: { total: rows.length, successful: rows.filter((row) => !['failed', 'rejected'].includes(row.status)).length, duplicates: rows.filter((row) => row.sha256_match).length, rejected: rows.filter((row) => row.status === 'rejected').length, scored: scored.filter((row) => row.score !== null).length }, trend: base.map((point) => ({ ...point, rate: point.total ? Math.round(point.successful / point.total * 1000) / 10 : 0 })), confidence };
}

async function getAnalytics(options) {
	const range = resolveRange(options); const period = [range.from, range.to];
	const [users, assets, transactions, revenue, priorCounts, totals, activeUsers, volumeRows, payment] = await Promise.all([
		groupedCount('users', 'created_at', range), groupedCount('assets', 'created_at', range), groupedCount('marketplace_transactions', 'created_at', range, "AND status = 'completed'"), groupRevenue(range),
		get(`SELECT (SELECT COUNT(*) FROM users WHERE created_at < ?) AS users, (SELECT COUNT(*) FROM assets WHERE created_at < ?) AS assets`, [range.from, range.from]),
		get(`SELECT (SELECT COUNT(*) FROM users) AS users, (SELECT COUNT(*) FROM assets) AS assets, (SELECT COUNT(DISTINCT asset_id) FROM verification_reports WHERE asset_id IS NOT NULL) AS verified, (SELECT COUNT(*) FROM marketplace_listings) AS listings, (SELECT COUNT(*) FROM marketplace_listings WHERE status = 'sold') AS sold, (SELECT COALESCE(SUM(sale_amount),0) FROM marketplace_transactions WHERE status='completed' AND created_at BETWEEN ? AND ?) AS gmv`, period),
		get(`SELECT COUNT(DISTINCT user_id) AS count FROM (SELECT owner_id AS user_id FROM assets WHERE created_at BETWEEN ? AND ? UNION SELECT user_id FROM verification_reports WHERE created_at BETWEEN ? AND ? UNION SELECT seller_id FROM marketplace_transactions WHERE created_at BETWEEN ? AND ? UNION SELECT buyer_id FROM marketplace_transactions WHERE created_at BETWEEN ? AND ?)`, [...period, ...period, ...period, ...period]),
		all(`SELECT ${bucketConfig(range.resolution).expression} AS bucket, COALESCE(SUM(sale_amount),0) AS value FROM marketplace_transactions WHERE status='completed' AND created_at BETWEEN ? AND ? GROUP BY bucket`, period),
		get(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END) AS completed FROM marketplace_transactions WHERE created_at BETWEEN ? AND ?`, period),
	]);
	const timeline = fillTimeline(range, { newUsers: users, newAssets: assets, transactions, revenue }); let cumulativeUsers = priorCounts.users; let cumulativeAssets = priorCounts.assets; const volumeMap = new Map(volumeRows.map((row) => [row.bucket, Number(row.value)]));
	for (const point of timeline) { cumulativeUsers += point.newUsers; cumulativeAssets += point.newAssets; point.users = cumulativeUsers; point.assets = cumulativeAssets; point.volume = volumeMap.get(point.key) || 0; }
	return { range, summary: { monthlyActiveUsers: activeUsers.count, newAssets: assets.reduce((sum, row) => sum + Number(row.value), 0), grossVolume: totals.gmv, activeRegions: null }, timeline, performance: [{ metric: 'Verification', value: totals.assets ? Math.round(totals.verified / totals.assets * 100) : 0 }, { metric: 'Sell-through', value: totals.listings ? Math.round(totals.sold / totals.listings * 100) : 0 }, { metric: 'Payment success', value: payment.total ? Math.round(payment.completed / payment.total * 100) : 0 }, { metric: 'Active users', value: totals.users ? Math.round(activeUsers.count / totals.users * 100) : 0 }], regions: [], geographyAvailable: false };
}

async function getActivityLogs() { return all(`SELECT l.id, u.full_name AS admin, l.action, l.target_type, l.target_id, l.details_json, l.ip_address, l.created_at FROM admin_activity_logs l JOIN users u ON u.id = l.admin_id ORDER BY l.created_at DESC LIMIT 250`); }
async function getNotifications(userId) { return all('SELECT id, title, message, is_read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 20', [userId]); }
async function markNotificationsRead(userId) { await run('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]); }

async function getSecurity() {
	const dbStarted = Date.now(); await get('SELECT 1 AS healthy'); const databaseLatencyMs = Date.now() - dbStarted;
	const [stats, attempts, logs] = await Promise.all([
		get(`SELECT (SELECT COUNT(*) FROM vault_unlock_sessions WHERE expires_at > CURRENT_TIMESTAMP) AS active_sessions, (SELECT COUNT(*) FROM users WHERE status = 'review') AS risky_accounts, (SELECT COUNT(*) FROM vault_unlock_attempts WHERE blocked_until > CURRENT_TIMESTAMP) AS blocked_threats`),
		all(`SELECT vua.updated_at AS created_at, vua.attempt_count, vua.blocked_until, u.email FROM vault_unlock_attempts vua JOIN users u ON u.id = vua.user_id WHERE vua.attempt_count > 0 ORDER BY vua.updated_at DESC LIMIT 50`), getActivityLogs(),
	]);
	const events = [...attempts.map((row) => ({ time: row.created_at, title: row.blocked_until ? 'Vault access temporarily blocked' : 'Failed Vault unlock attempts', detail: `${row.attempt_count} attempt${row.attempt_count === 1 ? '' : 's'} · ${row.email}`, level: row.blocked_until ? 'high' : 'medium', type: 'Vault access' })), ...logs.filter((row) => ['updated_user_access', 'changed_commission_rate'].includes(row.action)).map((row) => ({ time: row.created_at, title: row.action.replaceAll('_', ' '), detail: `${row.admin} · ${row.target_type || 'system'} ${row.target_id || ''}`, level: 'low', type: 'Admin' }))].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 50);
	const securityScore = Math.max(0, 100 - Number(stats.blocked_threats || 0) * 5 - Number(stats.risky_accounts || 0) * 2);
	return { summary: { securityScore, blockedThreats: stats.blocked_threats, activeSessions: stats.active_sessions, riskyAccounts: stats.risky_accounts }, health: { databaseLatencyMs, processUptimeSeconds: Math.round(process.uptime()), database: 'operational' }, events, controls: [{ name: 'JWT authentication', detail: 'Required on protected API routes', status: 'Active' }, { name: 'Admin audit logging', detail: 'Privileged mutations are recorded', status: 'Active' }, { name: 'Vault password protection', detail: 'Rate-limited bcrypt verification', status: 'Active' }, { name: 'Database at-rest encryption', detail: 'No encryption provider configured', status: 'Not configured' }], riskySessions: [] };
}

async function updateUser(id, { role, status }) { const fields = []; const params = []; if (role) { fields.push('role = ?'); params.push(role); } if (status) { fields.push('status = ?'); params.push(status); } if (!fields.length) return get('SELECT id, full_name, email, role, status FROM users WHERE id = ?', [id]); params.push(id); await run(`UPDATE users SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, params); return get('SELECT id, full_name, email, role, status FROM users WHERE id = ?', [id]); }
async function updateListing(id, status) { const result = await run("UPDATE marketplace_listings SET status = ? WHERE id = ? AND status IN ('active','cancelled')", [status, id]); return result.changes ? get('SELECT id, public_reference, status FROM marketplace_listings WHERE id = ?', [id]) : null; }
async function updateAsset(id, status) { await run('UPDATE assets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, id]); return get('SELECT id, title, status FROM assets WHERE id = ?', [id]); }
async function logAction({ adminId, action, targetType, targetId, details, ipAddress }) { await run(`INSERT INTO admin_activity_logs (admin_id, action, target_type, target_id, details_json, ip_address) VALUES (?, ?, ?, ?, ?, ?)`, [adminId, action, targetType || null, targetId || null, details ? JSON.stringify(details) : null, ipAddress || null]); }
async function getSettings() { const rows = await all('SELECT setting_key, setting_value, updated_at FROM platform_settings ORDER BY setting_key'); return Object.fromEntries(rows.map((row) => [row.setting_key, { value: row.setting_value, updatedAt: row.updated_at }])); }
async function updateSetting(key, value, adminId) { await run(`INSERT INTO platform_settings (setting_key, setting_value, updated_by, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP) ON CONFLICT(setting_key) DO UPDATE SET setting_value = excluded.setting_value, updated_by = excluded.updated_by, updated_at = CURRENT_TIMESTAMP`, [key, value, adminId]); }

module.exports = { resolveRange, getOverview, getRevenue, getMarketplace, getTransactions, getUsers, getAssets, getVerification, getAnalytics, getSecurity, updateUser, updateListing, updateAsset, logAction, getActivityLogs, getNotifications, markNotificationsRead, getSettings, updateSetting };
