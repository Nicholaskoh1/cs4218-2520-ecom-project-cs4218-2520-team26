import React, { useEffect } from "react";
import { render, waitFor } from "@testing-library/react";
import axios from "axios";
import useCategory from "./useCategory";

// Earnest Suprapmo, A0251966U
jest.mock("axios");

const TestComponent = ({ onCategories }) => {
  const categories = useCategory();

  useEffect(() => {
    onCategories(categories);
  }, [categories, onCategories]);

  return null;
};

describe("useCategory", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("fetches categories and updates state on mount", async () => {
    // Arrange
    const mockCategories = [
      { _id: "cat1", name: "Category 1" },
      { _id: "cat2", name: "Category 2" },
    ];

    axios.get.mockResolvedValueOnce({
      data: { category: mockCategories },
    });

    const handleCategories = jest.fn();

    // Act
    render(<TestComponent onCategories={handleCategories} />);

    // Assert
    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      )
    );

    await waitFor(() =>
      expect(handleCategories).toHaveBeenLastCalledWith(mockCategories)
    );
  });

  it("logs an error when fetching categories fails and leaves categories empty", async () => {
    // Arrange
    const error = new Error("network error");
    axios.get.mockRejectedValueOnce(error);

    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    const handleCategories = jest.fn();

    // Act
    render(<TestComponent onCategories={handleCategories} />);

    // Assert
    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      )
    );

    expect(consoleSpy).toHaveBeenCalled();
    expect(handleCategories).toHaveBeenLastCalledWith([]);

    consoleSpy.mockRestore();
  });
});
