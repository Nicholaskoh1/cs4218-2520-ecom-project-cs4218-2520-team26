import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../../../../config/db.js";
import Order from "../../../../models/orderModel.js";
import Product from "../../../../models/productModel.js";
import User from "../../../../models/userModel.js";

dotenv.config();

const TARGET_ORDER_COUNT = 50000;
const BATCH_SIZE = 1000;
const MIN_ITEMS_PER_ORDER = 1;
const MAX_ITEMS_PER_ORDER = 5;

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildPayment(amount, success) {
  const roundedAmount = Math.round(amount * 100) / 100;

  return {
    success,
    // Lightweight, Braintree-inspired metadata to resemble real history.
    provider: "braintree",
    source: "volume-order-seeder",
    transaction: {
      id: `vol_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      type: "sale",
      currencyIsoCode: "USD",
      amount: roundedAmount.toFixed(2),
      status: success ? "submitted_for_settlement" : "processor_declined",
    },
  };
}

function buildOrderDocument(buyerId, productsPool) {
  const itemCount = randomInt(MIN_ITEMS_PER_ORDER, MAX_ITEMS_PER_ORDER);

  const chosenProducts = [];
  let totalAmount = 0;

  for (let i = 0; i < itemCount; i += 1) {
    const product =
      productsPool[randomInt(0, productsPool.length - 1)];
    chosenProducts.push(product._id);
    totalAmount += product.price || 0;
  }

  const success = Math.random() < 0.9; // ~90% successful payments.
  const payment = buildPayment(totalAmount, success);

  const STATUSES = [
    "Not Processed",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
  ];
  const status = STATUSES[randomInt(0, STATUSES.length - 1)];

  return {
    products: chosenProducts,
    payment,
    buyer: buyerId,
    status,
  };
}

async function seedVolumeOrders() {
  await connectDB();

  const userDocs = await User.find({}, { _id: 1 }).lean();
  if (!userDocs.length) {
    throw new Error(
      "No users found in the database. Create or seed users before seeding volume orders."
    );
  }

  const productsPool = await Product.find(
    {},
    { _id: 1, price: 1 }
  ).lean();

  if (!productsPool.length) {
    throw new Error(
      "No products found in the database. Seed products (e.g. via seed-volume-products) before seeding orders."
    );
  }

  const existingCount = await Order.estimatedDocumentCount();
  const remainingToCreate = TARGET_ORDER_COUNT - existingCount;

  if (remainingToCreate <= 0) {
    console.log(
      `Database already has ${existingCount} orders, which meets or exceeds the target of ${TARGET_ORDER_COUNT}.`
    );
    return;
  }

  console.log(
    `Seeding ${remainingToCreate} orders to reach a total of ${TARGET_ORDER_COUNT} orders...`
  );

  const userIds = userDocs.map((u) => u._id);
  let userIndex = 0;
  let createdSoFar = 0;

  while (createdSoFar < remainingToCreate) {
    const batch = [];
    const batchLimit = Math.min(
      BATCH_SIZE,
      remainingToCreate - createdSoFar
    );

    for (let i = 0; i < batchLimit; i += 1) {
      const buyerId = userIds[userIndex];
      userIndex = (userIndex + 1) % userIds.length;

      batch.push(buildOrderDocument(buyerId, productsPool));
    }

    await Order.insertMany(batch);
    createdSoFar += batch.length;

    console.log(
      `Inserted batch of ${batch.length} orders. Total newly created so far: ${createdSoFar}/${remainingToCreate}.`
    );
  }

  console.log(
    `Finished seeding orders. Database should now contain approximately ${TARGET_ORDER_COUNT} orders.`
  );
}

seedVolumeOrders()
  .catch((err) => {
    console.error("Error seeding volume orders:", err);
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (err) {
      console.error("Error while closing MongoDB connection:", err);
    }
  });

