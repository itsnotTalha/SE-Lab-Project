const express = require('express');

const marketplaceController = require('../controllers/marketplace/marketplaceController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);
router.post('/listings', marketplaceController.createListing);
router.get('/listings', marketplaceController.getListings);
router.post('/listings/:reference/preview-requests', marketplaceController.requestPreview);
router.get('/listings/:reference/preview-requests', marketplaceController.getPreviewRequests);
router.patch('/listings/:reference/preview-requests/:requestId', marketplaceController.decidePreviewRequest);
router.get('/listings/:reference/content', marketplaceController.getListingContent);
router.post('/listings/:reference/purchase', marketplaceController.purchaseListing);
router.get('/listings/:reference', marketplaceController.getListing);
router.patch('/listings/:reference', marketplaceController.updateListing);
router.delete('/listings/:reference', marketplaceController.deleteListing);

module.exports = router;
