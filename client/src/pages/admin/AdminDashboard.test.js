import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import AdminDashboard from "./AdminDashboard";
import { useAuth } from "../../context/auth";
import { before } from "node:test";

// Mocks
jest.mock("../../context/auth", () => ({
  useAuth: jest.fn(),
}));

jest.mock("../../components/AdminMenu", () => () => (
  <div data-testid="admin-menu">Admin Menu</div>
));

jest.mock("../../components/Layout", () => ({ children }) => (
  <div data-testid="layout">{children}</div>
));

// Constants
const mockAdminData = {
    name: "Admin",
    email: "admin@example.com",
    phone: "12345678",
    address: "123 Admin Street",
    answer: "admin",
}
const mockToken = "mock-token"

// Nicholas Koh Zi Lun (A0272806B) - Unit tests for AdminDashboard.js
describe("AdminDashboard", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it("renders layout and admin menu", () => {
        // Arrange
        useAuth.mockReturnValue([{ user: mockAdminData, token: mockToken }]);

        // Act
        render(<AdminDashboard />);

        // Assert
        expect(screen.getByTestId("layout")).toBeInTheDocument();
        expect(screen.getByTestId("admin-menu")).toBeInTheDocument();
    });

    it("shows admin user information from auth context", () => {
        // Arrange
        useAuth.mockReturnValue([{ user: mockAdminData, token: mockToken }]);

        // Act
        render(<AdminDashboard />);

        // Assert
        expect(screen.getByText(`Admin Name : ${mockAdminData.name}`)).toBeInTheDocument();
        expect(screen.getByText(`Admin Email : ${mockAdminData.email}`)).toBeInTheDocument();
        expect(screen.getByText(`Admin Contact : ${mockAdminData.phone}`)).toBeInTheDocument();
    });

    it("handles missing user data gracefully", () => {
        // Arrange
        useAuth.mockReturnValue([{}, mockToken]);

        // Act
        render(<AdminDashboard />);

        // Assert
        expect(screen.getByText("Admin Name :")).toBeInTheDocument();
        expect(screen.getByText("Admin Email :")).toBeInTheDocument();
        expect(screen.getByText("Admin Contact :")).toBeInTheDocument();
    });
});