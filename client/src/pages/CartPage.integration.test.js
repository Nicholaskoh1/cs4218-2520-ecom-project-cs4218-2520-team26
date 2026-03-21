// Earnest Suprapmo, A0251966U
// Integration tests for CartPage with AuthProvider and CartProvider

import React from "react";
import { MemoryRouter } from "react-router-dom";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import toast from "react-hot-toast";

import { AuthProvider } from "../context/auth";
import { CartProvider, useCart } from "../context/cart";
import CartPage from "./CartPage";

jest.mock("axios");
jest.mock("react-hot-toast");

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

const mockDropInInstance = {
  requestPaymentMethod: jest.fn(),
};

jest.mock("braintree-web-drop-in-react", () => {
  const React = require("react");
  return function DropInMock({ onInstance }) {
    if (onInstance) {
      onInstance(mockDropInInstance);
    }
    return <div data-testid="dropin" />;
  };
});

jest.mock("../components/Layout", () => ({
  __esModule: true,
  default: ({ children }) => <div>{children}</div>,
}));

const setupLocalStorage = () => {
  let store = {};
  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: jest.fn((key) => (key in store ? store[key] : null)),
      setItem: jest.fn((key, value) => {
        store[key] = String(value);
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        store = {};
      }),
    },
    writable: true,
  });
};

const setAuthData = (auth) => {
  window.localStorage.setItem("auth", JSON.stringify(auth));
};

const setCartData = (items) => {
  window.localStorage.setItem("cart", JSON.stringify(items));
};

const CartStateConsumer = () => {
  const [cart] = useCart();
  return <div data-testid="cart-size">{cart.length}</div>;
};

const renderWithProviders = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <CartProvider>
          <CartStateConsumer />
          <CartPage />
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>
  );

const defaultCart = [
  {
    _id: "p1",
    name: "Product 1",
    description: "First product description",
    price: 10,
  },
  {
    _id: "p2",
    name: "Product 2",
    description: "Second product description",
    price: 20,
  },
];

const loggedInAuth = {
  user: { name: "John Doe", address: "123 Main St" },
  token: "test-token",
};

describe("CartPage integration with real AuthProvider and CartProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setupLocalStorage();
    axios.defaults = { headers: { common: {} } };

    mockDropInInstance.requestPaymentMethod.mockReset();
    mockDropInInstance.requestPaymentMethod.mockResolvedValue({
      nonce: "test-nonce",
    });

    axios.get.mockResolvedValue({
      data: { clientToken: "test-client-token" },
    });
    axios.post.mockResolvedValue({ data: { success: true } });
  });

  it("displays cart items from context with name, description, price, and image", async () => {
    // Arrange
    setAuthData(loggedInAuth);
    setCartData(defaultCart);

    // Act
    renderWithProviders();

    // Assert
    await waitFor(() =>
      expect(screen.getByText("Product 1")).toBeInTheDocument()
    );
    expect(screen.getByText("Product 2")).toBeInTheDocument();

    expect(screen.getByText("First product description")).toBeInTheDocument();
    expect(screen.getByText("Second product description")).toBeInTheDocument();

    expect(screen.getByText("Price : 10")).toBeInTheDocument();
    expect(screen.getByText("Price : 20")).toBeInTheDocument();

    const images = screen.getAllByRole("img");
    expect(images[0]).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/p1"
    );
    expect(images[0]).toHaveAttribute("alt", "Product 1");

    expect(images[1]).toHaveAttribute(
      "src",
      "/api/v1/product/product-photo/p2"
    );
    expect(images[1]).toHaveAttribute("alt", "Product 2");
  });

  it("removing a cart item updates both context and localStorage", async () => {
    // Arrange
    setAuthData(loggedInAuth);
    setCartData(defaultCart);

    renderWithProviders();

    await waitFor(() =>
      expect(screen.getByText("Product 1")).toBeInTheDocument()
    );
    expect(screen.getByTestId("cart-size").textContent).toBe("2");

    const removeButtons = screen.getAllByRole("button", { name: /remove/i });

    // Act
    await userEvent.click(removeButtons[0]);

    // Assert
    await waitFor(() =>
      expect(screen.queryByText("Product 1")).not.toBeInTheDocument()
    );
    expect(screen.getByTestId("cart-size").textContent).toBe("1");

    const savedCart = JSON.parse(window.localStorage.getItem("cart"));
    expect(savedCart).toHaveLength(1);
    expect(savedCart[0]._id).toBe("p2");
  });

  it("calculates total price correctly from cart items", async () => {
    // Arrange
    setAuthData(loggedInAuth);
    setCartData(defaultCart);

    // Act
    renderWithProviders();

    // Assert
    await waitFor(() =>
      expect(screen.getByText("Total : $30.00")).toBeInTheDocument()
    );
  });

  it('shows Braintree drop-in and triggers payment flow for authenticated users with items', async () => {
    // Arrange
    setAuthData(loggedInAuth);
    setCartData(defaultCart);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId("dropin")).toBeInTheDocument();
      const btn = screen.getByRole("button", { name: /make payment/i });
      expect(btn).not.toBeDisabled();
    });

    const makePaymentButton = screen.getByRole("button", {
      name: /make payment/i,
    });

    // Act
    await userEvent.click(makePaymentButton);

    // Assert
    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith(
        "/api/v1/product/braintree/payment",
        {
          nonce: "test-nonce",
          cart: defaultCart,
        }
      )
    );
  });

  it("clears cart and navigates to orders after successful payment", async () => {
    // Arrange
    setAuthData(loggedInAuth);
    setCartData(defaultCart);

    renderWithProviders();

    await waitFor(() => {
      expect(screen.getByTestId("dropin")).toBeInTheDocument();
      const btn = screen.getByRole("button", { name: /make payment/i });
      expect(btn).not.toBeDisabled();
    });

    const makePaymentButton = screen.getByRole("button", {
      name: /make payment/i,
    });

    // Act
    await userEvent.click(makePaymentButton);

    // Assert
    await waitFor(() =>
      expect(window.localStorage.removeItem).toHaveBeenCalledWith("cart")
    );
    expect(screen.getByTestId("cart-size").textContent).toBe("0");
    expect(toast.success).toHaveBeenCalledWith(
      "Payment Completed Successfully "
    );
  });

  it('shows "please login to checkout" message for guest users', async () => {
    // Arrange
    const guestAuth = { user: null, token: "" };
    setAuthData(guestAuth);
    setCartData(defaultCart);

    renderWithProviders();

    // Assert
    await waitFor(() =>
      expect(screen.getByText("Hello Guest")).toBeInTheDocument()
    );

    expect(
      screen.getByText(
        "You Have 2 items in your cart please login to checkout !"
      )
    ).toBeInTheDocument();
  });
});
