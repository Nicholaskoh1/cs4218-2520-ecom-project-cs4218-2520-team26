// Ashley Chang Le Xuan, A0252633J
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { orderStatusController } from "../../../controllers/authController.js";
import categoryModel from "../../../models/categoryModel.js";
import orderModel from "../../../models/orderModel.js";
import productModel from "../../../models/productModel.js";
import userModel from "../../../models/userModel.js";
import { hashPassword } from "../../../helpers/authHelper.js";

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

describe("orderStatusController integration with orderModel", () => {
  describe("EP - Order existence partitions", () => {
    it("EP: updates status when target order exists", async () => {
      // Arrange
      const buyer = await createUser({
        name: "Status User",
        email: "orders-status@test.com",
      });
      const product = await createProduct({
        name: "Status Product",
        slug: "status-product",
        price: 55,
      });
      const order = await createOrder({
        buyerId: buyer._id,
        productIds: [product._id],
        status: "Not Processed",
      });

      const req = {
        params: { orderId: order._id.toString() },
        body: { status: "Delivered" },
      };
      const res = createMockResponse();

      // Act
      await orderStatusController(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledTimes(1);
      const responseOrder = res.json.mock.calls[0][0];
      expect(responseOrder.status).toBe("Delivered");

      const persistedOrder = await orderModel.findById(order._id).lean();
      expect(persistedOrder.status).toBe("Delivered");
    });

    it("EP: returns null when target order does not exist", async () => {
      // Arrange
      const nonExistentOrderId = new mongoose.Types.ObjectId().toString();
      const req = {
        params: { orderId: nonExistentOrderId },
        body: { status: "Shipped" },
      };
      const res = createMockResponse();

      // Act
      await orderStatusController(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith(null);
    });
  });

  describe("EP - Valid status class partitions", () => {
    it("EP: updates to 'Processing' and persists change", async () => {
      // Arrange
      const buyer = await createUser({
        name: "Processing User",
        email: "orders-processing@test.com",
      });
      const product = await createProduct({
        name: "Processing Product",
        slug: "processing-product",
        price: 35,
      });
      const order = await createOrder({
        buyerId: buyer._id,
        productIds: [product._id],
        status: "Not Processed",
      });

      const req = {
        params: { orderId: order._id.toString() },
        body: { status: "Processing" },
      };
      const res = createMockResponse();

      // Act
      await orderStatusController(req, res);

      // Assert
      const updatedOrder = await orderModel.findById(order._id).lean();
      expect(updatedOrder.status).toBe("Processing");
    });

    it("EP: updates to 'Cancelled' and persists change", async () => {
      // Arrange
      const buyer = await createUser({
        name: "Cancelled User",
        email: "orders-cancelled@test.com",
      });
      const product = await createProduct({
        name: "Cancelled Product",
        slug: "cancelled-product",
        price: 75,
      });
      const order = await createOrder({
        buyerId: buyer._id,
        productIds: [product._id],
        status: "Processing",
      });

      const req = {
        params: { orderId: order._id.toString() },
        body: { status: "Cancelled" },
      };
      const res = createMockResponse();

      // Act
      await orderStatusController(req, res);

      // Assert
      const updatedOrder = await orderModel.findById(order._id).lean();
      expect(updatedOrder.status).toBe("Cancelled");
    });
  });

  it("supports multiple sequential status updates", async () => {
    // Arrange
    const buyer = await createUser({
      name: "Sequential User",
      email: "orders-sequential@test.com",
    });
    const product = await createProduct({
      name: "Sequential Product",
      slug: "sequential-product",
      price: 60,
    });
    const order = await createOrder({
      buyerId: buyer._id,
      productIds: [product._id],
      status: "Not Processed",
    });

    const res1 = createMockResponse();
    const res2 = createMockResponse();
    const res3 = createMockResponse();

    // Act
    await orderStatusController(
      { params: { orderId: order._id.toString() }, body: { status: "Processing" } },
      res1
    );
    await orderStatusController(
      { params: { orderId: order._id.toString() }, body: { status: "Shipped" } },
      res2
    );
    await orderStatusController(
      { params: { orderId: order._id.toString() }, body: { status: "Delivered" } },
      res3
    );

    // Assert
    const finalOrder = await orderModel.findById(order._id).lean();
    expect(finalOrder.status).toBe("Delivered");
  });
});
