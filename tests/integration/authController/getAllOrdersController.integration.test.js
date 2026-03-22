// Ashley Chang Le Xuan, A0252633J
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { getAllOrdersController } from "../../../controllers/authController.js";
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

describe("getAllOrdersController integration with orderModel", () => {
  describe("EP - Order collection partitions", () => {
    it("EP: returns all orders regardless of buyer when orders exist", async () => {
      // Arrange
      const buyerOne = await createUser({
        name: "Buyer One",
        email: "all-orders-buyer-1@test.com",
      });
      const buyerTwo = await createUser({
        name: "Buyer Two",
        email: "all-orders-buyer-2@test.com",
      });
      const productOne = await createProduct({
        name: "All Orders Product 1",
        slug: "all-orders-product-1",
        price: 110,
      });
      const productTwo = await createProduct({
        name: "All Orders Product 2",
        slug: "all-orders-product-2",
        price: 210,
      });

      await createOrder({
        buyerId: buyerOne._id,
        productIds: [productOne._id],
        status: "Processing",
      });
      await createOrder({
        buyerId: buyerTwo._id,
        productIds: [productTwo._id],
        status: "Shipped",
      });

      const req = {};
      const res = createMockResponse();

      // Act
      await getAllOrdersController(req, res);

      // Assert
      const returnedOrders = res.json.mock.calls[0][0];
      expect(returnedOrders).toHaveLength(2);

      const buyerIds = returnedOrders.map((order) => order.buyer._id.toString());
      expect(buyerIds).toEqual(
        expect.arrayContaining([buyerOne._id.toString(), buyerTwo._id.toString()])
      );
    });

    it("EP: returns an empty array when no orders exist", async () => {
      // Arrange
      const req = {};
      const res = createMockResponse();

      // Act
      await getAllOrdersController(req, res);

      // Assert
      expect(res.json).toHaveBeenCalledWith([]);
    });
  });

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

  it("populates product details and excludes product photo binary payload", async () => {
    // Arrange
    const buyer = await createUser({
      name: "Population Buyer",
      email: "all-orders-population@test.com",
    });
    const laptop = await createProduct({
      name: "Laptop",
      slug: "laptop",
      price: 999,
    });
    const mouse = await createProduct({
      name: "Mouse",
      slug: "mouse",
      price: 29,
    });
    await createOrder({
      buyerId: buyer._id,
      productIds: [laptop._id, mouse._id],
      status: "Processing",
    });

    const req = {};
    const res = createMockResponse();

    // Act
    await getAllOrdersController(req, res);

    // Assert
    const firstOrder = res.json.mock.calls[0][0][0];
    expect(firstOrder.products).toHaveLength(2);
    const productNames = firstOrder.products.map((product) => product.name);
    expect(productNames).toEqual(expect.arrayContaining(["Laptop", "Mouse"]));
    expect(firstOrder.products[0].photo?.data).toBeUndefined();
    expect(firstOrder.products[1].photo?.data).toBeUndefined();
  });

  it("populates buyer with name only (without sensitive fields)", async () => {
    // Arrange
    const buyer = await createUser({
      name: "Visible Buyer Name",
      email: "all-orders-buyer-fields@test.com",
    });
    const product = await createProduct({
      name: "Buyer Field Product",
      slug: "buyer-field-product",
      price: 55,
    });
    await createOrder({
      buyerId: buyer._id,
      productIds: [product._id],
      status: "Processing",
    });

    const req = {};
    const res = createMockResponse();

    // Act
    await getAllOrdersController(req, res);

    // Assert
    const returnedBuyer = res.json.mock.calls[0][0][0].buyer;
    expect(returnedBuyer.name).toBe("Visible Buyer Name");
    expect(returnedBuyer.email).toBeUndefined();
    expect(returnedBuyer.phone).toBeUndefined();
    expect(returnedBuyer.password).toBeUndefined();
    expect(returnedBuyer.answer).toBeUndefined();
  });
});
