import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import axios from "axios";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom/extend-expect";
import toast from "react-hot-toast";
import ForgotPassword from "./ForgotPassword";

// Mocks
jest.mock("axios");

jest.mock("react-hot-toast", () => ({
  success: jest.fn(),
  error: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock("react-router-dom", () => ({
  ...jest.requireActual("react-router-dom"),
  useNavigate: () => mockNavigate,
}));

jest.mock("../../components/Layout", () => ({ children }) => (
  <div>{children}</div>
));

window.matchMedia =
  window.matchMedia ||
  function () {
    return {
      matches: false,
      addListener: function () {},
      removeListener: function () {},
    };
  };

// Constants
const formFields = {
  title: "RESET PASSWORD",
  email: "Enter Your Email",
  answer: "What is Your Favorite sports",
  newPassword: "Enter Your New Password",
  button: "RESET PASSWORD",
};

const mockFormData = {
  email: "test@example.com",
  answer: "football",
  newPassword: "NewPassword123",
};

// Helper Functions
function renderForgotPassword() {
  return render(
    <MemoryRouter initialEntries={["/forgot-password"]}>
      <Routes>
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Routes>
    </MemoryRouter>,
  );
}

function fillForgotPasswordForm() {
  fireEvent.change(screen.getByPlaceholderText(formFields.email), {
    target: { value: mockFormData.email },
  });
  fireEvent.change(screen.getByPlaceholderText(formFields.answer), {
    target: { value: mockFormData.answer },
  });
  fireEvent.change(screen.getByPlaceholderText(formFields.newPassword), {
    target: { value: mockFormData.newPassword },
  });
}

// Nicholas Koh Zi Lun (A0272806B) - Unit tests for ForgotPassword.js
describe("ForgotPassword Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders forgot password form fields", () => {
    // Arrange
    renderForgotPassword();

    // Assert
    expect(
      screen.getByRole("heading", { name: formFields.title }),
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(formFields.email)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(formFields.answer)).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(formFields.newPassword),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: formFields.button }),
    ).toBeInTheDocument();
  });

  it("submits correct payload to axios.post on form submission", async () => {
    // Arrange
    axios.post.mockResolvedValueOnce({
      data: { success: true, message: "Password Reset Successfully" },
    });
    renderForgotPassword();
    fillForgotPasswordForm();

    // Act
    fireEvent.click(screen.getByRole("button", { name: formFields.button }));

    // Assert
    await waitFor(() =>
      expect(axios.post).toHaveBeenCalledWith("/api/v1/auth/forgot-password", {
        email: mockFormData.email,
        answer: mockFormData.answer,
        newPassword: mockFormData.newPassword,
      }),
    );
  });

  it("should reset password successfully", async () => {
    // Arrange
    const successMessage = "Password Reset Successfully";
    axios.post.mockResolvedValueOnce({
      data: { success: true, message: successMessage },
    });
    renderForgotPassword();
    fillForgotPasswordForm();

    // Act
    fireEvent.click(screen.getByRole("button", { name: formFields.button }));

    // Assert
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.success).toHaveBeenCalledWith(successMessage);
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("should display API error message when reset fails", async () => {
    // Arrange
    axios.post.mockResolvedValueOnce({
      data: { success: false, message: "Wrong Email Or Answer" },
    });
    renderForgotPassword();
    fillForgotPasswordForm();

    // Act
    fireEvent.click(screen.getByRole("button", { name: formFields.button }));

    // Assert
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Wrong Email Or Answer");
  });

  it("should display backend error message when request throws with response", async () => {
    // Arrange
    const error = new Error("Request failed");
    error.response = { data: { message: "Email is required" } };
    axios.post.mockRejectedValueOnce(error);
    renderForgotPassword();
    fillForgotPasswordForm();
    jest.spyOn(console, "log").mockImplementation(() => {});

    // Act
    fireEvent.click(screen.getByRole("button", { name: formFields.button }));

    // Assert
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith("Email is required");
    console.log.mockRestore();
  });

  it("should display network error message when request fails without response", async () => {
    // Arrange
    axios.post.mockRejectedValueOnce(new Error("Network error"));
    renderForgotPassword();
    fillForgotPasswordForm();
    jest.spyOn(console, "log").mockImplementation(() => {});

    // Act
    fireEvent.click(screen.getByRole("button", { name: formFields.button }));

    // Assert
    await waitFor(() => expect(axios.post).toHaveBeenCalled());
    expect(toast.error).toHaveBeenCalledWith(
      "Network error. Please check your connection.",
    );
    console.log.mockRestore();
  });
});
