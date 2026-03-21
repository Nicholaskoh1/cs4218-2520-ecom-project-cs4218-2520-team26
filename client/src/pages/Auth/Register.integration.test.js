import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom";
import toast from "react-hot-toast";
import Register from "./Register";

// Mocks
jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("../../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout">{children}</div>
));

jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../../context/cart", () => ({
  useCart: jest.fn(() => [null, jest.fn()]),
}));

jest.mock("../../context/search", () => ({
  useSearch: jest.fn(() => [{ keyword: "" }, jest.fn()]),
}));

Object.defineProperty(window, "localStorage", {
  value: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
  writable: true,
});

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

const MockLoginPage = () => (
  <div data-testid="login-page">
    <h1>Login Page</h1>
  </div>
);

// Test data
const formFields = {
  name: "Enter Your Name",
  email: "Enter Your Email",
  password: "Enter Your Password",
  phone: "Enter Your Phone",
  address: "Enter Your Address",
  dob: "Enter Your DOB",
  answer: "What is Your Favorite sports",
  button: "REGISTER",
};

const validUserData = {
  name: "Jane Smith",
  email: "jane.smith@example.com",
  password: "SecurePassword123",
  phone: "9876543210",
  address: "456 Oak Avenue",
  DOB: "1995-05-15",
  answer: "Tennis",
};

function renderRegisterWithRouter() {
  return render(
    <MemoryRouter initialEntries={["/register"]}>
      <Routes>
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<MockLoginPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillAllFormFields() {
  const nameInput = screen.getByPlaceholderText(formFields.name);
  const emailInput = screen.getByPlaceholderText(formFields.email);
  const passwordInput = screen.getByPlaceholderText(formFields.password);
  const phoneInput = screen.getByPlaceholderText(formFields.phone);
  const addressInput = screen.getByPlaceholderText(formFields.address);
  const dobInput = screen.getByPlaceholderText(formFields.dob);
  const answerInput = screen.getByPlaceholderText(formFields.answer);

  fireEvent.change(nameInput, { target: { value: validUserData.name } });
  fireEvent.change(emailInput, { target: { value: validUserData.email } });
  fireEvent.change(passwordInput, {
    target: { value: validUserData.password },
  });
  fireEvent.change(phoneInput, { target: { value: validUserData.phone } });
  fireEvent.change(addressInput, { target: { value: validUserData.address } });
  fireEvent.change(dobInput, { target: { value: validUserData.DOB } });
  fireEvent.change(answerInput, { target: { value: validUserData.answer } });
}

// Nicholas Koh Zi Lun, A0272806B
describe("Integration Tests for Register page", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    toast.success.mockClear();
    toast.error.mockClear();
  });

  describe("Form Field Presence and Functionality", () => {
    it("should render all required form fields", () => {
      // Arrange
      renderRegisterWithRouter();

      // Assert
      expect(screen.getByPlaceholderText(formFields.name)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(formFields.email)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(formFields.password),
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText(formFields.phone)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(formFields.address),
      ).toBeInTheDocument();
      expect(screen.getByPlaceholderText(formFields.dob)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(formFields.answer),
      ).toBeInTheDocument();
      expect(screen.getByText(formFields.button)).toBeInTheDocument();
    });

    it("should update name field when user types", async () => {
      // Arrange
      renderRegisterWithRouter();
      const nameInput = screen.getByPlaceholderText(formFields.name);

      // Act
      fireEvent.change(nameInput, { target: { value: "John Doe" } });

      // Assert
      expect(nameInput.value).toBe("John Doe");
    });

    it("should update email field when user types", async () => {
      // Arrange
      renderRegisterWithRouter();
      const emailInput = screen.getByPlaceholderText(formFields.email);

      // Act
      fireEvent.change(emailInput, { target: { value: "john@example.com" } });

      // Assert
      expect(emailInput.value).toBe("john@example.com");
    });

    it("should update password field when user types", async () => {
      // Arrange
      renderRegisterWithRouter();
      const passwordInput = screen.getByPlaceholderText(formFields.password);

      // Act
      fireEvent.change(passwordInput, { target: { value: "MyPassword123" } });

      // Assert
      expect(passwordInput.value).toBe("MyPassword123");
    });

    it("should update phone field when user types", async () => {
      // Arrange
      renderRegisterWithRouter();
      const phoneInput = screen.getByPlaceholderText(formFields.phone);

      // Act
      fireEvent.change(phoneInput, { target: { value: "1234567890" } });

      // Assert
      expect(phoneInput.value).toBe("1234567890");
    });

    it("should update address field when user types", async () => {
      // Arrange
      renderRegisterWithRouter();
      const addressInput = screen.getByPlaceholderText(formFields.address);

      // Act
      fireEvent.change(addressInput, { target: { value: "123 Main St" } });

      // Assert
      expect(addressInput.value).toBe("123 Main St");
    });

    it("should update DOB field when user types", async () => {
      // Arrange
      renderRegisterWithRouter();
      const dobInput = screen.getByPlaceholderText(formFields.dob);

      // Act
      fireEvent.change(dobInput, { target: { value: "2000-01-01" } });

      // Assert
      expect(dobInput.value).toBe("2000-01-01");
    });

    it("should update answer field when user types", async () => {
      // Arrange
      renderRegisterWithRouter();
      const answerInput = screen.getByPlaceholderText(formFields.answer);

      // Act
      fireEvent.change(answerInput, { target: { value: "Football" } });

      // Assert
      expect(answerInput.value).toBe("Football");
    });
  });

  describe("Form Submission and API Integration", () => {
    it("should call axios.post with correct payload on successful form fill and submit", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({
        data: { success: true },
      });

      renderRegisterWithRouter();
      fillAllFormFields();

      const submitButton = screen.getByText(formFields.button);

      // Act
      fireEvent.click(submitButton);

      // Assert
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledTimes(1);
      });

      expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/register", {
        name: validUserData.name,
        email: validUserData.email,
        password: validUserData.password,
        phone: validUserData.phone,
        address: validUserData.address,
        DOB: validUserData.DOB,
        answer: validUserData.answer,
      });
    });

    it("should show success toast message when registration succeeds", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({
        data: { success: true },
      });

      renderRegisterWithRouter();
      fillAllFormFields();

      // Act
      fireEvent.click(screen.getByText(formFields.button));

      // Assert
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          "Register Successfully, please login",
        );
      });
    });

    it("should navigate to /login after successful registration", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({
        data: { success: true },
      });

      renderRegisterWithRouter();
      fillAllFormFields();

      // Act
      fireEvent.click(screen.getByText(formFields.button));

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("login-page")).toBeInTheDocument();
      });

      expect(
        screen.queryByPlaceholderText(formFields.name),
      ).not.toBeInTheDocument();
    });
  });

  describe("Error Handling - Failed Registration", () => {
    it("should display error toast when API call fails", async () => {
      // Arrange
      const errorMessage = "Email already exists";
      axios.post.mockResolvedValueOnce({
        data: {
          success: false,
          message: errorMessage,
        },
      });

      renderRegisterWithRouter();
      fillAllFormFields();

      // Act
      fireEvent.click(screen.getByText(formFields.button));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(errorMessage);
      });
    });

    it("should not navigate to /login when registration fails", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({
        data: {
          success: false,
          message: "User already exists",
        },
      });

      renderRegisterWithRouter();
      fillAllFormFields();

      // Act
      fireEvent.click(screen.getByText(formFields.button));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText(formFields.name)).toBeInTheDocument();
    });

    it.each([
      ["Invalid phone number format"],
      ["Email already exists"],
      ["Password must be at least 6 characters"],
    ])("should show error toast with message: %s", async (errorMessage) => {
      // Arrange
      axios.post.mockResolvedValueOnce({
        data: {
          success: false,
          message: errorMessage,
        },
      });

      renderRegisterWithRouter();
      fillAllFormFields();

      // Act
      fireEvent.click(screen.getByText(formFields.button));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(errorMessage);
      });
    });
  });

  describe("Error Handling - Server/Network Errors", () => {
    it("should show network error message when axios request has no response", async () => {
      // Arrange
      const error = new Error("Network error");
      error.response = null;
      error.code = "ENOTFOUND";
      axios.post.mockRejectedValueOnce(error);
      jest.spyOn(console, "log").mockImplementation(() => {});

      renderRegisterWithRouter();
      fillAllFormFields();

      // Act
      fireEvent.click(screen.getByText(formFields.button));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Network error. Please check your connection.",
        );
      });

      console.log.mockRestore();
    });

    it("should show timeout error message when request times out", async () => {
      // Arrange
      const error = new Error("Timeout");
      error.response = null;
      error.code = "ECONNABORTED";
      axios.post.mockRejectedValueOnce(error);
      jest.spyOn(console, "log").mockImplementation(() => {});

      renderRegisterWithRouter();
      fillAllFormFields();

      // Act
      fireEvent.click(screen.getByText(formFields.button));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Request timeout. Please try again.",
        );
      });

      console.log.mockRestore();
    });

    it("should not navigate when server error occurs", async () => {
      // Arrange
      axios.post.mockRejectedValueOnce(new Error("Server error"));
      jest.spyOn(console, "log").mockImplementation(() => {});

      renderRegisterWithRouter();
      fillAllFormFields();

      // Act
      fireEvent.click(screen.getByText(formFields.button));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText(formFields.name)).toBeInTheDocument();

      console.log.mockRestore();
    });
  });
});
