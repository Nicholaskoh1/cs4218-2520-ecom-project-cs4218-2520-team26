import categoryModel from "../models/categoryModel.js";
import slugify from "slugify";

import {
    categoryController,
    singleCategoryController,
    createCategoryController,
    updateCategoryController,
    deleteCategoryController,
} from "../controllers/categoryController.js";

//Emberlynn Loo, A0255614E 

jest.mock("../models/categoryModel.js", () => {
    const saveMock = jest.fn();

    const mockModel = jest.fn(() => ({
        save: saveMock,
    }));

    mockModel.find = jest.fn();
    mockModel.findOne = jest.fn();
    mockModel.findByIdAndUpdate = jest.fn();
    mockModel.findByIdAndDelete = jest.fn();

    return {
        __esModule: true,
        default: mockModel,
    };
});

jest.mock("slugify", () => ({
    __esModule: true,
    default: jest.fn(),
}));

const mockResponse = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
};

const createMockResponse = () => {
    const res = {
        status: jest.fn(),
        send: jest.fn(),
    };
    res.status.mockReturnValue(res);
    return res;
};

describe("createCategoryController", () => {

    it("should return 401 if name is missing", async () => {
        // Arrange
        const req = { body: {} };
        const res = mockResponse();

        // Act
        await createCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(401);
    });

    it("should return existing category", async () => {
        // Arrange
        const req = { body: { name: "Existing Category" } };
        const res = mockResponse();

        categoryModel.findOne.mockResolvedValue({ name: "Existing Category" });

        // Act
        await createCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should create new category", async () => {
        // Arrange
        const req = { body: { name: "New Category" } };
        const res = mockResponse();

        categoryModel.findOne.mockResolvedValue(null);
        slugify.mockReturnValue("newCategory");

        categoryModel.mockImplementation(() => ({
            save: jest.fn().mockResolvedValue({ name: "New Category" }),
        }));

        // Act
        await createCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(201);
    });

    it("should handle error", async () => {
        // Arrange
        const req = { body: { name: "Err" } };
        const res = mockResponse();

        categoryModel.findOne.mockRejectedValue(new Error("DB error"));

        // Act
        await createCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
    });

});

describe("updateCategoryController", () => {

    it("should update category", async () => {
        // Arrange
        const req = { body: { name: "Updated" }, params: { id: "1" } };
        const res = mockResponse();

        slugify.mockReturnValue("updated");

        categoryModel.findByIdAndUpdate.mockResolvedValue({ name: "Updated" });

        // Act
        await updateCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should handle error", async () => {
        // Arrange
        const req = { body: { name: "Err" }, params: { id: "1" } };
        const res = mockResponse();

        categoryModel.findByIdAndUpdate.mockRejectedValue(new Error());

        // Act
        await updateCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
    });
});

describe("deleteCategoryController", () => {

    it("should delete category", async () => {
        // Arrange
        const req = { params: { id: "1" } };
        const res = mockResponse();

        categoryModel.findByIdAndDelete.mockResolvedValue();

        // Act
        await deleteCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(200);
    });

    it("should handle error", async () => {
        // Arrange
        const req = { params: { id: "1" } };
        const res = mockResponse();

        categoryModel.findByIdAndDelete.mockRejectedValue(new Error());

        // Act
        await deleteCategoryController(req, res);

        // Assert
        expect(res.status).toHaveBeenCalledWith(500);
    });

});

describe("categoryController", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("categoryController (get all categories)", () => {
        it("returns all categories on success", async () => {
            // Arrange
            const categories = [
                { _id: "1", name: "Cat 1" },
                { _id: "2", name: "Cat 2" },
            ];
            categoryModel.find.mockResolvedValueOnce(categories);
            const req = {};
            const res = createMockResponse();

            // Act
            await categoryController(req, res);

            // Assert
            expect(categoryModel.find).toHaveBeenCalledWith({});
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "All Categories List",
                category: categories,
            });
        });

        it("logs an error and returns 500 when fetching all categories fails", async () => {
            // Arrange
            const error = new Error("DB failure");
            categoryModel.find.mockRejectedValueOnce(error);
            const req = {};
            const res = createMockResponse();
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

            // Act
            await categoryController(req, res);

            // Assert
            expect(categoryModel.find).toHaveBeenCalledWith({});
            expect(consoleSpy).toHaveBeenCalledWith(error);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                error,
                message: "Error while getting all categories",
            });

            consoleSpy.mockRestore();
        });
    });

    describe("singleCategoryController", () => {
        it("returns a single category by slug on success", async () => {
            // Arrange
            const category = { _id: "1", name: "Cat 1", slug: "cat-1" };
            categoryModel.findOne.mockResolvedValueOnce(category);
            const req = { params: { slug: "cat-1" } };
            const res = createMockResponse();

            // Act
            await singleCategoryController(req, res);

            // Assert
            expect(categoryModel.findOne).toHaveBeenCalledWith({ slug: "cat-1" });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.send).toHaveBeenCalledWith({
                success: true,
                message: "Get Single Category Successfully",
                category,
            });
        });

        it("logs an error and returns 500 when fetching a single category fails", async () => {
            // Arrange
            const error = new Error("DB failure");
            categoryModel.findOne.mockRejectedValueOnce(error);
            const req = { params: { slug: "missing-slug" } };
            const res = createMockResponse();
            const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => { });

            // Act
            await singleCategoryController(req, res);

            // Assert
            expect(categoryModel.findOne).toHaveBeenCalledWith({
                slug: "missing-slug",
            });
            expect(consoleSpy).toHaveBeenCalledWith(error);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                error,
                message: "Error while getting Single Category",
            });

            consoleSpy.mockRestore();
        });
    });
});