const { database } = require('../database/database');

function get(sql, params = []) {
	return new Promise((resolve, reject) => {
		database.get(sql, params, (error, row) => {
			if (error) {
				reject(error);
				return;
			}

			resolve(row);
		});
	});
}

function all(sql, params = []) {
	return new Promise((resolve, reject) => {
		database.all(sql, params, (error, rows) => {
			if (error) {
				reject(error);
				return;
			}

			resolve(rows);
		});
	});
}

async function getAnalytics(userId) {
	const today = new Date().toISOString().slice(0, 10);
	const start = new Date(`${today}T00:00:00Z`);
	start.setUTCDate(start.getUTCDate() - 29);
	const since = start.toISOString().slice(0, 10);
	const [activity, categories, ocr, verification, trading] = await Promise.all([
		all(`SELECT day, kind, COUNT(*) AS count FROM (
			SELECT date(created_at) AS day, 'assets' AS kind FROM assets WHERE owner_id = ?
			UNION ALL SELECT date(created_at), 'documents' FROM documents WHERE owner_id = ?
			UNION ALL SELECT date(created_at), 'verifications' FROM verification_reports WHERE user_id = ?
		) WHERE day BETWEEN ? AND ? GROUP BY day, kind`, [userId, userId, userId, since, today]),
		all(`SELECT COALESCE(NULLIF(category, ''), 'Uncategorized') AS name, COUNT(*) AS value
			FROM assets WHERE owner_id = ? GROUP BY COALESCE(NULLIF(category, ''), 'Uncategorized') ORDER BY value DESC, name`, [userId]),
		all('SELECT ocr_status AS name, COUNT(*) AS value FROM documents WHERE owner_id = ? GROUP BY ocr_status ORDER BY value DESC', [userId]),
		all("SELECT COALESCE(status, 'unknown') AS name, COUNT(*) AS value FROM verification_reports WHERE user_id = ? GROUP BY status ORDER BY value DESC", [userId]),
		all(`SELECT date(created_at) AS day,
			SUM(CASE WHEN seller_id = ? THEN seller_amount ELSE 0 END) AS earnings,
			SUM(CASE WHEN buyer_id = ? THEN sale_amount ELSE 0 END) AS spending
			FROM marketplace_transactions WHERE (seller_id = ? OR buyer_id = ?) AND status = 'completed'
			AND date(created_at) BETWEEN ? AND ? GROUP BY date(created_at)`, [userId, userId, userId, userId, since, today]),
	]);
	const daily = Array.from({ length: 30 }, (_, index) => {
		const date = new Date(start); date.setUTCDate(date.getUTCDate() + index);
		return { date: date.toISOString().slice(0, 10), assets: 0, documents: 0, verifications: 0, earnings: 0, spending: 0 };
	});
	const byDate = new Map(daily.map((day) => [day.date, day]));
	for (const row of activity) byDate.get(row.day)[row.kind] = row.count;
	for (const row of trading) Object.assign(byDate.get(row.day), { earnings: row.earnings, spending: row.spending });
	return { daily, categories, ocr, verification, timezone: 'UTC' };
}

async function getSummary(userId) {
	const [row, recentAssetRows, recentDocumentRows, recentActivityRows, analytics] = await Promise.all([get(
		`SELECT
			(SELECT COUNT(*) FROM assets WHERE owner_id = ?) AS totalAssets,
			(SELECT COUNT(*) FROM documents WHERE owner_id = ?) AS totalDocuments,
			(SELECT COUNT(*) FROM verification_reports WHERE user_id = ?) AS totalVerificationReports,
			(SELECT COUNT(*) FROM vaults WHERE user_id = ?) AS totalVaults,
			(SELECT COUNT(DISTINCT va.asset_id) FROM vault_assets va JOIN vaults v ON v.id = va.vault_id JOIN assets a ON a.id = va.asset_id WHERE v.user_id = ? AND a.owner_id = v.user_id) AS totalOrganizedAssets,
			(SELECT COUNT(*) FROM marketplace_listings WHERE seller_id = ? AND status = 'active') AS activeListings,
			(SELECT COALESCE(balance, 0) FROM wallets WHERE user_id = ?) AS walletBalance`,
		[userId, userId, userId, userId, userId, userId, userId]
	), all(
		`SELECT id, title, category, mime_type, created_at
		 FROM assets
		 WHERE owner_id = ?
		 ORDER BY created_at DESC, id DESC
		 LIMIT 5`,
		[userId]
	), all(
		`SELECT id, original_name, mime_type, ocr_status, created_at
		 FROM documents
		 WHERE owner_id = ?
		 ORDER BY created_at DESC, id DESC
		 LIMIT 5`,
		[userId]
	), all(
		`SELECT activity_type, title, amount, reference, status, asset_id, document_id, created_at
		 FROM (
			SELECT 'asset_upload' AS activity_type, title, NULL AS amount,
				'VC-A' || printf('%06d', id) AS reference, NULL AS status,
				id AS asset_id, NULL AS document_id, created_at, id AS sequence
			FROM assets WHERE owner_id = ?
			UNION ALL
			SELECT 'verification' AS activity_type, 'Image verification' AS title, NULL AS amount,
				NULL AS reference, status, asset_id, NULL AS document_id, created_at, id AS sequence
			FROM verification_reports WHERE user_id = ?
			UNION ALL
			SELECT wt.type AS activity_type, COALESCE(wt.description, wt.type) AS title, wt.amount,
				wt.reference_id AS reference, NULL AS status, NULL AS asset_id, NULL AS document_id,
				wt.created_at, wt.id AS sequence
			FROM wallet_transactions wt
			JOIN wallets w ON w.id = wt.wallet_id
			WHERE w.user_id = ? AND wt.type IN ('purchase', 'sale')
			UNION ALL
			SELECT 'document_upload' AS activity_type, original_name AS title, NULL AS amount,
				'DOC-' || printf('%06d', id) AS reference, ocr_status AS status,
				NULL AS asset_id, id AS document_id, created_at, id AS sequence
			FROM documents WHERE owner_id = ?
		 )
		 ORDER BY created_at DESC, sequence DESC
		 LIMIT 8`,
		[userId, userId, userId, userId]
	), getAnalytics(userId)]);

	return {
		analytics,
		totalAssets: Number(row?.totalAssets || 0),
		totalDocuments: Number(row?.totalDocuments || 0),
		totalVerificationReports: Number(row?.totalVerificationReports || 0),
		totalVaults: Number(row?.totalVaults || 0),
		totalOrganizedAssets: Number(row?.totalOrganizedAssets || 0),
		totalVaultItems: Number(row?.totalOrganizedAssets || 0),
		activeListings: Number(row?.activeListings || 0),
		walletBalance: Number(row?.walletBalance || 0),
		recentAssets: recentAssetRows.map((asset) => ({
			id: asset.id,
			title: asset.title,
			category: asset.category,
			mimeType: asset.mime_type,
			createdAt: asset.created_at,
		})),
		recentDocuments: recentDocumentRows.map((document) => ({
			id: document.id,
			originalName: document.original_name,
			mimeType: document.mime_type,
			ocrStatus: document.ocr_status,
			createdAt: document.created_at,
		})),
		recentActivity: recentActivityRows.map((activity) => ({
			type: activity.activity_type,
			title: activity.title,
			amount: activity.amount == null ? null : Number(activity.amount),
			reference: activity.reference,
			status: activity.status,
			assetId: activity.asset_id,
			documentId: activity.document_id,
			createdAt: activity.created_at,
		})),
	};
}

module.exports = {
	getSummary,
};
