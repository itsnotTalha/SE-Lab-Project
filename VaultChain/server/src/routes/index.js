const express = require('express');

const assetRoutes = require('./assetRoutes');
const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const documentRoutes = require('./documentRoutes');
const healthRoutes = require('./healthRoutes');
const vaultRoutes = require('./vaultRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/assets', assetRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/documents', documentRoutes);
router.use('/vault', vaultRoutes);

module.exports = router;