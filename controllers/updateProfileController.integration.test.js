import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

import { updateProfileController } from "./authController.js";
import userModel from "../models/userModel.js";
import { comparePassword, hashPassword } from "../helpers/authHelper.js";

const createMockResponse = () => {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
};

const createRequest = (userId, body) => ({
  user: { _id: userId.toString() },
  body,
});

const createUserFixture = async (overrides = {}) => {
  const password = overrides.rawPassword || "oldPassword123";
  const hashedPassword = await hashPassword(password);

  const user = await userModel.create({
    name: "Original Name",
    email: "integration-user@test.com",
    password: hashedPassword,
    phone: "11111111",
    address: { line1: "Old Address", postal: "000000" },
    answer: "blue",
    ...overrides,
    password: overrides.password || hashedPassword,
  });

  return { user, oldPasswordHash: hashedPassword };
};

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(async () => {
  await userModel.deleteMany({});
  jest.clearAllMocks();
});

describe("updateProfileController integration with userModel", () => {
  it("updates name, phone, and address and persists the changes", async () => {
    // Arrange
    const { user, oldPasswordHash } = await createUserFixture({
      email: "integration-user-1@test.com",
      address: { line1: "Old Address" },
    });
    const req = createRequest(user._id, {
      name: "Updated Name",
      phone: "99998888",
      address: { line1: "New Address", postal: "123456" },
    });
    const res = createMockResponse();

    // Act
    await updateProfileController(req, res);

    // Assert
    const updatedUser = await userModel.findById(user._id).lean();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        message: "Profile Updated Successfully",
      })
    );

    expect(updatedUser.name).toBe("Updated Name");
    expect(updatedUser.phone).toBe("99998888");
    expect(updatedUser.address).toEqual({ line1: "New Address", postal: "123456" });
    expect(updatedUser.password).toBe(oldPasswordHash);
  });

  it("hashes a new password before saving to the database", async () => {
    // Arrange
    const { user, oldPasswordHash } = await createUserFixture({
      email: "integration-user-2@test.com",
      name: "Password User",
      phone: "22222222",
      address: { line1: "Address" },
      answer: "green",
    });
    const req = createRequest(user._id, { password: "newPassword456" });
    const res = createMockResponse();

    // Act
    await updateProfileController(req, res);

    // Assert
    const updatedUser = await userModel.findById(user._id).lean();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(updatedUser.password).not.toBe("newPassword456");
    expect(updatedUser.password).not.toBe(oldPasswordHash);
    expect(await comparePassword("newPassword456", updatedUser.password)).toBe(true);
  });

  it("returns an error when password is shorter than 6 characters", async () => {
    // Arrange
    const { user, oldPasswordHash } = await createUserFixture({
      email: "integration-user-3@test.com",
      name: "Short Password User",
      phone: "33333333",
      address: { line1: "Address" },
      answer: "red",
    });
    const req = createRequest(user._id, { password: "12345" });
    const res = createMockResponse();

    // Act
    await updateProfileController(req, res);

    // Assert
    const unchangedUser = await userModel.findById(user._id).lean();

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      error: "Password is required to be at least 6 characters long",
    });
    expect(unchangedUser.password).toBe(oldPasswordHash);
  });

  it("keeps fields unchanged when they are not provided in request body", async () => {
    // Arrange
    const { user, oldPasswordHash } = await createUserFixture({
      email: "integration-user-4@test.com",
      name: "Keep Fields User",
      phone: "44444444",
      address: { line1: "Initial Address", postal: "654321" },
      answer: "yellow",
    });
    const req = createRequest(user._id, { name: "Only Name Changed" });
    const res = createMockResponse();

    // Act
    await updateProfileController(req, res);

    // Assert
    const updatedUser = await userModel.findById(user._id).lean();

    expect(res.status).toHaveBeenCalledWith(200);
    expect(updatedUser.name).toBe("Only Name Changed");
    expect(updatedUser.phone).toBe("44444444");
    expect(updatedUser.address).toEqual({ line1: "Initial Address", postal: "654321" });
    expect(updatedUser.password).toBe(oldPasswordHash);
  });
});
