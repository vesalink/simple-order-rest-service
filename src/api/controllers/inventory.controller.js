const httpStatus = require('http-status');
const Inventory = require('../models/inventory.model');

/**
 * Load Inventory and append to req.
 * @public
 */
exports.load = async (req, res, next, id) => {
  try {
    const inventory = await Inventory.get(id);
    req.locals = { inventory };
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Get Inventory
 * @public
 */
exports.get = (req, res) => res.json(req.locals.inventory.transform());

/**
 * Create new inventory
 * @public
 */
exports.create = async (req, res, next) => {
  try {
    const inventory = new Inventory(req.body);
    const savedInventory = await inventory.save();
    res.status(httpStatus.CREATED);
    res.json(savedInventory.transform());
  } catch (error) {
    next(error);
  }
};

/**
 * Update existing inventory
 * @public
 */
exports.update = (req, res, next) => {
  const inventory = Object.assign(req.locals.inventory, req.body);

  inventory.save()
    .then(savedInventory => res.json(savedInventory.transform()))
    .catch(e => next(e));
};

/**
 * Get inventory list
 * @public
 */
exports.list = async (req, res, next) => {
  try {
    const inventories = await Inventory.list(req.query);
    const transformedInventory = inventories.map(inventory => inventory.transform());
    res.json(transformedInventory);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete inventory
 * @public
 */
exports.remove = (req, res, next) => {
  const { inventory } = req.locals;

  inventory.remove()
    .then(() => res.status(httpStatus.NO_CONTENT).end())
    .catch(e => next(e));
};
