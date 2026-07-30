const express = require('express');

const { getSummary } = require('../controllers/dashboard/dashboardController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/summary', authenticateToken, getSummary);

module.exports = router;
