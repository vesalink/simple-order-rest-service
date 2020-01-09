const Joi = require('joi');

module.exports = {

  // GET /v1/
  listInventories: {
    query: {
      page: Joi.number().min(1),
      perPage: Joi.number().min(1).max(100),
      name: Joi.string().max(256),
      description: Joi.string(),
      price: Joi.number().min(0),
      quantity: Joi.number().min(0),
    },
  },

  // POST /v1/inventories
  createInventory: {
    body: {
      name: Joi.string().max(256).required(),
      description: Joi.string(),
      price: Joi.number().min(0),
      quantity: Joi.number().min(0),
    },
  },

  // PUT /v1/inventories/:inventoryId
  updateInventory: {
    body: {
      name: Joi.string().max(256).required(),
      description: Joi.string(),
      price: Joi.number().min(0),
      quantity: Joi.number().min(0),
    },
    params: {
      inventoryId: Joi.string().regex(/^[a-fA-F0-9]{24}$/).required(),
    },
  },
};
