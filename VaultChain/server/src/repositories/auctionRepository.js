const { run, get, all } = require('../database/database');

const defaultClient = { run, get, all };

const BID_SELECT = `
	SELECT
		auction_bids.id AS id,
		auction_bids.listing_id AS listing_id,
		auction_bids.bidder_id AS bidder_id,
		auction_bids.amount AS amount,
		auction_bids.status AS status,
		auction_bids.created_at AS created_at,
		users.full_name AS bidder_name
	FROM auction_bids
	JOIN users ON users.id = auction_bids.bidder_id
`;

function mapBidRow(row) {
	if (!row) {
		return null;
	}

	return {
		id: row.id,
		listingId: row.listing_id,
		bidderId: row.bidder_id,
		amount: row.amount,
		status: row.status,
		createdAt: row.created_at,
		bidderName: row.bidder_name,
	};
}

async function createBid({ listingId, bidderId, amount }, client = defaultClient) {
	const result = await client.run(
		`INSERT INTO auction_bids (listing_id, bidder_id, amount, status)
		 VALUES (?, ?, ?, 'held')`,
		[listingId, bidderId, amount]
	);

	const row = await client.get(`${BID_SELECT} WHERE auction_bids.id = ?`, [result.lastID]);

	return mapBidRow(row);
}

/**
 * The bid currently winning the auction: the highest bid whose funds are still
 * held. Ties break towards the bid placed first.
 */
async function getWinningBid(listingId, client = defaultClient) {
	const row = await client.get(
		`${BID_SELECT}
		 WHERE auction_bids.listing_id = ? AND auction_bids.status = 'held'
		 ORDER BY auction_bids.amount DESC, auction_bids.id ASC
		 LIMIT 1`,
		[listingId]
	);

	return mapBidRow(row);
}

async function getHeldBids(listingId, client = defaultClient) {
	const rows = await client.all(
		`${BID_SELECT} WHERE auction_bids.listing_id = ? AND auction_bids.status = 'held'`,
		[listingId]
	);

	return rows.map(mapBidRow);
}

async function getBidsByListingId(listingId, client = defaultClient) {
	const rows = await client.all(
		`${BID_SELECT} WHERE auction_bids.listing_id = ?
		 ORDER BY auction_bids.amount DESC, auction_bids.id ASC`,
		[listingId]
	);

	return rows.map(mapBidRow);
}

async function getBidCount(listingId, client = defaultClient) {
	const row = await client.get('SELECT COUNT(*) AS total FROM auction_bids WHERE listing_id = ?', [
		listingId,
	]);

	return row ? row.total : 0;
}

async function updateBidStatus(bidId, status, client = defaultClient) {
	await client.run('UPDATE auction_bids SET status = ? WHERE id = ?', [status, bidId]);
}

/**
 * Auctions whose end time has passed but which are still marked active, so
 * they can be settled.
 */
async function getExpiredActiveAuctionIds(client = defaultClient) {
	const rows = await client.all(
		`SELECT id FROM marketplace_listings
		 WHERE listing_type = 'auction'
		   AND status = 'active'
		   AND ends_at IS NOT NULL
		   AND ends_at <= CURRENT_TIMESTAMP
		 ORDER BY id ASC`
	);

	return rows.map((row) => row.id);
}

module.exports = {
	createBid,
	getWinningBid,
	getHeldBids,
	getBidsByListingId,
	getBidCount,
	updateBidStatus,
	getExpiredActiveAuctionIds,
};
