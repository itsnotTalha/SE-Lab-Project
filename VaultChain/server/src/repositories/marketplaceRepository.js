const { database } = require('../database/database');

function run(sql, params = []) {
	return new Promise((resolve, reject) => {
		database.run(sql, params, function onRun(error) {
			if (error) {
				reject(error);
				return;
			}

			resolve(this);
		});
	});
}

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

const LISTING_SELECT = `
	SELECT
		marketplace_listings.id AS id,
		marketplace_listings.asset_id AS asset_id,
		marketplace_listings.seller_id AS seller_id,
		marketplace_listings.listing_type AS listing_type,
		marketplace_listings.price AS price,
		marketplace_listings.status AS status,
		marketplace_listings.created_at AS created_at,
		assets.title AS asset_title,
		users.full_name AS seller_name
	FROM marketplace_listings
	JOIN assets ON assets.id = marketplace_listings.asset_id
	JOIN users ON users.id = marketplace_listings.seller_id
`;

function mapListingRow(row) {
	if (!row) {
		return null;
	}

	return {
		id: row.id,
		assetId: row.asset_id,
		sellerId: row.seller_id,
		listingType: row.listing_type,
		price: row.price,
		status: row.status,
		createdAt: row.created_at,
		assetTitle: row.asset_title,
		sellerName: row.seller_name,
	};
}

async function createListing({ assetId, sellerId, listingType, price }) {
	const result = await run(
		`INSERT INTO marketplace_listings (asset_id, seller_id, listing_type, price)
		 VALUES (?, ?, ?, ?)`,
		[assetId, sellerId, listingType, price]
	);

	const row = await get(`${LISTING_SELECT} WHERE marketplace_listings.id = ?`, [result.lastID]);

	return mapListingRow(row);
}

async function getActiveListings() {
	const rows = await all(`${LISTING_SELECT} WHERE marketplace_listings.status = 'active' ORDER BY marketplace_listings.created_at DESC`);

	return rows.map(mapListingRow);
}

async function getListingById(id) {
	const row = await get(`${LISTING_SELECT} WHERE marketplace_listings.id = ?`, [id]);

	return mapListingRow(row);
}

async function updateListing(id, { price, status }) {
	const fields = [];
	const params = [];

	if (price != null) {
		fields.push('price = ?');
		params.push(price);
	}

	if (status != null) {
		fields.push('status = ?');
		params.push(status);
	}

	if (fields.length === 0) {
		return getListingById(id);
	}

	params.push(id);
	await run(`UPDATE marketplace_listings SET ${fields.join(', ')} WHERE id = ?`, params);

	return getListingById(id);
}

async function softDeleteListing(id) {
	await run(`UPDATE marketplace_listings SET status = 'removed' WHERE id = ?`, [id]);

	return getListingById(id);
}

module.exports = {
	createListing,
	getActiveListings,
	getListingById,
	updateListing,
	softDeleteListing,
};
