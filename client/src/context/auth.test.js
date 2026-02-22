import { renderHook, act, waitFor } from "@testing-library/react";
import axios from "axios";
import { AuthProvider, useAuth } from "./auth";
import React from "react";

jest.mock("axios");

// Mock Data
const mockUser = {
    _id: "123456789",
    name: "John Doe",
    email: "john@example.com",
    phone: "1234567890",
    address: "123 Main Street",
    answer: "Singapore",
    role: 0,
};
const mockToken = "mock-token";

// Helper Functions
function wrapper({ children }) {
    return <AuthProvider>{children}</AuthProvider>;
}

function mockLocalStorage() {
    let storage = {};
    Object.defineProperty(window, "localStorage", {
        value: {
            getItem: jest.fn((key) => storage[key] || null),
            setItem: jest.fn((key, value) => {
                storage[key] = value.toString();
            }),
            removeItem: jest.fn((key) => {
                delete storage[key];
            }),
            clear: jest.fn(() => {
                storage = {};
            }),
        },
        writable: true,
    });
}

function setAuthData(user, token) {
    localStorage.setItem("auth", JSON.stringify({
        user: user,
        token: token,
    }));
}

// Nicholas Koh Zi Lun (A0272806B) - Unit tests for auth.js
describe("auth.js Unit Tests", () => {
    beforeEach(() => {
        mockLocalStorage();
        jest.clearAllMocks();
        axios.defaults = { headers: { common: {} } };
    });

    it("starts with default auth state", () => {
        // Act
        const { result } = renderHook(() => useAuth(), { wrapper });

        // Assert
        const [auth] = result.current;
        expect(auth.user).toBeNull();
        expect(auth.token).toBe("");
    });

    it("loads auth from localStorage on mount", async () => {
        // Arrange
        setAuthData(mockUser, mockToken);

        // Act
        const { result } = renderHook(() => useAuth(), { wrapper });

        // Assert
        await waitFor(() => {
            const [auth] = result.current;
            expect(localStorage.getItem).toHaveBeenCalledWith("auth");
            expect(auth.user).toEqual(mockUser);
            expect(auth.token).toBe(mockToken);
        });
    });

    it("throws when localStorage data is invalid JSON", () => {
        // Arrange
        localStorage.setItem("auth", "invalid-json");
        const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

        // Act
        renderHook(() => useAuth(), { wrapper });

        // Assert
        expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to parse auth data from localStorage:", expect.any(SyntaxError));
        consoleErrorSpy.mockRestore();
    });

    it("updates auth state when setAuth is called", () => {
        // Act
        const { result } = renderHook(() => useAuth(), { wrapper });
        act(() => {
            const [, setAuth] = result.current;
            setAuth({
                user: mockUser,
                token: mockToken,
            });
        });

        // Assert
        const [auth] = result.current;
        expect(auth.user).toEqual(mockUser);
        expect(auth.token).toBe(mockToken);
    });

    it("sets axios Authorisation header from token", async () => {
        // Arrange
        setAuthData(mockUser, mockToken);

        // Act
        renderHook(() => useAuth(), { wrapper });

        // Assert
        await waitFor(() => {
            expect(axios.defaults.headers.common["Authorization"]).toBe(`${mockToken}`);
        });
    });
});