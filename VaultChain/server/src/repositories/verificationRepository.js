const { database } = require('../database/database');

function run(sql, params = []) {
	return new Promise((resolve, reject) => {
		database.run(sql, params, function onRun(error) {
			if (error) return reject(error);
			resolve(this);
		});
	});
}

function get(sql, params = []) {
	return new Promise((resolve, reject) => {
		database.get(sql, params, (error, row) => error ? reject(error) : resolve(row));
	});
}

function all(sql, params = []) {
	return new Promise((resolve, reject) => {
		database.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows));
	});
}

function mapRow(row) {
	if (!row) return null;
	let report = {};
	try {
		report = row.report_json ? JSON.parse(row.report_json) : {};
	} catch {
		report = {};
	}
	return {
		id: row.id,
		assetId: row.asset_id,
		assetOwnerId: row.asset_owner_id,
		assetTitle: row.asset_title,
		assetFileName: row.asset_file_name,
		verificationType: row.verification_type,
		sha256Match: Boolean(row.sha256_match),
		status: row.status,
		report,
		createdAt: row.created_at,
	};
}

const OWNED_REPORT_SELECT = `
	SELECT vr.*, a.owner_id AS asset_owner_id, a.title AS asset_title, a.file_name AS asset_file_name
	FROM verification_reports vr
	LEFT JOIN assets a ON a.id = vr.asset_id
`;

async function createVerificationReport({ userId, assetId, verificationType, sha256Match, status, report }) {
	const result = await run(
		`INSERT INTO verification_reports (user_id, asset_id, verification_type, sha256_match, similarity_score, status, report_json)
		 VALUES (?, ?, ?, ?, NULL, ?, ?)`,
		[userId, assetId, verificationType, sha256Match ? 1 : 0, status, JSON.stringify(report)]
	);
	const row = await get(
		`${OWNED_REPORT_SELECT} WHERE vr.id = ? LIMIT 1`,
		[result.lastID]
	);
	return mapRow(row);
}

async function getVerificationReportsByOwnerId(ownerId) {
	const rows = await all(
		`${OWNED_REPORT_SELECT}
		 WHERE vr.user_id = ? AND vr.verification_type IN ('image_comparison', 'global_image_search')
		 ORDER BY vr.created_at DESC, vr.id DESC`,
		[ownerId]
	);
	return rows.map(mapRow);
}

module.exports = {
	createVerificationReport,
	getVerificationReportsByOwnerId,
};
