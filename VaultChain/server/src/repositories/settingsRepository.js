const { database } = require('../database/database');

function get(sql, params = []) { return new Promise((resolve, reject) => database.get(sql, params, (error, row) => error ? reject(error) : resolve(row))); }

async function getNumericSetting(key, fallback) {
	const row = await get('SELECT setting_value FROM platform_settings WHERE setting_key = ? LIMIT 1', [key]);
	const value = Number(row?.setting_value);
	return Number.isFinite(value) ? value : fallback;
}

module.exports = { getNumericSetting };
