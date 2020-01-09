const express = require('express');
const validate = require('express-validation');
const controller = require('../../controllers/inventory.controller');
const {
  listInventories,
  createInventory,
  updateInventory,
} = require('../../validations/inventory.validation');

const router = express.Router();

/**
 * Load inventory when API with inventoryId route parameter is hit
 */
router.param('inventoryId', controller.load);


router
  .route('/')
  .get(validate(listInventories), controller.list)
  .post(validate(createInventory), controller.create);

router
  .route('/:inventoryId')
  .get(controller.get)
  .put(validate(updateInventory), controller.update)
  .delete(controller.remove);

module.exports = router;
