const express = require('express');
const validate = require('express-validation');
const controller = require('../../controllers/order.controller');
const {
  listOrders,
  createOrder,
  updateOrder,
} = require('../../validations/order.validation');

const router = express.Router();

/**
 * Load order when API with orderId route parameter is hit
 */
router.param('orderId', controller.load);


router
  .route('/')
  .get(validate(listOrders), controller.list)
  .post(validate(createOrder), controller.create);


router
  .route('/:orderId')
  .get(controller.get)
  .put(validate(updateOrder), controller.update)
  .delete(controller.remove);

module.exports = router;
