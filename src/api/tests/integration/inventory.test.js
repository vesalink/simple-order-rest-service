/* eslint-disable arrow-body-style */
/* eslint-disable no-unused-expressions */
const request = require('supertest');
const httpStatus = require('http-status');
const { expect } = require('chai');
const { some, omitBy, isNil } = require('lodash');
const app = require('../../../index');
const Inventory = require('../../models/inventory.model');

/**
 * root level hooks
 */

async function format(inventory) {
  // get inventories from database
  const dbInventory = (await Inventory.findOne({ name: inventory.name })).transform();

  // remove null and undefined properties
  return omitBy(dbInventory, isNil);
}

describe('Inventory API', async () => {
  let dbInventories;
  let testInv;

  beforeEach(async () => {
    dbInventories = {
      inv1: {
        name: 'product1',
        description: 'desc1',
        price: 99.99,
        quantity: 10,
      },
      inv2: {
        name: 'product2',
        description: 'desc2',
        price: 49.99,
        quantity: 5,
      },
    };

    testInv = {
      name: 'product3',
      description: 'desc3',
      price: 19.99,
      quantity: 2,
    };

    await Inventory.deleteMany({});
    await Inventory.create(dbInventories.inv1);
    await Inventory.create(dbInventories.inv2);
  });

  describe('POST /v1/inventories', () => {
    it('should create a new inventory when request is ok', () => {
      return request(app)
        .post('/v1/inventories')
        .send(testInv)
        .expect(httpStatus.CREATED)
        .then((res) => {
          expect(res.body).to.include(testInv);
        });
    });

    it('should report error when name is not provided', () => {
      delete testInv.name;

      return request(app)
        .post('/v1/inventories')
        .send(testInv)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('name');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"name" is required');
        });
    });

    it('should report error when price less than 0', () => {
      testInv.price = -2;

      return request(app)
        .post('/v1/inventories')
        .send(testInv)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('price');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"price" must be larger than or equal to 0');
        });
    });

    it('should report error when quantity less than 0', () => {
      testInv.quantity = -2;

      return request(app)
        .post('/v1/inventories')
        .send(testInv)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('quantity');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"quantity" must be larger than or equal to 0');
        });
    });
  });

  describe('GET /v1/inventories', () => {
    it('should get all inventories', () => {
      return request(app)
        .get('/v1/inventories')
        .expect(httpStatus.OK)
        .then(async (res) => {
          const inv1 = await format(dbInventories.inv1);
          const inv2 = await format(dbInventories.inv2);
          // before comparing it is necessary to convert String to Date
          res.body[0].createdAt = new Date(res.body[0].createdAt);
          res.body[1].createdAt = new Date(res.body[1].createdAt);

          const includesInv1 = some(res.body, inv1);
          const includesInv2 = some(res.body, inv2);

          expect(res.body).to.be.an('array');
          expect(res.body).to.have.lengthOf(2);
          expect(includesInv1).to.be.true;
          expect(includesInv2).to.be.true;
        });
    });

    it('should get all inventories with pagination', () => {
      return request(app)
        .get('/v1/inventories')
        .query({ page: 2, perPage: 1 })
        .expect(httpStatus.OK)
        .then(async (res) => {
          expect(res.body).to.be.an('array');
          expect(res.body[0]).to.be.an('object');
          expect(res.body).to.have.lengthOf(1);
          expect(res.body[0].name).to.be.equal('product1');
        });
    });

    it('should filter inventories', () => {
      return request(app)
        .get('/v1/inventories')
        .query({ name: dbInventories.inv1.name })
        .expect(httpStatus.OK)
        .then(async (res) => {
          const inv1 = await format(dbInventories.inv1);

          // before comparing it is necessary to convert String to Date
          res.body[0].createdAt = new Date(res.body[0].createdAt);

          const includesInv1 = some(res.body, inv1);

          expect(res.body).to.be.an('array');
          expect(res.body).to.have.lengthOf(1);
          expect(includesInv1).to.be.true;
        });
    });

    it('should report error when pagination\'s parameters are not a number', () => {
      return request(app)
        .get('/v1/inventories')
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

  describe('GET /v1/inventories/:inventoryId', () => {
    it('should get inventory by ID', async () => {
      const id = (await Inventory.findOne({}))._id;

      return request(app)
        .get(`/v1/inventories/${id}`)
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body).to.include(dbInventories.inv1);
        });
    });

    it('should report error "Inventory does not exist" when inventory does not exists', () => {
      return request(app)
        .get('/v1/inventories/5e13d2e1bacb3800395d0b86')
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal('Inventory does not exist');
        });
    });

    it('should report error "Inventory does not exist" when id is not a valid ObjectID', () => {
      return request(app)
        .get('/v1/inventories/teststring1234')
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.equal('Inventory does not exist');
        });
    });
  });

  describe('PUT /v1/inventories/:inventoryId', () => {
    it('should update inventory', async () => {
      const id = (await Inventory.findOne(dbInventories.inv1))._id;

      return request(app)
        .put(`/v1/inventories/${id}`)
        .send(testInv)
        .expect(httpStatus.OK)
        .then((res) => {
          expect(res.body).to.include(testInv);
          expect(res.body.name).to.be.equal('product3');
        });
    });

    it('should report error when name is not provided', async () => {
      const id = (await Inventory.findOne({}))._id;
      delete testInv.name;

      return request(app)
        .put(`/v1/inventories/${id}`)
        .send(testInv)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('name');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"name" is required');
        });
    });

    it('should report error when price less than 0', async () => {
      testInv.price = -2;
      const id = (await Inventory.findOne({}))._id;

      return request(app)
        .put(`/v1/inventories/${id}`)
        .send(testInv)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('price');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"price" must be larger than or equal to 0');
        });
    });

    it('should report error when quantity less than 0', async () => {
      testInv.quantity = -2;
      const id = (await Inventory.findOne({}))._id;

      return request(app)
        .put(`/v1/inventories/${id}`)
        .send(testInv)
        .expect(httpStatus.BAD_REQUEST)
        .then((res) => {
          const { field } = res.body.errors[0];
          const { location } = res.body.errors[0];
          const { messages } = res.body.errors[0];
          expect(field).to.be.equal('quantity');
          expect(location).to.be.equal('body');
          expect(messages).to.include('"quantity" must be larger than or equal to 0');
        });
    });

    it('should report error "Inventory does not exist" when inventory does not exists', () => {
      return request(app)
        .put('/v1/inventories/5e13d2e1bacb3800395d0b86')
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal('Inventory does not exist');
        });
    });

    it('should report error "Inventory does not exist" when id is not a valid ObjectID', () => {
      return request(app)
        .put('/v1/inventories/teststring1234')
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.equal('Inventory does not exist');
        });
    });
  });

  describe('DELETE /v1/inventories', () => {
    it('should delete inventory', async () => {
      const id = (await Inventory.findOne({}))._id;

      return request(app)
        .delete(`/v1/inventories/${id}`)
        .expect(httpStatus.NO_CONTENT)
        .then(() => request(app).get('/v1/inventories'))
        .then(async () => {
          const inventories = await Inventory.find({});
          expect(inventories).to.have.lengthOf(1);
        });
    });

    it('should report error "Inventory does not exist" when inventory does not exists', () => {
      return request(app)
        .delete('/v1/inventories/teststring1234')
        .expect(httpStatus.NOT_FOUND)
        .then((res) => {
          expect(res.body.code).to.be.equal(404);
          expect(res.body.message).to.be.equal('Inventory does not exist');
        });
    });
  });
});
