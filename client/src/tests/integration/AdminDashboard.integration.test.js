import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import "@testing-library/jest-dom";
import axios from "axios";

import AdminDashboard from "../../pages/admin/AdminDashboard";
import { AuthProvider } from "../../context/auth";
import { CartProvider } from "../../context/cart";
import { SearchProvider } from "../../context/search";

jest.mock("axios");

const ADMIN_USER = {
  name: "Admin Jane",
  email: "admin.jane@example.com",
  phone: "91234567",
};

function renderAdminDashboard() {
  return render(
    <MemoryRouter initialEntries={["/dashboard/admin"]}>
      <AuthProvider>
        <CartProvider>
          <SearchProvider>
            <Routes>
              <Route path="/dashboard/admin" element={<AdminDashboard />} />
            </Routes>
          </SearchProvider>
        </CartProvider>
      </AuthProvider>
    </MemoryRouter>,
  );
}

// Nicholas Koh Zi Lun, A0272806B
describe("AdminDashboard integration tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    axios.get.mockResolvedValue({ data: { category: [] } });
  });

  it("displays admin name, email, and phone from the real auth context", async () => {
    // Arrange
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: ADMIN_USER,
        token: "admin-token",
      }),
    );

    // Act
    renderAdminDashboard();

    // Assert
    await waitFor(() => {
      expect(screen.getByText(`Admin Name : ${ADMIN_USER.name}`)).toBeInTheDocument();
      expect(screen.getByText(`Admin Email : ${ADMIN_USER.email}`)).toBeInTheDocument();
      expect(screen.getByText(`Admin Contact : ${ADMIN_USER.phone}`)).toBeInTheDocument();
    });
  });

  it("renders AdminMenu with all 5 navigation links and correct hrefs", async () => {
    // Arrange
    localStorage.setItem(
      "auth",
      JSON.stringify({
        user: ADMIN_USER,
        token: "admin-token",
      }),
    );

    // Act
    renderAdminDashboard();

    // Assert
    await waitFor(() => {
      expect(
        screen.getByRole("link", { name: "Create Category" }),
      ).toHaveAttribute("href", "/dashboard/admin/create-category");
      expect(
        screen.getByRole("link", { name: "Create Product" }),
      ).toHaveAttribute("href", "/dashboard/admin/create-product");
      expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute(
        "href",
        "/dashboard/admin/products",
      );
      expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute(
        "href",
        "/dashboard/admin/orders",
      );
      expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute(
        "href",
        "/dashboard/admin/users",
      );
    });
  });

  it("renders empty admin fields gracefully when auth context has no user data", async () => {
    // Arrange
    localStorage.removeItem("auth");

    // Act
    renderAdminDashboard();

    // Assert
    await waitFor(() => {
      expect(screen.getByText("Admin Name :")).toBeInTheDocument();
      expect(screen.getByText("Admin Email :")).toBeInTheDocument();
      expect(screen.getByText("Admin Contact :")).toBeInTheDocument();
    });

    expect(screen.queryByText(/undefined|null/)).not.toBeInTheDocument();
  });
});
