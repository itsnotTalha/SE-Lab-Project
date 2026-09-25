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
		u.full_name AS seller_name,
		d.id AS document_id, d.page_count AS document_page_count,
		a.owner_id AS asset_owner_id, a.title AS asset_title, a.description AS asset_description,
		a.category AS asset_category, a.file_name, a.file_path, a.file_size, a.mime_type,
		a.created_at AS asset_created_at, am.width, am.height
	FROM marketplace_listings ml
	JOIN assets a ON a.id = ml.asset_id
	LEFT JOIN users u ON u.id = ml.seller_id
	LEFT JOIN documents d ON (d.asset_id = a.id OR d.file_path = a.file_path)
	LEFT JOIN asset_metadata am ON am.asset_id = a.id
`;

function mapListingRow(row) {
	if (!row) return null;
	return {
		id: row.id, reference: row.public_reference, assetId: row.asset_id,
		sellerId: row.seller_id, sellerName: row.seller_name || 'Verified Seller', buyerId: row.buyer_id, title: row.title,
		description: row.description, listingType: row.listing_type, price: row.price,
		status: row.status, createdAt: row.created_at, soldAt: row.sold_at,
		documentId: row.document_id || null,
		documentPageCount: row.document_page_count || 1,
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
			const feeSetting = await get("SELECT setting_value FROM platform_settings WHERE setting_key = 'marketplace_commission_rate' LIMIT 1");
			const commissionRate = Math.max(0, Math.min(1, Number(feeSetting?.setting_value ?? 0.05)));
			const platformFee = Math.round(Number(listing.price) * commissionRate * 100) / 100;
			const sellerAmount = Math.round((Number(listing.price) - platformFee) * 100) / 100;

			const debit = await run(
				'UPDATE wallets SET balance = ROUND(balance - ?, 2) WHERE id = ? AND balance >= ?',
				[listing.price, buyerWallet.id, listing.price]
			);
			if (debit.changes !== 1) throw purchaseError(400, 'Insufficient VaultChain Credits', 'INSUFFICIENT_BALANCE');
			await run('UPDATE wallets SET balance = ROUND(balance + ?, 2) WHERE id = ?', [sellerAmount, sellerWallet.id]);

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
				`INSERT INTO marketplace_transactions
					(transaction_id, asset_id, listing_id, seller_id, buyer_id, sale_amount, platform_fee, seller_amount, status)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
				[transactionReference, listing.asset_id, listing.id, listing.seller_id, buyerId, listing.price, platformFee, sellerAmount]
			);
			await run(
				`INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
				 VALUES (?, 'purchase', ?, ?, ?)`,
				[buyerWallet.id, listing.price, `Marketplace purchase: ${listing.asset_title}`, transactionReference]
			);
			await run(
				`INSERT INTO wallet_transactions (wallet_id, type, amount, description, reference_id)
				 VALUES (?, 'sale', ?, ?, ?)`,
				[sellerWallet.id, sellerAmount, `Marketplace sale payout after ${Math.round(commissionRate * 10000) / 100}% platform fee: ${listing.asset_title}`, transactionReference]
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
				newOwnerId: buyerId, price: listing.price, platformFee, sellerAmount, completedAt: completed.sold_at,
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

function mapAccessRequestRow(row) {
	if (!row) return null;
	return {
		id: row.id,
		listingId: row.marketplace_listing_id,
		listingReference: row.listing_reference || null,
		listingTitle: row.listing_title || null,
		listingPrice: row.listing_price || null,
		documentId: row.document_id || row.doc_id || null,
		documentName: row.document_name || null,
		documentPageCount: row.document_page_count || 1,
		requesterId: row.requester_id,
		requesterName: row.requester_name || null,
		requesterEmail: row.requester_email || null,
		ownerId: row.owner_id,
		ownerName: row.owner_name || null,
		ownerEmail: row.owner_email || null,
		message: row.message || null,
		status: row.status,
		createdAt: row.created_at,
		respondedAt: row.responded_at || null,
		respondedBy: row.responded_by || null,
	};
}

async function createAccessRequest({ listingId, documentId, requesterId, ownerId, message }) {
	const result = await run(
		`INSERT INTO access_requests
			(marketplace_listing_id, document_id, requester_id, owner_id, message, status)
		 VALUES (?, ?, ?, ?, ?, 'pending')`,
		[listingId, documentId || null, requesterId, ownerId, message || null]
	);
	return getAccessRequestById(result.lastID);
}

async function getPendingAccessRequest({ listingId, requesterId }) {
	return get(
		`SELECT ar.*, ml.public_reference AS listing_reference, ml.title AS listing_title
		 FROM access_requests ar
		 JOIN marketplace_listings ml ON ml.id = ar.marketplace_listing_id
		 WHERE ar.marketplace_listing_id = ? AND ar.requester_id = ? AND ar.status = 'pending'
		 LIMIT 1`,
		[listingId, requesterId]
	);
}

async function getAccessRequestById(id) {
	const row = await get(
		`SELECT ar.*,
			ml.public_reference AS listing_reference, ml.title AS listing_title, ml.price AS listing_price,
			u.full_name AS requester_name, u.email AS requester_email,
			o.full_name AS owner_name, o.email AS owner_email,
			d.id AS doc_id, d.original_name AS document_name, d.page_count AS document_page_count,
			ag.id AS grant_id, ag.access_type, ag.can_view, ag.can_download, ag.revoked_at, ag.expires_at
		 FROM access_requests ar
		 JOIN marketplace_listings ml ON ml.id = ar.marketplace_listing_id
		 JOIN users u ON u.id = ar.requester_id
		 JOIN users o ON o.id = ar.owner_id
		 LEFT JOIN documents d ON d.id = ar.document_id
		 LEFT JOIN access_grants ag ON ag.access_request_id = ar.id
		 WHERE ar.id = ? LIMIT 1`,
		[id]
	);
	if (!row) return null;
	const req = mapAccessRequestRow(row);
	if (row.grant_id) {
		const pages = await getGrantPages(row.grant_id);
		req.grant = {
			id: row.grant_id,
			accessType: row.access_type,
			canView: Boolean(row.can_view),
			canDownload: Boolean(row.can_download),
			revokedAt: row.revoked_at,
			expiresAt: row.expires_at,
			pages,
		};
	}
	return req;
}

async function getAccessRequestsByOwner(ownerId) {
	const rows = await all(
		`SELECT ar.*,
			ml.public_reference AS listing_reference, ml.title AS listing_title, ml.price AS listing_price,
			u.full_name AS requester_name, u.email AS requester_email,
			d.id AS doc_id, d.original_name AS document_name, d.page_count AS document_page_count,
			ag.id AS grant_id, ag.access_type, ag.can_view, ag.can_download, ag.revoked_at, ag.expires_at
		 FROM access_requests ar
		 JOIN marketplace_listings ml ON ml.id = ar.marketplace_listing_id
		 JOIN users u ON u.id = ar.requester_id
		 LEFT JOIN documents d ON d.id = ar.document_id
		 LEFT JOIN access_grants ag ON ag.access_request_id = ar.id
		 WHERE ar.owner_id = ?
		 ORDER BY ar.created_at DESC, ar.id DESC`,
		[ownerId]
	);
	return Promise.all(rows.map(async (row) => {
		const req = mapAccessRequestRow(row);
		if (row.grant_id) {
			const pages = await getGrantPages(row.grant_id);
			req.grant = {
				id: row.grant_id,
				accessType: row.access_type,
				canView: Boolean(row.can_view),
				canDownload: Boolean(row.can_download),
				revokedAt: row.revoked_at,
				expiresAt: row.expires_at,
				pages,
			};
		}
		return req;
	}));
}

async function getAccessRequestsByRequester(requesterId) {
	const rows = await all(
		`SELECT ar.*,
			ml.public_reference AS listing_reference, ml.title AS listing_title, ml.price AS listing_price,
			o.full_name AS owner_name, o.email AS owner_email,
			d.id AS doc_id, d.original_name AS document_name, d.page_count AS document_page_count,
			ag.id AS grant_id, ag.access_type, ag.can_view, ag.can_download, ag.revoked_at, ag.expires_at
		 FROM access_requests ar
		 JOIN marketplace_listings ml ON ml.id = ar.marketplace_listing_id
		 JOIN users o ON o.id = ar.owner_id
		 LEFT JOIN documents d ON d.id = ar.document_id
		 LEFT JOIN access_grants ag ON ag.access_request_id = ar.id
		 WHERE ar.requester_id = ?
		 ORDER BY ar.created_at DESC, ar.id DESC`,
		[requesterId]
	);
	return Promise.all(rows.map(async (row) => {
		const req = mapAccessRequestRow(row);
		if (row.grant_id) {
			const pages = await getGrantPages(row.grant_id);
			req.grant = {
				id: row.grant_id,
				accessType: row.access_type,
				canView: Boolean(row.can_view),
				canDownload: Boolean(row.can_download),
				revokedAt: row.revoked_at,
				expiresAt: row.expires_at,
				pages,
			};
		}
		return req;
	}));
}

async function getLatestAccessRequestForListingAndBuyer(listingId, buyerId) {
	const row = await get(
		`SELECT ar.*,
			ml.public_reference AS listing_reference, ml.title AS listing_title, ml.price AS listing_price,
			u.full_name AS requester_name, u.email AS requester_email,
			o.full_name AS owner_name, o.email AS owner_email,
			d.id AS doc_id, d.original_name AS document_name, d.page_count AS document_page_count,
			ag.id AS grant_id, ag.access_type, ag.can_view, ag.can_download, ag.revoked_at, ag.expires_at
		 FROM access_requests ar
		 JOIN marketplace_listings ml ON ml.id = ar.marketplace_listing_id
		 JOIN users u ON u.id = ar.requester_id
		 JOIN users o ON o.id = ar.owner_id
		 LEFT JOIN documents d ON d.id = ar.document_id
		 LEFT JOIN access_grants ag ON ag.access_request_id = ar.id
		 WHERE ar.marketplace_listing_id = ? AND ar.requester_id = ?
		 ORDER BY ar.created_at DESC, ar.id DESC
		 LIMIT 1`,
		[listingId, buyerId]
	);
	if (!row) return null;
	const req = mapAccessRequestRow(row);
	if (row.grant_id) {
		const pages = await getGrantPages(row.grant_id);
		req.grant = {
			id: row.grant_id,
			accessType: row.access_type,
			canView: Boolean(row.can_view),
			canDownload: Boolean(row.can_download),
			revokedAt: row.revoked_at,
			expiresAt: row.expires_at,
			pages,
		};
	}
	return req;
}

async function updateAccessRequestStatus(id, { status, respondedBy }) {
	await run(
		`UPDATE access_requests
		 SET status = ?, responded_at = CURRENT_TIMESTAMP, responded_by = ?
		 WHERE id = ?`,
		[status, respondedBy, id]
	);
	return getAccessRequestById(id);
}

async function getGrantPages(grantId) {
	const rows = await all(`SELECT page_number FROM access_grant_pages WHERE grant_id = ? ORDER BY page_number ASC`, [grantId]);
	return rows.map((r) => r.page_number);
}

async function createAccessGrant({ accessRequestId, listingId, documentId, buyerId, ownerId, accessType = 'all', canView = 1, canDownload = 0, expiresAt = null, pages = [] }) {
	await run(
		`UPDATE access_grants SET revoked_at = CURRENT_TIMESTAMP
		 WHERE marketplace_listing_id = ? AND buyer_id = ? AND revoked_at IS NULL`,
		[listingId, buyerId]
	);

	const grantRes = await run(
		`INSERT INTO access_grants
			(access_request_id, marketplace_listing_id, document_id, buyer_id, owner_id, access_type, can_view, can_download, expires_at)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		[
			accessRequestId || null,
			listingId,
			documentId || null,
			buyerId,
			ownerId,
			accessType,
			canView ? 1 : 0,
			canDownload ? 1 : 0,
			expiresAt || null,
		]
	);
	const grantId = grantRes.lastID;

	if (Array.isArray(pages) && pages.length > 0 && (accessType === 'selected' || accessType === 'single')) {
		for (const pageNum of pages) {
			const p = parseInt(pageNum, 10);
			if (!isNaN(p)) {
				await run(
					`INSERT INTO access_grant_pages (grant_id, page_number) VALUES (?, ?)`,
					[grantId, p]
				);
			}
		}
	}

	return getAccessGrantById(grantId);
}

async function getAccessGrantById(id) {
	const row = await get(`SELECT * FROM access_grants WHERE id = ? LIMIT 1`, [id]);
	if (!row) return null;
	const pages = await getGrantPages(id);
	return {
		id: row.id,
		accessRequestId: row.access_request_id,
		listingId: row.marketplace_listing_id,
		documentId: row.document_id,
		buyerId: row.buyer_id,
		ownerId: row.owner_id,
		accessType: row.access_type,
		canView: Boolean(row.can_view),
		canDownload: Boolean(row.can_download),
		expiresAt: row.expires_at,
		createdAt: row.created_at,
		revokedAt: row.revoked_at,
		pages,
	};
}

async function getAccessGrantByRequestId(requestId) {
	const row = await get(`SELECT * FROM access_grants WHERE access_request_id = ? LIMIT 1`, [requestId]);
	if (!row) return null;
	const pages = await getGrantPages(row.id);
	return {
		id: row.id,
		accessRequestId: row.access_request_id,
		listingId: row.marketplace_listing_id,
		documentId: row.document_id,
		buyerId: row.buyer_id,
		ownerId: row.owner_id,
		accessType: row.access_type,
		canView: Boolean(row.can_view),
		canDownload: Boolean(row.can_download),
		expiresAt: row.expires_at,
		createdAt: row.created_at,
		revokedAt: row.revoked_at,
		pages,
	};
}

async function getActiveAccessGrant({ buyerId, listingId, documentId }) {
	let sql = `SELECT * FROM access_grants
		WHERE buyer_id = ?
		  AND revoked_at IS NULL
		  AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`;
	const params = [buyerId];

	if (listingId) {
		sql += ` AND marketplace_listing_id = ?`;
		params.push(listingId);
	}
	if (documentId) {
		sql += ` AND document_id = ?`;
		params.push(documentId);
	}
	sql += ` ORDER BY id DESC LIMIT 1`;

	const row = await get(sql, params);
	if (!row) return null;
	const pages = await getGrantPages(row.id);
	return {
		id: row.id,
		accessRequestId: row.access_request_id,
		listingId: row.marketplace_listing_id,
		documentId: row.document_id,
		buyerId: row.buyer_id,
		ownerId: row.owner_id,
		accessType: row.access_type,
		canView: Boolean(row.can_view),
		canDownload: Boolean(row.can_download),
		expiresAt: row.expires_at,
		createdAt: row.created_at,
		revokedAt: row.revoked_at,
		pages,
	};
}

async function revokeAccessGrant(id, ownerId) {
	await run(
		`UPDATE access_grants SET revoked_at = CURRENT_TIMESTAMP
		 WHERE id = ? AND owner_id = ? AND revoked_at IS NULL`,
		[id, ownerId]
	);
	return getAccessGrantById(id);
}

module.exports = {
	createListing, getListings, getListingById, getListingByReference,
	getActiveListingForAsset, updateActiveListing, cancelListing,
	purchaseListing, getOwnershipHistory,
	createAccessRequest, getPendingAccessRequest, getAccessRequestById,
	getAccessRequestsByOwner, getAccessRequestsByRequester,
	getLatestAccessRequestForListingAndBuyer, updateAccessRequestStatus,
	createAccessGrant, getAccessGrantById, getAccessGrantByRequestId,
	getActiveAccessGrant, revokeAccessGrant, getGrantPages,
};
