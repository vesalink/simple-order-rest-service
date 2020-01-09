const mongoose = require('mongoose');
const httpStatus = require('http-status');
const { omitBy, isNil } = require('lodash');
const APIError = require('../utils/APIError');


/**
* Order Statuses
*/
const statuses = ['new', 'pending', 'refunded', 'canceled', 'deleted'];

/**
 * Order Schema
 * @private
 */
const orderSchema = new mongoose.Schema({
  email: {
    type: String,
    match: /^\S+@\S+\.\S+$/,
    required: true,
    index: true,
    trim: true,
    lowercase: true,
  },
  status: {
    type: String,
    enum: statuses,
    default: 'new',
  },
  orderLines: [
    {
      inventoryId: {
        type: String,
        trim: true,
        required: true,
      },
      price: {
        type: Number,
        required: true,
        min: 0,
      },
      quantity: {
        type: Number,
        required: true,
        min: 1,
      },
    },
  ],
}, {
  timestamps: true,
});

/**
 * Methods
 */
orderSchema.method({
  transform() {
    const transformed = {};
    const fields = ['id', 'email', 'status', 'orderLines', 'createdAt'];

    fields.forEach((field) => {
      transformed[field] = this[field];
    });

    return transformed;
  },
});

/**
 * Statics
 */
orderSchema.statics = {

  statuses,

  /**
   * Read order item
   *
   * @param {ObjectId} id - The objectId of order.
   * @returns {Promise<Order, APIError>}
   */
  async get(id) {
    try {
      let order;

      if (mongoose.Types.ObjectId.isValid(id)) {
        order = await this.findById(id).exec();
      }
      if (order) {
        return order;
      }

      throw new APIError({
        message: 'Order does not exist',
        status: httpStatus.NOT_FOUND,
      });
    } catch (error) {
      throw error;
    }
  },

  /**
   * List Order in descending order of 'createdAt' timestamp.
   *
   * @param {number} skip - Number of Orders to be skipped.
   * @param {number} limit - Limit number of Orders to be returned.
   * @returns {Promise<Order[]>}
   */
  list({
    page = 1, perPage = 30, email, status,
  }) {
    const options = omitBy({
      email, status,
    }, isNil);

    return this.find(options)
      .sort({ createdAt: -1 })
      .skip(perPage * (page - 1))
      .limit(perPage)
      .exec();
  },
};

/**
 * @typedef Order
 */
module.exports = mongoose.model('Order', orderSchema);
