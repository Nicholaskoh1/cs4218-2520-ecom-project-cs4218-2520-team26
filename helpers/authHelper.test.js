import bcrypt from 'bcrypt';
import { hashPassword, comparePassword } from './authHelper';
import { describe } from 'node:test';

// Mocks
jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

// Nicholas Koh Zi Lun (A0272806B) - Test Suites for authHelper.js
describe("authHelper", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe("hashPassword", () => {
        it("should hash the password correctly", async () => {
            // Arrange
            const password = "myPassword123";
            const hashedPassword = "hashedPassword123";
            bcrypt.hash.mockResolvedValue(hashedPassword);

            // Act
            const result = await hashPassword(password);

            // Assert
            expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
            expect(result).toBe(hashedPassword);
        });

        it("should throw error when hashing fails", async () => {
            // Arrange
            const password = "myPassword123";
            const error = new Error("Hashing failed");
            bcrypt.hash.mockRejectedValue(error);

            // Act & Assert
            await expect(hashPassword(password)).rejects.toThrow("Error while hashing password");
        });
    });

    describe("comparePassword", () => {
        it("should compare passwords correctly", async () => {
            // Arrange
            const password = "myPassword123";
            const hashedPassword = "hashedPassword123";
            bcrypt.compare.mockResolvedValue(true);

            // Act
            const result = await comparePassword(password, hashedPassword);

            // Assert
            expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
            expect(result).toBe(true);
        });

        it("should return false for non-matching passwords", async () => {
            // Arrange
            const password = "myPassword123";
            const hashedPassword = "hashedPassword123";
            bcrypt.compare.mockResolvedValue(false);

            // Act
            const result = await comparePassword(password, hashedPassword);

            // Assert
            expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
            expect(result).toBe(false);
        });

        it("should throw error when comparison fails", async () => {
            // Arrange
            const password = "myPassword123";
            const hashedPassword = "hashedPassword123";
            const error = new Error("Comparison failed");
            bcrypt.compare.mockRejectedValue(error);

            // Act & Assert
            await expect(comparePassword(password, hashedPassword)).rejects.toThrow("Error while comparing password");
        });
    });
});