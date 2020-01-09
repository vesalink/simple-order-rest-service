const Joi = require('joi');
const Order = require('../models/order.model');

const orderLinesValidation = Joi.object().keys({
  inventoryId: Joi.string().regex(/^[a-fA-F0-9]{24}$/).required(),
  price: Joi.number().min(0).required(),
  quantity: Joi.number().min(1).required(),
});

module.exports = {

  // GET /v1/
  listOrders: {
    query: {
      page: Joi.number().min(1),
      perPage: Joi.number().min(1).max(100),
      email: Joi.string(),
      status: Joi.string(),
    },
  },

  // POST /v1/orders
  createOrder: {
    body: {
      email: Joi.string().email().required(),
      status: Joi.string().valid(Order.statuses),
      orderLines: Joi.array().items(orderLinesValidation).min(1).required(),
    },
  },

  // PUT /v1/orders/:orderId
  updateOrder: {
    body: {
      email: Joi.string().email().required(),
      status: Joi.string().valid(Order.statuses),
      orderLines: Joi.array().items(orderLinesValidation),
    },
    params: {
      orderId: Joi.string().regex(/^[a-fA-F0-9]{24}$/).required(),
    },
  },
};
