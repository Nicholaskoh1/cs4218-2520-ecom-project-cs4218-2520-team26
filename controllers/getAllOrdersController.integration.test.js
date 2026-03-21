import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { getAllOrdersController } from "./authController.js";
import categoryModel from "../models/categoryModel.js";
import orderModel from "../models/orderModel.js";
import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";
import { hashPassword } from "../helpers/authHelper.js";

const createMockResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const createUser = async ({ email, name }) => {
  const passwordHash = await hashPassword("orderPassword123");
  return userModel.create({
    name,
    email,
    password: passwordHash,
    phone: "88888888",
    address: { line1: "Order Address" },
    answer: "pet",
  });
};

const createProduct = async ({ name, slug, price }) => {
  const category = await categoryModel.create({
    name: `${name} Category`,
    slug: `${slug}-category`,
  });

  return productModel.create({
    name,
    slug,
    description: `${name} description`,
    price,
    category: category._id,
    quantity: 20,
    shipping: true,
  });
};

const createOrder = async ({ buyerId, productIds, status = "Not Processed" }) => {
  return orderModel.create({
    products: productIds,
    payment: { id: "payment-1", success: true },
    buyer: buyerId,
    status,
  });
};

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await orderModel.deleteMany({});
  await productModel.deleteMany({});
  await categoryModel.deleteMany({});
  await userModel.deleteMany({});
  jest.clearAllMocks();
});

describe("getAllOrdersController integration with orderModel", () => {
  it("returns all orders sorted by createdAt descending", async () => {
    // Arrange
    const buyer = await createUser({
      name: "Admin Visible User",
      email: "orders-admin@test.com",
    });
    const firstProduct = await createProduct({
      name: "First Product",
      slug: "first-product",
      price: 40,
    });
    const secondProduct = await createProduct({
      name: "Second Product",
      slug: "second-product",
      price: 80,
    });

    const firstOrder = await createOrder({
      buyerId: buyer._id,
      productIds: [firstProduct._id],
      status: "Processing",
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    const secondOrder = await createOrder({
      buyerId: buyer._id,
      productIds: [secondProduct._id],
      status: "Shipped",
    });

    const req = {};
    const res = createMockResponse();

    // Act
    await getAllOrdersController(req, res);

    // Assert
    expect(res.json).toHaveBeenCalledTimes(1);
    const returnedOrders = res.json.mock.calls[0][0];

    expect(returnedOrders).toHaveLength(2);
    expect(returnedOrders[0]._id.toString()).toBe(secondOrder._id.toString());
    expect(returnedOrders[1]._id.toString()).toBe(firstOrder._id.toString());
  });
});
