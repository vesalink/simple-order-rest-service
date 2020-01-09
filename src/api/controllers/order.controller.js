/* eslint-disable no-plusplus */
/* eslint-disable no-await-in-loop */
const httpStatus = require('http-status');
const Order = require('../models/order.model');
const Inventory = require('../models/inventory.model');
const APIError = require('../utils/APIError');

/**
 * Load Order and append to req.
 * @public
 */
exports.load = async (req, res, next, id) => {
  try {
    const order = await Order.get(id);
    req.locals = { order };
    return next();
  } catch (error) {
    return next(error);
  }
};

/**
 * Get Order
 * @public
 */
exports.get = (req, res) => res.json(req.locals.order.transform());

/**
 * Create new order
 * @public
 */
exports.create = async (req, res, next) => {
  try {
    let inventoryLevelOk = true;
    console.log('start check inv');
    for (let i = 0; i < req.body.orderLines.length; i++) {
      if (inventoryLevelOk) {
        const { inventoryId, quantity } = req.body.orderLines[i];
        const inventoryLevel = await Inventory.get(inventoryId);
        if (inventoryLevel.quantity < quantity) {
          inventoryLevelOk = false;
        }
      }
    }

    if (inventoryLevelOk) {
      const order = new Order(req.body);
      console.log('start save inv');
      const savedOrder = (await order.save()).transform();
      console.log('end save inv');
      console.log('start update inv');
      for (let i = 0; i < req.body.orderLines.length; i++) {
        const { inventoryId, quantity } = req.body.orderLines[i];
        const inventoryLevel = await Inventory.get(inventoryId);
        // decreasing Inventory level
        const newInventoryLevel = Object.assign(
          inventoryLevel,
          { quantity: inventoryLevel.quantity - quantity },
        );
        await newInventoryLevel.save();
      }
      res.status(httpStatus.CREATED);
      res.json(savedOrder);
    } else {
      throw new APIError({
        message: 'One of the Order items inventory level is too low',
        status: httpStatus.UNPROCESSABLE_ENTITY,
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Update existing order
 * @public
 */
exports.update = async (req, res, next) => {
  try {
    const order = Object.assign(req.locals.order, req.body);
    const transformedOrder = (await order.save()).transform();
    if (transformedOrder.status === 'canceled') {
      for (let i = 0; i < req.body.orderLines.length; i++) {
        const { inventoryId, quantity } = req.body.orderLines[i];
        const inventoryLevel = await Inventory.get(inventoryId);
        // increasing Inventory level
        const newInventoryLevel = Object.assign(
          inventoryLevel,
          { quantity: inventoryLevel.quantity + quantity },
        );
        await newInventoryLevel.save();
      }
    }
    res.json(transformedOrder);
  } catch (error) {
    next(error);
  }
};

/**
 * Get order list
 * @public
 */
exports.list = async (req, res, next) => {
  try {
    const orders = await Order.list(req.query);
    const transformedOrder = orders.map(order => order.transform());
    res.json(transformedOrder);
  } catch (error) {
    next(error);
  }
};

/**
 * Delete order
 * @public
 */
exports.remove = (req, res, next) => {
  const order = Object.assign(req.locals.order, { status: 'deleted' });
  order.save()
    .then(() => res.status(httpStatus.NO_CONTENT).end())
    .catch(e => next(e));
};
