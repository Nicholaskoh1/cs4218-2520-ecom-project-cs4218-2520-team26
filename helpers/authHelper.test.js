import bcrypt from 'bcrypt';
import { hashPassword, comparePassword } from './authHelper';
import { describe } from 'node:test';

/**
 * Created by: Nicholas Koh Zi Lun (A0272806B)
 */

// Mocks
jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

// Tests
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

        it("should return 401 when hashing fails", async () => {
            // Arrange
            const password = "myPassword123";
            const error = new Error("Hashing failed");
            bcrypt.hash.mockRejectedValue(error);
            const res = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
            };

            // Act
            await hashPassword(password, res);

            // Assert
            expect(bcrypt.hash).toHaveBeenCalledWith(password, 10);
            expect(res.status).toHaveBeenCalledWith(401);
            expect(res.send).toHaveBeenCalledWith({
                success: false,
                message: "Error hashing password",
            });
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
    });
});