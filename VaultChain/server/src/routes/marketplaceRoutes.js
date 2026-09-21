const express = require('express');

const {
	buyListing,
	cancelAuction,
	createListing,
	deleteListing,
	fractionalizeAsset,
	getBids,
	getListableAssets,
	getListingById,
	getListings,
	getMyListings,
	getShares,
	getTrades,
	placeBid,
	updateListing,
} = require('../controllers/marketplace/marketplaceController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/listings', authenticateToken, createListing);
router.get('/listings', authenticateToken, getListings);

// These fixed paths must be registered before '/listings/:id', otherwise
// Express would match "mine" as an id.
router.get('/listings/mine', authenticateToken, getMyListings);
router.get('/listable-assets', authenticateToken, getListableAssets);
router.get('/trades', authenticateToken, getTrades);

router.get('/listings/:id', authenticateToken, getListingById);
router.patch('/listings/:id', authenticateToken, updateListing);
router.delete('/listings/:id', authenticateToken, deleteListing);
router.post('/listings/:id/buy', authenticateToken, buyListing);

// Auctions
router.post('/listings/:id/bids', authenticateToken, placeBid);
router.get('/listings/:id/bids', authenticateToken, getBids);
router.post('/listings/:id/cancel', authenticateToken, cancelAuction);

// Fractional ownership
router.post('/assets/:assetId/fractionalize', authenticateToken, fractionalizeAsset);
router.get('/assets/:assetId/shares', authenticateToken, getShares);

module.exports = router;
