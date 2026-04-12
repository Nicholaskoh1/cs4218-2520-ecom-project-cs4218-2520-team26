import dotenv from "dotenv";
import mongoose from "mongoose";

import connectDB from "../../../../config/db.js";
import Product from "../../../../models/productModel.js";

dotenv.config();

async function cleanupVolumeProducts() {
  await connectDB();

  try {
    const existingCount = await Product.estimatedDocumentCount();
    console.log(`Current product count before cleanup: ${existingCount}`);

    const result = await Product.deleteMany({});

    console.log(
      `Deleted ${result.deletedCount} products from the database. All products have been removed.`
    );
  } catch (err) {
    console.error("Error while cleaning up products:", err);
  }
}

cleanupVolumeProducts()
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

