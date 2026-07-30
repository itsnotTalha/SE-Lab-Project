const express = require('express');

const authRoutes = require('./authRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const healthRoutes = require('./healthRoutes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/dashboard', dashboardRoutes);

module.exports = router;