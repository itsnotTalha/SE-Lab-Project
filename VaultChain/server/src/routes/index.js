const express = require('express');

const assetRoutes = require('./assetRoutes');
const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const healthRoutes = require('./healthRoutes');
const marketplaceRoutes = require('./marketplaceRoutes');
const walletRoutes = require('./walletRoutes');
const verificationRoutes = require('./verificationRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/assets', assetRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/wallet', walletRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/verifications', verificationRoutes);

module.exports = router;
