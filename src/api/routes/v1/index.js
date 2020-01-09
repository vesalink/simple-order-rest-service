const express = require('express');
const inventoryRoutes = require('./inventory.route');
const orderRoutes = require('./order.route');

const router = express.Router();

/**
 * GET v1/status
 */
router.get('/status', (req, res) => res.send('OK'));

/**
 * GET v1/docs
 */
router.use('/docs', express.static('docs'));

/**
 * Inventory routes
 */
router.use('/inventories', inventoryRoutes);
/**
 * Order routes
 */
router.use('/orders', orderRoutes);

module.exports = router;
