import dotenv from "dotenv";
import mongoose from "mongoose";
import slugify from "slugify";

import connectDB from "../../../../config/db.js";
import Product from "../../../../models/productModel.js";
import Category from "../../../../models/categoryModel.js";

dotenv.config();

const TARGET_PRODUCT_COUNT = 100000;
const BATCH_SIZE = 1000;

// 1x1 transparent PNG placeholder (base64-encoded).
const PLACEHOLDER_IMAGE_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AAmsBT0yt7u0AAAAASUVORK5CYII=";
const PLACEHOLDER_IMAGE_BUFFER = Buffer.from(PLACEHOLDER_IMAGE_BASE64, "base64");
const PLACEHOLDER_IMAGE_CONTENT_TYPE = "image/png";

const CATEGORY_DEFINITIONS = [
  "Electronics",
  "Home & Kitchen",
  "Books",
  "Fashion",
  "Sports & Outdoors",
  "Health & Beauty",
  "Toys & Games",
  "Groceries",
];

function createLongDescription(index, categoryName) {
  const base =
    `This ${categoryName.toLowerCase()} product is part of a high-volume seed dataset ` +
    "used for performance and scalability testing of listing, search and filtering flows. ";

  const usage =
    "It is designed to resemble a realistic catalogue item with a descriptive paragraph, " +
    "mentioning materials, expected use cases and fit for purpose scenarios. ";

  const details =
    "The product is auto-generated, so any resemblance to real items is coincidental. " +
    "You can safely use it to test pagination, sorting, and complex query combinations " +
    "without affecting real customer data or analytics dashboards. ";

  const indexNote = `This is synthetic product #${index} in the volume dataset.`;

  return base + usage + details + indexNote;
}

function randomPrice() {
  // Between 5 and 5000, with two decimal places.
  const min = 5;
  const max = 5000;
  return Math.round((min + Math.random() * (max - min)) * 100) / 100;
}

function randomQuantity() {
  // Between 0 and 1000 units in stock.
  return Math.floor(Math.random() * 1001);
}

function randomShippingFlag() {
  // Around 70% of products are shippable.
  return Math.random() < 0.7;
}

async function ensureCategories() {
  const categories = [];

  for (const rawName of CATEGORY_DEFINITIONS) {
    const name = rawName.trim();
    const slug = slugify(name, { lower: true, strict: true });

    let category = await Category.findOne({ slug });
    if (!category) {
      category = await Category.create({ name, slug });
    }

    categories.push(category);
  }

  return categories;
}

function pickRandomCategory(categories) {
  const idx = Math.floor(Math.random() * categories.length);
  return categories[idx];
}

function buildProductDocument(globalIndex, categories) {
  const category = pickRandomCategory(categories);
  const categoryName = category.name || "General";
  const name = `${categoryName} Volume Product ${globalIndex}`;
  const slug = slugify(name, { lower: true, strict: true });

  return {
    name,
    slug,
    description: createLongDescription(globalIndex, categoryName),
    price: randomPrice(),
    quantity: randomQuantity(),
    category: category._id,
    shipping: randomShippingFlag(),
    photo: {
      data: PLACEHOLDER_IMAGE_BUFFER,
      contentType: PLACEHOLDER_IMAGE_CONTENT_TYPE,
    },
  };
}

async function seedVolumeProducts() {
  await connectDB();

  const existingCount = await Product.estimatedDocumentCount();
  const remainingToCreate = TARGET_PRODUCT_COUNT - existingCount;

  if (remainingToCreate <= 0) {
    console.log(
      `Database already has ${existingCount} products, which meets or exceeds the target of ${TARGET_PRODUCT_COUNT}.`
    );
    return;
  }

  console.log(
    `Seeding ${remainingToCreate} products to reach a total of ${TARGET_PRODUCT_COUNT} products...`
  );

  const categories = await ensureCategories();
  if (!categories.length) {
    throw new Error("No categories available for seeding products.");
  }

  let createdSoFar = 0;

  while (createdSoFar < remainingToCreate) {
    const batch = [];
    const batchLimit = Math.min(BATCH_SIZE, remainingToCreate - createdSoFar);

    for (let i = 0; i < batchLimit; i += 1) {
      const globalIndex = existingCount + createdSoFar + i + 1;
      batch.push(buildProductDocument(globalIndex, categories));
    }

    await Product.insertMany(batch);
    createdSoFar += batch.length;

    console.log(
      `Inserted batch of ${batch.length} products. Total newly created so far: ${createdSoFar}/${remainingToCreate}.`
    );
  }

  console.log(
    `Finished seeding products. Database should now contain approximately ${TARGET_PRODUCT_COUNT} products.`
  );
}

seedVolumeProducts()
  .catch((err) => {
    console.error("Error seeding volume products:", err);
  })
  .finally(async () => {
    try {
      await mongoose.disconnect();
    } catch (err) {
      console.error("Error while closing MongoDB connection:", err);
    }
  });

