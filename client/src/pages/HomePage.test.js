import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import toast from "react-hot-toast";
import HomePage from "./HomePage";

// Earnest Suprapmo, A0251966U
jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("react-icons/ai", () => ({
  AiOutlineReload: () => <span>AiOutlineReload</span>,
}));

// Mock cart context
const mockSetCart = jest.fn();
jest.mock("../context/cart", () => ({
  useCart: () => [[], mockSetCart],
}));

jest.mock("../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../components/Prices", () => ({
  Prices: [
    { _id: 1, name: "Below $50", array: [0, 50] },
    { _id: 2, name: "$50 to $100", array: [50, 100] },
  ],
}));

// Mock localStorage
Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

describe("HomePage", () => {
  const mockCategories = [
    { _id: "cat1", name: "Category 1" },
    { _id: "cat2", name: "Category 2" },
  ];

  const mockProductsPage1 = [
    {
      _id: "prod1",
      name: "Product 1",
      price: 10,
      description: "First product description",
      slug: "product-1",
    },
  ];

  const mockProductsPage2 = [
    {
      _id: "prod2",
      name: "Product 2",
      price: 20,
      description: "Second product description",
      slug: "product-2",
    },
  ];

  const withConsoleSpy = async (run) => {
    const consoleSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    try {
      await run(consoleSpy);
    } finally {
      consoleSpy.mockRestore();
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({
          data: { success: true, category: mockCategories },
        });
      }
      if (url === "/api/v1/product/product-count") {
        return Promise.resolve({ data: { total: 2 } });
      }
      if (url.startsWith("/api/v1/product/product-list/")) {
        const page = url.split("/").pop();
        if (page === "1") {
          return Promise.resolve({ data: { products: mockProductsPage1 } });
        }
        if (page === "2") {
          return Promise.resolve({ data: { products: mockProductsPage2 } });
        }
        return Promise.resolve({ data: { products: [] } });
      }
      return Promise.resolve({ data: {} });
    });

    axios.post.mockImplementation((url) => {
      if (url === "/api/v1/product/product-filters") {
        return Promise.resolve({ data: { products: mockProductsPage1 } });
      }
      return Promise.resolve({ data: { products: [] } });
    });
  });

  it("handles error when fetching categories", async () => {
    await withConsoleSpy(async (consoleSpy) => {
      // Arrange
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.reject(new Error("category error"));
        }
        if (url === "/api/v1/product/product-count") {
          return Promise.resolve({ data: { total: 2 } });
        }
        if (url.startsWith("/api/v1/product/product-list/")) {
          return Promise.resolve({ data: { products: mockProductsPage1 } });
        }
        return Promise.resolve({ data: {} });
      });

      // Act
      render(<HomePage />);

      // Assert
      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-count"
        )
      );

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  it("handles error when fetching product list on initial load", async () => {
    await withConsoleSpy(async (consoleSpy) => {
      // Arrange
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        if (url === "/api/v1/product/product-count") {
          return Promise.resolve({ data: { total: 2 } });
        }
        if (url.startsWith("/api/v1/product/product-list/")) {
          return Promise.reject(new Error("list error"));
        }
        return Promise.resolve({ data: {} });
      });

      // Act
      render(<HomePage />);

      // Assert
      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-list/1"
        )
      );

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  it("does not render categories when category fetch is not successful", async () => {
    // Arrange
    axios.get.mockImplementation((url) => {
      if (url === "/api/v1/category/get-category") {
        return Promise.resolve({
          data: { success: false, category: mockCategories },
        });
      }
      if (url === "/api/v1/product/product-count") {
        return Promise.resolve({ data: { total: 2 } });
      }
      if (url.startsWith("/api/v1/product/product-list/")) {
        return Promise.resolve({ data: { products: mockProductsPage1 } });
      }
      return Promise.resolve({ data: {} });
    });

    // Act
    render(<HomePage />);

    // Assert
    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/category/get-category"
      )
    );
    expect(screen.getByText("Filter By Category")).toBeInTheDocument();
    expect(screen.queryByText("Category 1")).toBeNull();
  });

  it("handles error when fetching total product count", async () => {
    await withConsoleSpy(async (consoleSpy) => {
      // Arrange
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        if (url === "/api/v1/product/product-count") {
          return Promise.reject(new Error("count error"));
        }
        if (url.startsWith("/api/v1/product/product-list/")) {
          return Promise.resolve({ data: { products: mockProductsPage1 } });
        }
        return Promise.resolve({ data: {} });
      });

      // Act
      render(<HomePage />);

      // Assert
      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-count"
        )
      );

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  it("renders categories and products after fetching data", async () => {
    // Arrange
    // (default axios mocks in beforeEach)

    // Act
    render(<HomePage />);

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Filter By Category")).toBeInTheDocument();
      expect(screen.getByText("Category 1")).toBeInTheDocument();
      expect(screen.getByText("All Products")).toBeInTheDocument();
      expect(screen.getByText("Product 1")).toBeInTheDocument();
      expect(screen.getByText("$10.00")).toBeInTheDocument();
    });
  });

  it('adds a product to cart when "ADD TO CART" is clicked', async () => {
    // Arrange
    render(<HomePage />);

    // Act
    await waitFor(() =>
      expect(screen.getByText("Product 1")).toBeInTheDocument()
    );

    const addToCartButton = screen.getByRole("button", {
      name: /add to cart/i,
    });
    fireEvent.click(addToCartButton);

    // Assert
    expect(mockSetCart).toHaveBeenCalledTimes(1);
    expect(window.localStorage.setItem).toHaveBeenCalledWith(
      "cart",
      JSON.stringify([mockProductsPage1[0]])
    );
    expect(toast.success).toHaveBeenCalledWith("Item Added to cart");
  });

  it('navigates to product details when "More Details" is clicked', async () => {
    // Arrange
    render(<HomePage />);

    // Act
    await waitFor(() =>
      expect(screen.getByText("Product 1")).toBeInTheDocument()
    );

    const moreDetailsButton = screen.getByRole("button", {
      name: /more details/i,
    });
    fireEvent.click(moreDetailsButton);

    // Assert
    expect(mockNavigate).toHaveBeenCalledWith("/product/product-1");
  });

  it("loads more products when Loadmore button is clicked", async () => {
    // Arrange
    render(<HomePage />);

    // Act
    await waitFor(() =>
      expect(screen.getByText("Product 1")).toBeInTheDocument()
    );

    const loadMoreButton = screen.getByRole("button", { name: /loadmore/i });
    fireEvent.click(loadMoreButton);

    // Assert
    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/product-list/2"
      )
    );
    await waitFor(() =>
      expect(screen.getByText("Product 2")).toBeInTheDocument()
    );
  });

  it("handles error when loading more products", async () => {
    await withConsoleSpy(async (consoleSpy) => {
      // Arrange
      axios.get.mockImplementation((url) => {
        if (url === "/api/v1/category/get-category") {
          return Promise.resolve({
            data: { success: true, category: mockCategories },
          });
        }
        if (url === "/api/v1/product/product-count") {
          return Promise.resolve({ data: { total: 2 } });
        }
        if (url === "/api/v1/product/product-list/1") {
          return Promise.resolve({ data: { products: mockProductsPage1 } });
        }
        if (url === "/api/v1/product/product-list/2") {
          return Promise.reject(new Error("loadmore error"));
        }
        return Promise.resolve({ data: {} });
      });

      // Act
      render(<HomePage />);

      await waitFor(() =>
        expect(screen.getByText("Product 1")).toBeInTheDocument()
      );

      const loadMoreButton = screen.getByRole("button", { name: /loadmore/i });
      fireEvent.click(loadMoreButton);

      // Assert
      await waitFor(() =>
        expect(axios.get).toHaveBeenCalledWith(
          "/api/v1/product/product-list/2"
        )
      );

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  it("removes category from filter when unchecked", async () => {
    // Arrange
    render(<HomePage />);

    await waitFor(() =>
      expect(screen.getByText("Category 1")).toBeInTheDocument()
    );

    const categoryCheckbox = screen.getByText("Category 1");

    // select then unselect to cover both branches
    fireEvent.click(categoryCheckbox);
    fireEvent.click(categoryCheckbox);

    // Assert
    await waitFor(() =>
      expect(axios.get).toHaveBeenCalledWith(
        "/api/v1/product/product-list/1"
      )
    );
  });

  it("handles error when filtering products", async () => {
    await withConsoleSpy(async (consoleSpy) => {
      // Arrange
      axios.post.mockImplementation((url, body) => {
        if (url === "/api/v1/product/product-filters") {
          return Promise.reject(new Error("filter error"));
        }
        return Promise.resolve({ data: { products: [] } });
      });

      // Act
      render(<HomePage />);

      await waitFor(() =>
        expect(screen.getByText("Category 1")).toBeInTheDocument()
      );

      fireEvent.click(screen.getByText("Category 1"));

      // Assert
      await waitFor(() =>
        expect(axios.post).toHaveBeenCalledWith(
          "/api/v1/product/product-filters",
          {
            checked: ["cat1"],
            radio: [],
          }
        )
      );

      expect(consoleSpy).toHaveBeenCalled();
    });
  });

  it("filters products when a price range is selected", async () => {
    // Arrange
    render(<HomePage />);

    await waitFor(() =>
      expect(screen.getByText("Below $50")).toBeInTheDocument()
    );

    const priceOption = screen.getByText("Below $50");
    fireEvent.click(priceOption);

    // Assert
    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/product-filters",
        {
          checked: [],
          radio: [0, 50],
        }
      )
    );
  });

  it("filters products when both category and price are selected", async () => {
    // Arrange
    render(<HomePage />);

    await waitFor(() =>
      expect(screen.getByText("Category 1")).toBeInTheDocument()
    );
    await waitFor(() =>
      expect(screen.getByText("Below $50")).toBeInTheDocument()
    );

    const categoryCheckbox = screen.getByText("Category 1");
    const priceOption = screen.getByText("Below $50");

    // Act
    fireEvent.click(categoryCheckbox);
    fireEvent.click(priceOption);

    // Assert
    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/product-filters",
        {
          checked: ["cat1"],
          radio: [0, 50],
        }
      )
    );
  });

  it("reloads the page when RESET FILTERS is clicked", async () => {
    // Arrange
    render(<HomePage />);

    await waitFor(() =>
      expect(screen.getByText("RESET FILTERS")).toBeInTheDocument()
    );

    const originalLocation = window.location;
    const reloadMock = jest.fn();

    delete window.location;
    window.location = { reload: reloadMock };

    // Act
    fireEvent.click(screen.getByText("RESET FILTERS"));

    // Assert
    expect(reloadMock).toHaveBeenCalled();

    window.location = originalLocation;
  });
});
