import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import "@testing-library/jest-dom";
import AdminMenu from "./AdminMenu";

// Helper functions
function renderAdminMenu() {
    return render(
        <MemoryRouter>
            <AdminMenu />
        </MemoryRouter>
    );
}

// Nicholas Koh Zi Lun (A0272806B) - Unit tests for AdminMenu.js
describe("AdminMenu", () => {
    it("renders the Admin Panel heading", () => {
        // Act
        renderAdminMenu();

        // Assert
        expect(screen.getByRole("heading", { name: "Admin Panel" })).toBeInTheDocument();
    });

    it("renders all admin navigation links", () => {
        // Act
        renderAdminMenu();

        // Assert
        expect(screen.getByRole("link", { name: "Create Category" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Create Product" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Products" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Orders" })).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Users" })).toBeInTheDocument();
    });

    it("uses correct href values for navigation links", () => {
        // Act
        renderAdminMenu();

        // Assert
        expect(screen.getByRole("link", { name: "Create Category" })).toHaveAttribute("href", "/dashboard/admin/create-category");
        expect(screen.getByRole("link", { name: "Create Product" })).toHaveAttribute("href", "/dashboard/admin/create-product");
        expect(screen.getByRole("link", { name: "Products" })).toHaveAttribute("href", "/dashboard/admin/products");
        expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute("href", "/dashboard/admin/orders");
        expect(screen.getByRole("link", { name: "Users" })).toHaveAttribute("href", "/dashboard/admin/users");
    });
});