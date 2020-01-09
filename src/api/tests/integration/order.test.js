/* eslint-disable arrow-body-style */
/* eslint-disable no-unused-expressions */
const request = require('supertest');
const httpStatus = require('http-status');
const { expect } = require('chai');
const { omitBy, isNil } = require('lodash');
const app = require('../../../index');
const Order = require('../../models/order.model');
const Inventory = require('../../models/inventory.model');

/**
 * root level hooks
 */

async function format(order) {
  // get inventories from database
  const dbOrder = (await Order.findOne({ email: order.email }, { 'orderLines._id': false })).transform();

  // remove null and undefined properties
  return omitBy(dbOrder, isNil);
}

describe('Order API', async () => {
  let dbOrders;
  let testOrder;
  let dbInventories;

  beforeEach(async () => {
    dbInventories = {
      inv1: {
        name: 'product for order test 1',
        description: 'desc',
        price: 19.99,
        quantity: 5,
      },
      inv2: {
        name: 'product for order test 2',
        description: 'desc',
        price: 29.99,
        quantity: 3,
      },
    };

    await Inventory.deleteMany({});
    await Inventory.create(dbInventories.inv1);
    await Inventory.create(dbInventories.inv2);
    const inventoryId = (await Inventory.findOne(dbInventories.inv1)).transform().id;
    const inventory2Id = (await Inventory.findOne(dbInventories.inv2)).transform().id;
    dbOrders = {
      order1: {
        email: 'test@gmail.com',
        status: 'new',
        orderLines: [{ inventoryId, price: 29.99, quantity: 1 }],
      },
      order2: {
        email: 'test2@gmail.com',
        status: 'new',
        orderLines: [{ inventoryId: inventory2Id, price: 29.99, quantity: 1 }],
      },
    };
    testOrder = {
      email: 'customer@gmail.com',
      status: 'pending',
      orderLines: [{ inventoryId, price: 19.99, quantity: 1 }],
    };
    await Order.deleteMany({});
    await Order.create(dbOrders.order1);
    await Order.create(dbOrders.order2);
  });

  describe('POST /v1/orders', () => {
    it('should create a new order when request is ok, new Inv quantity should be decreased by order lines quantities', async () => {
      return request(app)
        .post('/v1/orders')
        .send(testOrder)
        .expect(httpStatus.CREATED)
        .then((res) => {
          expect(res.body.email).to.be.equal(testOrder.email);
          expect(res.body.status).to.be.equal(testOrder.status);
        })
        .then(async () => {
          const newQuantity = (await Inventory.findOne({ name: dbInventories.inv1.name }))
            .transform().quantity;
          expect(newQuantity).to.be.equal(dbInventories.inv1.quantity -
            testOrder.orderLines[0].quantity);
        });
    });

    it('should report error when inventory level of one of the purchasing item is less than customer needs', async () => {
      testOrder.orderLines[0].quantity = 99;
      return request(app)
        .post('/v1/orders')
        .send(testOrder)
        .expect(httpStatus.UNPROCESSABLE_ENTITY)
        .then(async (res) => {
          expect(res.body.code).to.be.equal(422);
          expect(res.body.message).to.be.equal('One of the Order items inventory level is too low');
        });
    });

    it('should report error when order email is not provided', () => {
      delete testOrder.email;

      return request(app)
        .post('/v1/orders')
        .send(testOrder)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('email');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"email" is required');
        });
    });

    it('should report error when order email is not a valid email', () => {
      testOrder.email = 'customer';

      return request(app)
        .post('/v1/orders')
        .send(testOrder)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('email');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"email" must be a valid email');
        });
    });

    it('should report error when order status is incorrect', () => {
      testOrder.status = 'bad_status';

      return request(app)
        .post('/v1/orders')
        .send(testOrder)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('status');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"status" must be one of [new, pending, refunded, canceled, deleted]');
        });
    });

    it('should report error when order lines is not provided', () => {
      testOrder.orderLines = [];

      return request(app)
        .post('/v1/orders')
        .send(testOrder)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('orderLines');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"orderLines" must contain at least 1 items');
        });
    });

    it('should report error when order line price less than 0', () => {
      testOrder.orderLines[0].price = -2;
      return request(app)
        .post('/v1/orders')
        .send(testOrder)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('orderLines.0.price');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"price" must be larger than or equal to 0');
        });
    });

    it('should report error when order line quantity less than 1', () => {
      testOrder.orderLines[0].quantity = 0;
      return request(app)
        .post('/v1/orders')
        .send(testOrder)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('orderLines.0.quantity');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"quantity" must be larger than or equal to 1');
        });
    });
  });

  describe('GET /v1/orders', () => {
    it('should get all orders', () => {
      return request(app)
        .get('/v1/orders')
        .expect(httpStatus.OK)
        .then(async (res) => {
          const order1 = await format(dbOrders.order1);
          const order2 = await format(dbOrders.order2);

          expect(res.body).to.be.an('array');
          expect(res.body).to.have.lengthOf(2);
          expect(res.body[0].email).to.be.equal(order2.email);
          expect(res.body[0].status).to.be.equal(order2.status);
          expect(res.body[1].email).to.be.equal(order1.email);
          expect(res.body[1].status).to.be.equal(order1.status);
        });
    });

    it('should get all orders with pagination', () => {
      return request(app)
        .get('/v1/orders')
        .query({ page: 2, perPage: 1 })
        .expect(httpStatus.OK)
        .then(async (res) => {
          expect(res.body).to.be.an('array');
          expect(res.body[0]).to.be.an('object');
          expect(res.body).to.have.lengthOf(1);
          expect(res.body[0].email).to.be.equal('test@gmail.com');
        });
    });

    it('should filter orders', () => {
      return request(app)
        .get('/v1/orders')
        .query({ email: dbOrders.order1.email })
        .expect(httpStatus.OK)
        .then(async (res) => {
          const order1 = await format(dbOrders.order1);

          expect(res.body).to.be.an('array');
          expect(res.body).to.have.lengthOf(1);
          expect(res.body[0].email).to.be.equal(order1.email);
          expect(res.body[0].status).to.be.equal(order1.status);
        });
    });

    it('should report error when pagination\'s parameters are not a number', () => {
      return request(app)
        .get('/v1/orders')
        .query({ page: 'page', perPage: 'perpagenumber' })
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('page');
          expect(location).to.be.equal('query');
          expect(messages).to.include('"page" must be a number');
          return Promise.resolve(res);
        })
        .then((res) => {
          const { field } = res.body.errors[1];
          const { location } = res.body.errors[1];
          const { messages } = res.body.errors[1];
          expect(field).to.be.equal('perPage');
          expect(location).to.be.equal('query');
          expect(messages).to.include('"perPage" must be a number');
        });
    });
  });

  describe('GET /v1/orders/:orderId', () => {
    it('should get order by ID', async () => {
      const { id } = (await Order.findOne({ email: dbOrders.order1.email })).transform();

      return request(app)
        .get(`/v1/orders/${id}`)
        .expect(httpStatus.OK)
        .then(async (res) => {
          const order1 = await format(dbOrders.order1);
          expect(res.body.email).to.be.equal(order1.email);
          expect(res.body.status).to.be.equal(order1.status);
        });
    });

    it('should report error "Order does not exist" when order does not exists', () => {
      return request(app)
        .get('/v1/orders/5e13d2e1bacb3800395d0b86')
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal('Order does not exist');
        });
    });

    it('should report error "Order does not exist" when id is not a valid ObjectID', () => {
      return request(app)
        .get('/v1/orders/teststring1234')
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.equal('Order does not exist');
        });
    });
  });

  describe('PUT /v1/orders/:orderId', () => {
    it('should update order', async () => {
      const { id } = (await Order.findOne({ email: dbOrders.order1.email })).transform();

      return request(app)
        .put(`/v1/orders/${id}`)
        .send(testOrder)
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body.email).to.be.equal(testOrder.email);
          expect(res.body.status).to.be.equal(testOrder.status);
        });
    });

    it('should decrease Inventory levels if order status updated to "canceled"', async () => {
      const { id } = (await Order.findOne({ email: dbOrders.order1.email })).transform();
      testOrder.status = 'canceled';

      return request(app)
        .put(`/v1/orders/${id}`)
        .send(testOrder)
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body.email).to.be.equal(testOrder.email);
          expect(res.body.status).to.be.equal(testOrder.status);
        })
        .then(async () => {
          const newQuantity = (await Inventory.findOne({
            _id:
            testOrder.orderLines[0].inventoryId,
          }))
            .transform().quantity;
          expect(newQuantity).to.be.equal(dbInventories.inv1.quantity +
            testOrder.orderLines[0].quantity);
        });
    });

    it('should report error when email is not provided', async () => {
      const { id } = (await Order.findOne({})).transform();
      delete testOrder.email;

      return request(app)
        .put(`/v1/orders/${id}`)
        .send(testOrder)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('email');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"email" is required');
        });
    });

    it('should report error when order email is not a valid email', async () => {
      const { id } = (await Order.findOne({})).transform();
      testOrder.email = 'customer';

      return request(app)
        .put(`/v1/orders/${id}`)
        .send(testOrder)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('email');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"email" must be a valid email');
        });
    });

    it('should report error when order status is incorrect', async () => {
      const { id } = (await Order.findOne({})).transform();
      testOrder.status = 'bad_status';

      return request(app)
        .put(`/v1/orders/${id}`)
        .send(testOrder)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('status');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"status" must be one of [new, pending, refunded, canceled, deleted]');
        });
    });

    it('should report error "Order does not exist" when order does not exists', () => {
      return request(app)
        .put('/v1/orders/5e13d2e1bacb3800395d0b86')
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal('Order does not exist');
        });
    });

    it('should report error "Order does not exist" when id is not a valid ObjectID', () => {
      return request(app)
        .put('/v1/orders/teststring1234')
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.equal('Order does not exist');
        });
    });
  });

  describe('DELETE /v1/orders', () => {
    it('should change order status to "deleted"', async () => {
      const { id } = (await Order.findOne({ email: dbOrders.order1.email })).transform();

      return request(app)
        .delete(`/v1/orders/${id}`)
        .expect(httpStatus.NO_CONTENT)
        .then(async () => {
          const orderStatusNew = (await Order.findOne({ email: dbOrders.order1.email }))
            .transform().status;
          expect(orderStatusNew).to.be.equal('deleted');
        });
    });

    it('should report error "Order does not exist" when order does not exists', () => {
      return request(app)
        .delete('/v1/orders/teststring1234')
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal('Order does not exist');
        });
    });
  });
});
