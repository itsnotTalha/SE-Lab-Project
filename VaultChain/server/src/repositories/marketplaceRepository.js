const { database } = require('../database/database');
const { serializeTransaction } = require('../database/transactionQueue');

function run(sql, params = []) {
	return new Promise((resolve, reject) => {
		database.run(sql, params, function onRun(error) {
			if (error) return reject(error);
			resolve(this);
		});
	});
}

function get(sql, params = []) {
	return new Promise((resolve, reject) => database.get(sql, params, (error, row) => error ? reject(error) : resolve(row)));
}

function all(sql, params = []) {
	return new Promise((resolve, reject) => database.all(sql, params, (error, rows) => error ? reject(error) : resolve(rows)));
}

const LISTING_SELECT = `
	SELECT ml.id, ml.public_reference, ml.asset_id, ml.seller_id, ml.buyer_id,
		ml.title, ml.description, ml.listing_type, ml.price, ml.status, ml.created_at, ml.sold_at,
		a.owner_id AS asset_owner_id, a.title AS asset_title, a.description AS asset_description,
		a.category AS asset_category, a.file_name, a.file_path, a.file_size, a.mime_type,
		a.created_at AS asset_created_at, am.width, am.height
	FROM marketplace_listings ml
	JOIN assets a ON a.id = ml.asset_id
	LEFT JOIN asset_metadata am ON am.asset_id = a.id
`;

function mapListingRow(row) {
	if (!row) return null;
	return {
		id: row.id, reference: row.public_reference, assetId: row.asset_id,
		sellerId: row.seller_id, buyerId: row.buyer_id, title: row.title,
		description: row.description, listingType: row.listing_type, price: row.price,
		status: row.status, createdAt: row.created_at, soldAt: row.sold_at,
		asset: {
			id: row.asset_id, ownerId: row.asset_owner_id, title: row.asset_title,
			description: row.asset_description, category: row.asset_category,
			fileName: row.file_name, filePath: row.file_path, fileSize: row.file_size,
			mimeType: row.mime_type, createdAt: row.asset_created_at,
			width: row.width, height: row.height,
		},
	};
}

async function createListing({ reference, assetId, sellerId, title, description, price }) {
	const result = await run(
		`INSERT INTO marketplace_listings
			(public_reference, asset_id, seller_id, title, description, listing_type, price, status)
		 VALUES (?, ?, ?, ?, ?, 'sale', ?, 'active')`,
		[reference, assetId, sellerId, title, description || null, price]
	);
	return getListingById(result.lastID);
}

async function getListings() {
	return (await all(`${LISTING_SELECT} ORDER BY ml.created_at DESC, ml.id DESC`)).map(mapListingRow);
}

async function getListingById(id) {
	return mapListingRow(await get(`${LISTING_SELECT} WHERE ml.id = ? LIMIT 1`, [id]));
}

async function getListingByReference(reference) {
	return mapListingRow(await get(`${LISTING_SELECT} WHERE ml.public_reference = ? LIMIT 1`, [reference]));
}

async function getActiveListingForAsset(assetId) {
	return mapListingRow(await get(`${LISTING_SELECT} WHERE ml.asset_id = ? AND ml.status = 'active' LIMIT 1`, [assetId]));
}

async function updateActiveListing(reference, sellerId, { price, title, description }) {
	const result = await run(
		`UPDATE marketplace_listings SET price = COALESCE(?, price), title = COALESCE(?, title),
			description = COALESCE(?, description)
		 WHERE public_reference = ? AND seller_id = ? AND status = 'active'`,
		[price, title, description, reference, sellerId]
	);
	return { changes: result.changes, listing: await getListingByReference(reference) };
}

async function cancelListing(reference, sellerId) {
	const result = await run(
		`UPDATE marketplace_listings SET status = 'cancelled'
		 WHERE public_reference = ? AND seller_id = ? AND status = 'active'`,
		[reference, sellerId]
	);
	return { changes: result.changes, listing: await getListingByReference(reference) };
}

function purchaseError(status, message, code) {
	const error = new Error(message);
	error.status = status;
	error.code = code;
	return error;
}

async function purchaseListing({ reference, buyerId, transactionReference }) {
	return serializeTransaction(async () => {
		await run('BEGIN IMMEDIATE TRANSACTION');
		try {
			const listing = await get(
				`SELECT ml.*, a.owner_id AS asset_owner_id, a.title AS asset_title
				 FROM marketplace_listings ml JOIN assets a ON a.id = ml.asset_id
				 WHERE ml.public_reference = ? LIMIT 1`,
				[reference]
			);
			if (!listing) throw purchaseError(404, 'Listing not found', 'LISTING_NOT_FOUND');
			if (listing.status !== 'active') throw purchaseError(409, 'This listing is no longer available', 'LISTING_NOT_ACTIVE');
			if (listing.asset_owner_id !== listing.seller_id) throw purchaseError(409, 'The seller no longer owns this asset', 'OWNERSHIP_CHANGED');
			if (listing.seller_id === buyerId) throw purchaseError(409, 'You cannot purchase your own listing', 'OWN_LISTING');

			const buyerWallet = await get('SELECT id, balance FROM wallets WHERE user_id = ? LIMIT 1', [buyerId]);
			const sellerWallet = await get('SELECT id, balance FROM wallets WHERE user_id = ? LIMIT 1', [listing.seller_id]);
			if (!buyerWallet || !sellerWallet) throw purchaseError(404, 'Wallet not found', 'WALLET_NOT_FOUND');
			if (Number(buyerWallet.balance) < Number(listing.price)) {
				throw purchaseError(400, 'Insufficient VaultChain Credits', 'INSUFFICIENT_BALANCE');
			}

			const debit = await run(
				'UPDATE wallets SET balance = ROUND(balance - ?, 2) WHERE id = ? AND balance >= ?',
				[listing.price, buyerWallet.id, listing.price]
			);
			if (debit.changes !== 1) throw purchaseError(400, 'Insufficient VaultChain Credits', 'INSUFFICIENT_BALANCE');
			await run('UPDATE wallets SET balance = ROUND(balance + ?, 2) WHERE id = ?', [listing.price, sellerWallet.id]);

			const ownership = await run(
				'UPDATE assets SET owner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_id = ?',
				[buyerId, listing.asset_id, listing.seller_id]
			);
			if (ownership.changes !== 1) throw purchaseError(409, 'The seller no longer owns this asset', 'OWNERSHIP_CHANGED');

			const sale = await run(
				`UPDATE marketplace_listings SET status = 'sold', buyer_id = ?, sold_at = CURRENT_TIMESTAMP
				 WHERE id = ? AND status = 'active'`,
				[buyerId, listing.id]
			);
			if (sale.changes !== 1) throw purchaseError(409, 'This listing is no longer available', 'LISTING_NOT_ACTIVE');

			await run(
				`DELETE FROM vault_assets WHERE asset_id = ?
				 AND vault_id IN (SELECT id FROM vaults WHERE user_id = ?)`,
				[listing.asset_id, listing.seller_id]
			);
			await run(
				`INSERT INTO ownership_history
					(asset_id, previous_owner, new_owner, listing_id, price, transaction_reference, transfer_type)
				 VALUES (?, ?, ?, ?, ?, ?, 'marketplace_sale')`,
				[listing.asset_id, listing.seller_id, buyerId, listing.id, listing.price, transactionReference]
			);
			await run(
				`INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
				 VALUES (?, 'purchase', ?, ?, ?)`,
				[buyerWallet.id, listing.price, `Marketplace purchase: ${listing.asset_title}`, transactionReference]
			);
			await run(
				`INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
				 VALUES (?, 'sale', ?, ?, ?)`,
				[sellerWallet.id, listing.price, `Marketplace sale: ${listing.asset_title}`, transactionReference]
			);

			await run('COMMIT');
			const balances = await get(
				`SELECT (SELECT balance FROM wallets WHERE id = ?) AS buyer_balance,
					(SELECT balance FROM wallets WHERE id = ?) AS seller_balance`,
				[buyerWallet.id, sellerWallet.id]
			);
			const completed = await get('SELECT sold_at FROM marketplace_listings WHERE id = ?', [listing.id]);
			return {
				transactionReference, listingReference: reference, assetId: listing.asset_id,
				assetTitle: listing.asset_title, previousOwnerId: listing.seller_id,
				newOwnerId: buyerId, price: listing.price, completedAt: completed.sold_at,
				buyerBalance: balances.buyer_balance, sellerBalance: balances.seller_balance,
			};
		} catch (error) {
			try { await run('ROLLBACK'); } catch (rollbackError) { void rollbackError; }
			throw error;
		}
	});
}

async function getOwnershipHistory(assetId) {
	const rows = await all(
		`SELECT oh.transaction_reference, oh.previous_owner, oh.new_owner, oh.price,
			oh.transfer_type, oh.transferred_at, ml.public_reference AS listing_reference
		 FROM ownership_history oh LEFT JOIN marketplace_listings ml ON ml.id = oh.listing_id
		 WHERE oh.asset_id = ? ORDER BY oh.transferred_at DESC, oh.id DESC`,
		[assetId]
	);
	return rows.map((row) => ({
		transactionReference: row.transaction_reference,
		previousOwnerId: row.previous_owner, newOwnerId: row.new_owner,
		price: row.price, transferType: row.transfer_type,
		transferredAt: row.transferred_at, listingReference: row.listing_reference,
	}));
}

module.exports = {
	createListing, getListings, getListingById, getListingByReference,
	getActiveListingForAsset, updateActiveListing, cancelListing,
	purchaseListing, getOwnershipHistory,
};
