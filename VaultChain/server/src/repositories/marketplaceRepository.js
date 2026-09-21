const { run, get, all } = require('../database/database');

// Every function accepts an optional `client` so it can either run on its own
// or take part in a caller's transaction (see database.withTransaction).
const defaultClient = { run, get, all };

const LISTING_SELECT = `
	SELECT
		marketplace_listings.id AS id,
		marketplace_listings.asset_id AS asset_id,
		marketplace_listings.seller_id AS seller_id,
		marketplace_listings.buyer_id AS buyer_id,
		marketplace_listings.listing_type AS listing_type,
		marketplace_listings.price AS price,
		marketplace_listings.description AS description,
		marketplace_listings.status AS status,
		marketplace_listings.starting_price AS starting_price,
		marketplace_listings.reserve_price AS reserve_price,
		marketplace_listings.min_bid_increment AS min_bid_increment,
		marketplace_listings.ends_at AS ends_at,
		marketplace_listings.share_count AS share_count,
		marketplace_listings.created_at AS created_at,
		marketplace_listings.updated_at AS updated_at,
		marketplace_listings.sold_at AS sold_at,
		assets.title AS asset_title,
		assets.category AS asset_category,
		assets.owner_id AS asset_owner_id,
		sellers.full_name AS seller_name,
		buyers.full_name AS buyer_name,
		(
			SELECT MAX(amount) FROM auction_bids
			WHERE auction_bids.listing_id = marketplace_listings.id AND auction_bids.status = 'held'
		) AS current_bid,
		(
			SELECT COUNT(*) FROM auction_bids
			WHERE auction_bids.listing_id = marketplace_listings.id
		) AS bid_count
	FROM marketplace_listings
	JOIN assets ON assets.id = marketplace_listings.asset_id
	JOIN users AS sellers ON sellers.id = marketplace_listings.seller_id
	LEFT JOIN users AS buyers ON buyers.id = marketplace_listings.buyer_id
`;

const SORT_CLAUSES = {
	newest: 'marketplace_listings.created_at DESC, marketplace_listings.id DESC',
	oldest: 'marketplace_listings.created_at ASC, marketplace_listings.id ASC',
	price_asc: 'marketplace_listings.price ASC, marketplace_listings.id DESC',
	price_desc: 'marketplace_listings.price DESC, marketplace_listings.id DESC',
};

function mapListingRow(row) {
	if (!row) {
		return null;
	}

	return {
		id: row.id,
		assetId: row.asset_id,
		sellerId: row.seller_id,
		buyerId: row.buyer_id,
		listingType: row.listing_type,
		price: row.price,
		description: row.description,
		status: row.status,
		startingPrice: row.starting_price,
		reservePrice: row.reserve_price,
		minBidIncrement: row.min_bid_increment,
		endsAt: row.ends_at,
		shareCount: row.share_count,
		currentBid: row.current_bid,
		bidCount: row.bid_count,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
		soldAt: row.sold_at,
		assetTitle: row.asset_title,
		assetCategory: row.asset_category,
		assetOwnerId: row.asset_owner_id,
		sellerName: row.seller_name,
		buyerName: row.buyer_name,
	};
}

async function createListing(
	{
		assetId,
		sellerId,
		listingType,
		price,
		description,
		startingPrice,
		reservePrice,
		minBidIncrement,
		endsAt,
		shareCount,
	},
	client = defaultClient
) {
	const result = await client.run(
		`INSERT INTO marketplace_listings (
			asset_id, seller_id, listing_type, price, description,
			starting_price, reserve_price, min_bid_increment, ends_at, share_count, updated_at
		 ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
		[
			assetId,
			sellerId,
			listingType,
			price,
			description || null,
			startingPrice ?? null,
			reservePrice ?? null,
			minBidIncrement ?? null,
			endsAt ?? null,
			shareCount ?? null,
		]
	);

	const row = await client.get(`${LISTING_SELECT} WHERE marketplace_listings.id = ?`, [result.lastID]);

	return mapListingRow(row);
}

/**
 * Browse query for active listings. Search, filters, sorting and paging are
 * all applied in SQL so the client never has to download the full table.
 */
async function getActiveListings(
	{ search, minPrice, maxPrice, category, listingType, sort = 'newest', limit = 20, offset = 0 } = {},
	client = defaultClient
) {
	const conditions = ["marketplace_listings.status = 'active'"];
	const params = [];

	if (search) {
		conditions.push('LOWER(assets.title) LIKE ?');
		params.push(`%${String(search).toLowerCase()}%`);
	}

	if (listingType) {
		conditions.push('marketplace_listings.listing_type = ?');
		params.push(listingType);
	}

	if (minPrice != null) {
		conditions.push('marketplace_listings.price >= ?');
		params.push(minPrice);
	}

	if (maxPrice != null) {
		conditions.push('marketplace_listings.price <= ?');
		params.push(maxPrice);
	}

	if (category) {
		conditions.push('LOWER(assets.category) = ?');
		params.push(String(category).toLowerCase());
	}

	const whereClause = `WHERE ${conditions.join(' AND ')}`;
	const orderClause = SORT_CLAUSES[sort] || SORT_CLAUSES.newest;

	const countRow = await client.get(
		`SELECT COUNT(*) AS total
		 FROM marketplace_listings
		 JOIN assets ON assets.id = marketplace_listings.asset_id
		 ${whereClause}`,
		params
	);

	const rows = await client.all(`${LISTING_SELECT} ${whereClause} ORDER BY ${orderClause} LIMIT ? OFFSET ?`, [
		...params,
		limit,
		offset,
	]);

	return {
		listings: rows.map(mapListingRow),
		total: countRow ? countRow.total : 0,
	};
}

async function getListingById(id, client = defaultClient) {
	const row = await client.get(`${LISTING_SELECT} WHERE marketplace_listings.id = ?`, [id]);

	return mapListingRow(row);
}

/**
 * An active sale or auction listing for the asset. Fractional listings are
 * excluded because several co-owners may each be offering their own shares at
 * the same time.
 */
async function getActiveListingByAssetId(assetId, client = defaultClient) {
	const row = await client.get(
		`${LISTING_SELECT}
		 WHERE marketplace_listings.asset_id = ?
		   AND marketplace_listings.status = 'active'
		   AND marketplace_listings.listing_type IN ('sale', 'auction')
		 LIMIT 1`,
		[assetId]
	);

	return mapListingRow(row);
}

async function getActiveFractionalListing(assetId, sellerId, client = defaultClient) {
	const row = await client.get(
		`${LISTING_SELECT}
		 WHERE marketplace_listings.asset_id = ?
		   AND marketplace_listings.seller_id = ?
		   AND marketplace_listings.status = 'active'
		   AND marketplace_listings.listing_type = 'fractional'
		 LIMIT 1`,
		[assetId, sellerId]
	);

	return mapListingRow(row);
}

/**
 * Ends a listing without a sale — an auction that drew no bids, or whose best
 * bid never reached the reserve.
 */
async function closeListing(id, client = defaultClient) {
	await client.run(
		`UPDATE marketplace_listings
		 SET status = 'closed', updated_at = CURRENT_TIMESTAMP
		 WHERE id = ?`,
		[id]
	);

	return getListingById(id, client);
}

async function getListingsBySellerId(sellerId, client = defaultClient) {
	const rows = await client.all(
		`${LISTING_SELECT} WHERE marketplace_listings.seller_id = ?
		 ORDER BY marketplace_listings.created_at DESC, marketplace_listings.id DESC`,
		[sellerId]
	);

	return rows.map(mapListingRow);
}

async function updateListing(id, { price, status, description }, client = defaultClient) {
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

	if (description != null) {
		fields.push('description = ?');
		params.push(description);
	}

	if (fields.length === 0) {
		return getListingById(id, client);
	}

	fields.push('updated_at = CURRENT_TIMESTAMP');
	params.push(id);

	await client.run(`UPDATE marketplace_listings SET ${fields.join(', ')} WHERE id = ?`, params);

	return getListingById(id, client);
}

async function softDeleteListing(id, client = defaultClient) {
	await client.run(
		`UPDATE marketplace_listings
		 SET status = 'removed', updated_at = CURRENT_TIMESTAMP
		 WHERE id = ?`,
		[id]
	);

	return getListingById(id, client);
}

/**
 * Marks a listing sold, but only if it is still active. Returns the number of
 * rows changed, so a settlement can tell that another buyer got there first
 * instead of charging a second buyer for the same asset.
 */
async function claimListingForBuyer({ listingId, buyerId }, client) {
	if (!client) {
		throw new Error('claimListingForBuyer must run inside a transaction');
	}

	const result = await client.run(
		`UPDATE marketplace_listings
		 SET status = 'sold', buyer_id = ?, sold_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
		 WHERE id = ? AND status = 'active'`,
		[buyerId, listingId]
	);

	return result.changes;
}

async function getTradesByUserId(userId, client = defaultClient) {
	const rows = await client.all(
		`${LISTING_SELECT}
		 WHERE marketplace_listings.status = 'sold'
		   AND (marketplace_listings.buyer_id = ? OR marketplace_listings.seller_id = ?)
		 ORDER BY marketplace_listings.sold_at DESC, marketplace_listings.id DESC`,
		[userId, userId]
	);

	return rows.map((row) => {
		const listing = mapListingRow(row);

		return {
			...listing,
			role: listing.buyerId === userId ? 'buyer' : 'seller',
		};
	});
}

/**
 * The assets a user owns, annotated with whatever the marketplace needs to
 * decide whether each one can be listed right now.
 *
 * verification_reports has no repository of its own yet — it moves there when
 * the Verification module is built.
 */
async function getOwnedAssetsWithListingState(userId, client = defaultClient) {
	const rows = await client.all(
		`SELECT
			assets.id AS id,
			assets.title AS title,
			assets.category AS category,
			assets.created_at AS created_at,
			active_listings.id AS active_listing_id,
			fractional_assets.total_shares AS total_shares,
			holdings.shares AS my_shares,
			asset_hashes.sha256_hash AS sha256_hash,
			asset_hashes.phash AS phash,
			latest_reports.status AS verification_status,
			latest_reports.created_at AS verification_created_at
		 FROM assets
		 LEFT JOIN marketplace_listings AS active_listings
			ON active_listings.asset_id = assets.id
			AND active_listings.status = 'active'
			AND active_listings.listing_type IN ('sale', 'auction')
		 LEFT JOIN fractional_assets ON fractional_assets.asset_id = assets.id
		 LEFT JOIN fractional_ownership AS holdings
			ON holdings.asset_id = assets.id AND holdings.user_id = assets.owner_id
		 LEFT JOIN asset_hashes ON asset_hashes.asset_id = assets.id
		 LEFT JOIN (
			-- SQLite picks the row holding MAX(created_at) for the bare columns
			-- in a MAX()/MIN() aggregate, so this is the latest report per asset.
			SELECT asset_id, status, MAX(created_at) AS created_at
			FROM verification_reports
			GROUP BY asset_id
		 ) AS latest_reports ON latest_reports.asset_id = assets.id
		 WHERE assets.owner_id = ?
		 ORDER BY assets.created_at DESC, assets.id DESC`,
		[userId]
	);

	return rows.map((row) => ({
		id: row.id,
		title: row.title,
		category: row.category,
		createdAt: row.created_at,
		activeListingId: row.active_listing_id,
		totalShares: row.total_shares,
		myShares: row.my_shares,
		sha256Hash: row.sha256_hash,
		phash: row.phash,
		verificationStatus: row.verification_status,
		verificationCreatedAt: row.verification_created_at,
	}));
}

async function getLatestVerificationReportByAssetId(assetId, client = defaultClient) {
	const row = await client.get(
		`SELECT id, asset_id, verification_type, sha256_match, similarity_score, status, created_at
		 FROM verification_reports
		 WHERE asset_id = ?
		 ORDER BY created_at DESC, id DESC
		 LIMIT 1`,
		[assetId]
	);

	if (!row) {
		return null;
	}

	return {
		id: row.id,
		assetId: row.asset_id,
		verificationType: row.verification_type,
		sha256Match: row.sha256_match,
		similarityScore: row.similarity_score,
		status: row.status,
		createdAt: row.created_at,
	};
}

module.exports = {
	createListing,
	getActiveListings,
	getListingById,
	getActiveListingByAssetId,
	getActiveFractionalListing,
	getListingsBySellerId,
	updateListing,
	softDeleteListing,
	closeListing,
	claimListingForBuyer,
	getTradesByUserId,
	getOwnedAssetsWithListingState,
	getLatestVerificationReportByAssetId,
};
