const express = require('express');

const assetRoutes = require('./assetRoutes');
const authRoutes = require('./authRoutes');
const blockchainRoutes = require('./blockchainRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const healthRoutes = require('./healthRoutes');
const marketplaceRoutes = require('./marketplaceRoutes');
const ownershipRoutes = require('./ownershipRoutes');
const walletRoutes = require('./walletRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/assets', assetRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/wallet', walletRoutes);
router.use('/marketplace', marketplaceRoutes);
router.use('/ownership', ownershipRoutes);
router.use('/blockchain', blockchainRoutes);

module.exports = router;