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

async function getSummary(userId) {
	const row = await get(
		`SELECT
			(SELECT COUNT(*) FROM assets WHERE owner_id = ?) AS totalAssets,
			(SELECT COUNT(*)
			 FROM verification_reports vr
			 JOIN assets a ON a.id = vr.asset_id
			 WHERE a.owner_id = ?) AS totalVerificationReports,
			(SELECT COUNT(*) FROM vault_items WHERE owner_id = ?) AS totalVaultItems,
			(SELECT COALESCE(balance, 0) FROM wallets WHERE user_id = ?) AS walletBalance`,
		[userId, userId, userId, userId]
	);

	return {
		totalAssets: Number(row?.totalAssets || 0),
		totalVerificationReports: Number(row?.totalVerificationReports || 0),
		totalVaultItems: Number(row?.totalVaultItems || 0),
		walletBalance: Number(row?.walletBalance || 0),
	};
}

module.exports = {
	getSummary,
};
