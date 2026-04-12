import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../../../../config/db.js";
import Order from "../../../../models/orderModel.js";

dotenv.config();

async function cleanupVolumeOrders() {
  await connectDB();

  try {
    const existingCount = await Order.estimatedDocumentCount();
    console.log(`Current order count before cleanup: ${existingCount}`);

    const result = await Order.deleteMany({});

    console.log(
      `Deleted ${result.deletedCount} orders from the database. All orders have been removed.`
    );
  } catch (err) {
    console.error("Error while cleaning up orders:", err);
  }
}

cleanupVolumeOrders()
  .catch((err) => {
    console.error("Unexpected error in cleanup script:", err);
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (err) {
      console.error("Error while closing MongoDB connection:", err);
    }
  });

