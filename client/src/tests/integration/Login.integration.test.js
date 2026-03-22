import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom";
import toast from "react-hot-toast";
import Login from "../../pages/Auth/Login";
import { AuthProvider, useAuth } from "../../context/auth";

// Mocks
jest.mock("axios");
jest.mock("react-hot-toast");
jest.mock("../../components/Layout", () => ({ children, title }) => (
  <div data-testid="layout">{children}</div>
));

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
    clear: jest.fn(),
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

const MockHomePage = () => (
  <div data-testid="home-page">
    <h1>Home Page</h1>
  </div>
);

const MockForgotPasswordPage = () => (
  <div data-testid="forgot-password-page">
    <h1>Forgot Password Page</h1>
  </div>
);

const MockStateTargetPage = () => (
  <div data-testid="state-target-page">
    <h1>State Target Page</h1>
  </div>
);

const AuthConsumer = ({ onAuthUpdate }) => {
  const [auth] = useAuth();
  React.useEffect(() => {
    onAuthUpdate(auth);
  }, [auth, onAuthUpdate]);
  return <div data-testid="auth-consumer" />;
};

// Test data
const formFields = {
  email: "Enter Your Email",
  password: "Enter Your Password",
  loginButton: "LOGIN",
  forgotButton: "Forgot Password",
};

const validLoginData = {
  email: "jane.login@example.com",
  password: "SecurePassword123",
};

const mockLoginResponse = {
  success: true,
  message: "Login successful",
  user: {
    _id: "user123",
    name: "Jane Login",
    email: validLoginData.email,
    phone: "9876543210",
    address: "456 Oak Avenue",
    role: 0,
  },
  token: "mockJWTToken123",
};

function renderLoginWithRouter(initialEntries = ["/login"]) {
  const authUpdateCallback = jest.fn();

  const rendered = render(
    <MemoryRouter initialEntries={initialEntries}>
      <AuthProvider>
        <AuthConsumer onAuthUpdate={authUpdateCallback} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<MockHomePage />} />
          <Route path="/forgot-password" element={<MockForgotPasswordPage />} />
          <Route path="/state-target" element={<MockStateTargetPage />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );

  return { ...rendered, authUpdateCallback };
}

function fillLoginForm(
  email = validLoginData.email,
  password = validLoginData.password,
) {
  const emailInput = screen.getByPlaceholderText(formFields.email);
  const passwordInput = screen.getByPlaceholderText(formFields.password);

  fireEvent.change(emailInput, { target: { value: email } });
  fireEvent.change(passwordInput, { target: { value: password } });
}

// Nicholas Koh Zi Lun, A0272806B
describe("Login Page - Integration Tests with Real AuthProvider and Navigation", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.setItem.mockClear();
    localStorage.getItem.mockClear();
    localStorage.removeItem.mockClear();
    localStorage.clear.mockClear();
    toast.success.mockClear();
    toast.error.mockClear();
  });

  describe("Form Fields and Inputs", () => {
    it("should render email and password input fields", () => {
      // Arrange
      renderLoginWithRouter();

      // Assert
      expect(screen.getByPlaceholderText(formFields.email)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(formFields.password),
      ).toBeInTheDocument();
      expect(screen.getByText(formFields.loginButton)).toBeInTheDocument();
      expect(screen.getByText(formFields.forgotButton)).toBeInTheDocument();
    });

    it("should update email field when user types", () => {
      // Arrange
      renderLoginWithRouter();

      const emailInput = screen.getByPlaceholderText(formFields.email);

      // Act
      fireEvent.change(emailInput, { target: { value: "test@example.com" } });

      // Assert
      expect(emailInput.value).toBe("test@example.com");
    });

    it("should update password field when user types", () => {
      // Arrange
      renderLoginWithRouter();

      const passwordInput = screen.getByPlaceholderText(formFields.password);

      // Act
      fireEvent.change(passwordInput, { target: { value: "MyPassword123" } });

      // Assert
      expect(passwordInput.value).toBe("MyPassword123");
    });
  });

  describe("API Integration", () => {
    it("should call axios.post with correct payload on form submission", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({
        data: mockLoginResponse,
      });

      renderLoginWithRouter();
      fillLoginForm();

      // Act
      fireEvent.click(screen.getByText(formFields.loginButton));

      // Assert
      await waitFor(() => {
        expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/login", {
          email: validLoginData.email,
          password: validLoginData.password,
        });
      });
    });
  });

  describe("Successful Login and Auth Context", () => {
    it("should update auth context with user and token after successful login", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({
        data: mockLoginResponse,
      });

      const { authUpdateCallback } = renderLoginWithRouter();
      fillLoginForm();

      // Act
      fireEvent.click(screen.getByText(formFields.loginButton));

      // Assert
      await waitFor(() => {
        expect(authUpdateCallback).toHaveBeenCalledWith(
          expect.objectContaining({
            user: mockLoginResponse.user,
            token: mockLoginResponse.token,
          }),
        );
      });
    });

    it("should persist auth data to localStorage after successful login", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({
        data: mockLoginResponse,
      });

      renderLoginWithRouter();
      fillLoginForm();

      // Act
      fireEvent.click(screen.getByText(formFields.loginButton));

      // Assert
      await waitFor(() => {
        expect(localStorage.setItem).toHaveBeenCalledWith(
          "auth",
          JSON.stringify(mockLoginResponse),
        );
      });
    });

    it("should show success toast message when login succeeds", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({
        data: mockLoginResponse,
      });

      renderLoginWithRouter();
      fillLoginForm();

      // Act
      fireEvent.click(screen.getByText(formFields.loginButton));

      // Assert
      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith(
          mockLoginResponse.message,
          expect.objectContaining({
            duration: 5000,
            icon: "🙏",
          }),
        );
      });
    });
  });

  describe("Navigation After Login", () => {
    it("should navigate to home page after successful login", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({
        data: mockLoginResponse,
      });

      renderLoginWithRouter();
      fillLoginForm();

      // Act
      fireEvent.click(screen.getByText(formFields.loginButton));

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("home-page")).toBeInTheDocument();
      });

      expect(
        screen.queryByPlaceholderText(formFields.email),
      ).not.toBeInTheDocument();
    });

    it("should navigate to location.state if present after login", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({
        data: mockLoginResponse,
      });

      renderLoginWithRouter([{ pathname: "/login", state: "/state-target" }]);
      fillLoginForm();

      // Act
      fireEvent.click(screen.getByText(formFields.loginButton));

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("state-target-page")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
    });
  });

  describe("Error Handling - Failed Login", () => {
    it("should show error toast when login fails", async () => {
      // Arrange
      const errorMessage = "Invalid email or password";
      axios.post.mockResolvedValueOnce({
        data: {
          success: false,
          message: errorMessage,
        },
      });

      renderLoginWithRouter();
      fillLoginForm();

      // Act
      fireEvent.click(screen.getByText(formFields.loginButton));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(errorMessage);
      });
    });

    it("should not update auth context on failed login", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({
        data: {
          success: false,
          message: "Invalid credentials",
        },
      });

      const { authUpdateCallback } = renderLoginWithRouter();
      fillLoginForm();

      // Act
      fireEvent.click(screen.getByText(formFields.loginButton));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      const contextUpdates = authUpdateCallback.mock.calls;
      const hasUserUpdate = contextUpdates.some(
        (call) => call[0]?.user !== null && call[0]?.user !== undefined,
      );
      expect(hasUserUpdate).toBe(false);
    });

    it("should not persist to localStorage on failed login", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({
        data: {
          success: false,
          message: "Login failed",
        },
      });

      renderLoginWithRouter();
      fillLoginForm();

      // Act
      fireEvent.click(screen.getByText(formFields.loginButton));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      const setItemCalls = localStorage.setItem.mock.calls;
      const authSetCalls = setItemCalls.filter((call) => call[0] === "auth");
      expect(authSetCalls.length).toBe(0);
    });

    it("should stay on login page when login fails", async () => {
      // Arrange
      axios.post.mockResolvedValueOnce({
        data: {
          success: false,
          message: "Invalid credentials",
        },
      });

      renderLoginWithRouter();
      fillLoginForm();

      // Act
      fireEvent.click(screen.getByText(formFields.loginButton));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      expect(screen.getByPlaceholderText(formFields.email)).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText(formFields.password),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
    });
  });

  describe("Error Handling - Server Errors", () => {
    it("should show generic error toast on server error", async () => {
      // Arrange
      axios.post.mockRejectedValueOnce(new Error("Server error"));
      jest.spyOn(console, "log").mockImplementation(() => {});

      renderLoginWithRouter();
      fillLoginForm();

      // Act
      fireEvent.click(screen.getByText(formFields.loginButton));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith(
          "Network error. Please check your connection.",
        );
      });

      console.log.mockRestore();
    });

    it("should not update context on server error", async () => {
      // Arrange
      axios.post.mockRejectedValueOnce(new Error("Network error"));
      jest.spyOn(console, "log").mockImplementation(() => {});

      const { authUpdateCallback } = renderLoginWithRouter();
      fillLoginForm();

      // Act
      fireEvent.click(screen.getByText(formFields.loginButton));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      const contextUpdates = authUpdateCallback.mock.calls;
      const hasUserUpdate = contextUpdates.some(
        (call) => call[0]?.user !== null && call[0]?.user !== undefined,
      );
      expect(hasUserUpdate).toBe(false);

      console.log.mockRestore();
    });

    it("should stay on login page on server error", async () => {
      // Arrange
      axios.post.mockRejectedValueOnce(new Error("Server error"));
      jest.spyOn(console, "log").mockImplementation(() => {});

      renderLoginWithRouter();
      fillLoginForm();

      // Act
      fireEvent.click(screen.getByText(formFields.loginButton));

      // Assert
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });

      expect(screen.getByPlaceholderText(formFields.email)).toBeInTheDocument();
      expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();

      console.log.mockRestore();
    });
  });

  describe("Forgot Password Navigation", () => {
    it("should navigate to /forgot-password when Forgot Password button is clicked", async () => {
      // Arrange
      renderLoginWithRouter();

      const forgotButton = screen.getByText(formFields.forgotButton);

      // Act
      fireEvent.click(forgotButton);

      // Assert
      await waitFor(() => {
        expect(screen.getByTestId("forgot-password-page")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("login-page")).not.toBeInTheDocument();
    });
  });
});
