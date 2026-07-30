const express = require('express');

const assetRoutes = require('./assetRoutes');
const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const healthRoutes = require('./healthRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/assets', assetRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;