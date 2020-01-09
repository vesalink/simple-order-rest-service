# Simple Order service REST API (Node.js, Express, Joi (validation) and MongoDB with Mocha+Chai tests)

## Requirements

 - [Node v7.6+](https://nodejs.org/en/download/current/) or [Docker](https://www.docker.com/)
 - [Yarn](https://yarnpkg.com/en/docs/install)

## Getting Started

#### Endpoints
```bash
Create inventory item: POST /v1/inventories
POST Body template:
{
      "name": "product name1",
      "description": "description2",
      "price": 9.99,
      "quantity": 5
}
Read all inventory items: GET /v1/inventories
Read single inventory item: GET /v1/inventories/{id}
Update inventory item: PUT /v1/inventories/{id}
Delete inventory item: DELETE /v1/inventories/{id}
Create order: POST /v1/orders
POST Body template:
{
      "email": "customer@gmail.com",
      "status": "new",
      "orderLines": [{ "inventoryId": "5e13d2dbbacb3800395d0b90", "price": 19.99, "quantity": 2 }]
}

Read all orders: GET /v1/orders
Read single order: GET /v1/orders/{id}
Update order: PUT /v1/orders/{id}
Delete order: DELETE /v1/orders/{id}

```

#### Set environment variables
```bash
cp .env.example .env
```

#### Quick turnaround with Docker

```bash
yarn docker:dev
# http://localhost:3000
```

#### Run tests with Docker

```bash
yarn docker:test
```

## Running Locally

#### Install dependencies:

```bash
yarn
```

```bash
yarn dev
```

#### Test

```bash
# run all tests with Mocha
yarn test
```