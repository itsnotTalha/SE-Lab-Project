const express = require('express');

const {
	createListing,
	deleteListing,
	getListingById,
	getListings,
	updateListing,
} = require('../controllers/marketplace/marketplaceController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/listings', authenticateToken, createListing);
router.get('/listings', authenticateToken, getListings);
router.get('/listings/:id', authenticateToken, getListingById);
router.patch('/listings/:id', authenticateToken, updateListing);
router.delete('/listings/:id', authenticateToken, deleteListing);

module.exports = router;
