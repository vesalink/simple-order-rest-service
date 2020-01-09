const mongoose = require('mongoose');
const httpStatus = require('http-status');
const { omitBy, isNil } = require('lodash');
const APIError = require('../utils/APIError');

/**
 * Inventory Schema
 * @private
 */
const inventorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 256,
    index: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    min: 0,
  },
  quantity: {
    type: Number,
    min: 0,
  },
}, {
  timestamps: true,
});

/**
 * Methods
 */
inventorySchema.method({
  transform() {
    const transformed = {};
    const fields = ['id', 'name', 'description', 'price', 'quantity', 'createdAt'];

    fields.forEach((field) => {
      transformed[field] = this[field];
    });

    return transformed;
  },
});

/**
 * Statics
 */
inventorySchema.statics = {

  /**
   * Read inventory item
   *
   * @param {ObjectId} id - The objectId of inventory.
   * @returns {Promise<Inventory, APIError>}
   */
  async get(id) {
    try {
      let inventory;

      if (mongoose.Types.ObjectId.isValid(id)) {
        inventory = await this.findById(id).exec();
      }
      if (inventory) {
        return inventory;
      }

      throw new APIError({
        message: 'Inventory does not exist',
        status: httpStatus.NOT_FOUND,
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * List Inventory in descending order of 'createdAt' timestamp.
   *
   * @param {number} skip - Number of Inventories to be skipped.
   * @param {number} limit - Limit number of Inventories to be returned.
   * @returns {Promise<Inventory[]>}
   */
  list({
    page = 1, perPage = 30, name, description, price, quantity,
  }) {
    const options = omitBy({
      name, description, price, quantity,
    }, isNil);

    return this.find(options)
      .sort({ createdAt: -1 })
      .skip(perPage * (page - 1))
      .limit(perPage)
      .exec();
  },
};

/**
 * @typedef Inventory
 */
module.exports = mongoose.model('Inventory', inventorySchema);
