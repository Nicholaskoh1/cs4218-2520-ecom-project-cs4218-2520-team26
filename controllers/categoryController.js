import categoryModel from "../models/categoryModel.js";
import slugify from "slugify";

const LIST_CACHE_TTL_MS = 15_000;
const categoryListCache = {
  payloadJson: null,
  expiresAt: 0,
};

const clearCategoryListCache = () => {
  categoryListCache.payloadJson = null;
  categoryListCache.expiresAt = 0;
};

const getCachedCategoryList = () => {
  if (categoryListCache.payloadJson && categoryListCache.expiresAt > Date.now()) {
    return categoryListCache.payloadJson;
  }
  clearCategoryListCache();
  return null;
};

const setCachedCategoryList = (payloadJson) => {
  categoryListCache.payloadJson = payloadJson;
  categoryListCache.expiresAt = Date.now() + LIST_CACHE_TTL_MS;
};

export const __clearCategoryListCacheForTests = clearCategoryListCache;

export const createCategoryController = async (req, res) => {
  try {
    const { name } = req.body;
    const normalizedName = name?.trim();
    if (!normalizedName) {
      return res
        .status(400)
        .send({ success: false, message: "Name is required" });
    }
    const normalizedSlug = slugify(normalizedName, {
      lower: true,
      strict: true,
    });
    const existingCategory = await categoryModel.findOne({
      slug: normalizedSlug,
    });
    if (existingCategory) {
      return res.status(409).send({
        success: false,
        message: "Category already exists",
      });
    }
    const category = await new categoryModel({
      name: normalizedName,
      slug: normalizedSlug,
    }).save();
    clearCategoryListCache();
    res.status(201).send({
      success: true,
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error in Category",
    });
  }
};

//update category
export const updateCategoryController = async (req, res) => {
  try {
    const { name } = req.body;
    const { id } = req.params;
    const normalizedName = name?.trim();

    if (!normalizedName) {
      return res
        .status(400)
        .send({ success: false, message: "Name is required" });
    }

    const normalizedSlug = slugify(normalizedName, {
      lower: true,
      strict: true,
    });
    const existingCategory = await categoryModel.findOne({
      slug: normalizedSlug,
      _id: { $ne: id },
    });

    if (existingCategory) {
      return res.status(409).send({
        success: false,
        message: "Category already exists",
      });
    }
    const category = await categoryModel.findByIdAndUpdate(
      id,
      { name: normalizedName, slug: normalizedSlug },
      { new: true }
    );
    if (!category) {
      return res.status(404).send({
        success: false,
        message: "Category not found",
      });
    }
    clearCategoryListCache();
    res.status(200).send({
      success: true,
      message: "Category Updated Successfully",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error while updating category",
    });
  }
};

// get all cat
export const categoryController = async (req, res) => {
  try {
    const cachedPayloadJson = getCachedCategoryList();
    if (cachedPayloadJson) {
      return res
        .status(200)
        .type("application/json")
        .send(cachedPayloadJson);
    }

    const category = await categoryModel.find({}).lean();
    const payload = {
      success: true,
      message: "All Categories List",
      category,
    };
    setCachedCategoryList(JSON.stringify(payload));
    res.status(200).send(payload);
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error while getting all categories",
    });
  }
};

// single category
export const singleCategoryController = async (req, res) => {
  try {
    const category = await categoryModel.findOne({ slug: req.params.slug });
    res.status(200).send({
      success: true,
      message: "Get Single Category Successfully",
      category,
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      error,
      message: "Error while getting Single Category",
    });
  }
};

//delete category
export const deleteCategoryController = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await categoryModel.findByIdAndDelete(id);
    if (!category) {
      return res.status(404).send({
        success: false,
        message: "Category not found",
      });
    }
    clearCategoryListCache();
    res.status(200).send({
      success: true,
      message: "Category Deleted Successfully",
    });
  } catch (error) {
    console.log(error);
    res.status(500).send({
      success: false,
      message: "Error while deleting category",
      error,
    });
  }
};
