const express = require('express');

const marketplaceController = require('../controllers/marketplace/marketplaceController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.use(authenticateToken);

// Access Request & Grant routes
router.post('/requests', marketplaceController.createAccessRequest);
router.get('/requests/received', marketplaceController.getReceivedAccessRequests);
router.get('/requests/sent', marketplaceController.getSentAccessRequests);
router.post('/requests/:id/approve', marketplaceController.approveAccessRequest);
router.post('/requests/:id/reject', marketplaceController.rejectAccessRequest);
router.post('/grants/:id/revoke', marketplaceController.revokeAccessGrant);

// Listings routes
router.post('/listings', marketplaceController.createListing);
router.get('/listings', marketplaceController.getListings);
router.get('/listings/:reference/content', marketplaceController.getListingContent);
router.post('/listings/:reference/purchase', marketplaceController.purchaseListing);
router.post('/listings/:reference/requests', marketplaceController.createAccessRequest);
router.get('/listings/:reference/requests/status', marketplaceController.getAccessRequestStatus);
router.get('/listings/:reference', marketplaceController.getListing);
router.patch('/listings/:reference', marketplaceController.updateListing);
router.delete('/listings/:reference', marketplaceController.deleteListing);

module.exports = router;
