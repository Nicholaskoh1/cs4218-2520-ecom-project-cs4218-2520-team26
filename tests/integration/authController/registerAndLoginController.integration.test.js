import mongoose from "mongoose";
import JWT from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";

import userModel from "../../../models/userModel.js";
import {
  registerController,
  loginController,
  forgotPasswordController,
} from "../../../controllers/authController.js";
import { hashPassword, comparePassword } from "../../../helpers/authHelper.js";

jest.setTimeout(30000);

const createMockRes = () => {
  const res = {};
  res.statusCode = 200;
  res.body = null;
  res.status = jest.fn().mockImplementation((code) => {
    res.statusCode = code;
    return res;
  });
  res.send = jest.fn().mockImplementation((payload) => {
    res.body = payload;
    return res;
  });
  return res;
};

const getRegisterBody = (overrides = {}) => ({
  name: "Jane Doe",
  email: "jane@example.com",
  password: "PlainPassword123",
  phone: "91234567",
  address: "123 Main Street",
  answer: "blue",
  ...overrides,
});

// Nicholas Koh Zi Lun, A0272806B
describe("Integration tests for registerController, loginController, and forgotPasswordController, with real database", () => {
  let mongoServer;

  beforeAll(async () => {
    process.env.JWT_SECRET =
      process.env.JWT_SECRET || "integration-test-secret";
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
  });

  beforeEach(async () => {
    await userModel.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongoServer.stop();
  });

  it("registering a new user hashes the password and persists the user", async () => {
    // Arrange
    const req = { body: getRegisterBody() };
    const res = createMockRes();

    // Act
    await registerController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.body.success).toBe(true);

    const storedUser = await userModel.findOne({ email: req.body.email });
    expect(storedUser).not.toBeNull();
    expect(storedUser.password).not.toBe(req.body.password);
    await expect(
      comparePassword(req.body.password, storedUser.password),
    ).resolves.toBe(true);
  });

  it("attempting to register with an existing email returns an error", async () => {
    // Arrange
    const existingPassword = await hashPassword("ExistingPassword123");
    await userModel.create({
      name: "Existing User",
      email: "existing@example.com",
      password: existingPassword,
      phone: "90000000",
      address: "Existing Address",
      answer: "green",
    });

    const req = {
      body: getRegisterBody({
        email: "existing@example.com",
      }),
    };
    const res = createMockRes();

    // Act
    await registerController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.body).toMatchObject({
      success: false,
      message: "This email has already been registered. Please login",
    });
  });

  it("logging in with correct credentials returns a JWT token and user data", async () => {
    // Arrange
    const plainPassword = "CorrectPassword123";
    const stored = await userModel.create({
      name: "Login User",
      email: "login@example.com",
      password: await hashPassword(plainPassword),
      phone: "95555555",
      address: "Login Address",
      answer: "orange",
      role: 0,
    });

    const req = {
      body: {
        email: "login@example.com",
        password: plainPassword,
      },
    };
    const res = createMockRes();

    // Act
    await loginController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user).toMatchObject({
      _id: stored._id,
      name: stored.name,
      email: stored.email,
      phone: stored.phone,
      role: stored.role,
    });

    const decoded = JWT.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded._id).toBe(String(stored._id));
  });

  it("logging in with incorrect password returns an error", async () => {
    // Arrange
    await userModel.create({
      name: "Wrong Password User",
      email: "wrongpass@example.com",
      password: await hashPassword("ActualPassword123"),
      phone: "96666666",
      address: "Wrong Password Address",
      answer: "purple",
    });

    const req = {
      body: {
        email: "wrongpass@example.com",
        password: "IncorrectPassword123",
      },
    };
    const res = createMockRes();

    // Act
    await loginController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toMatchObject({
      success: false,
      message: "Incorrect password",
    });
  });

  it("logging in with a non-existent email returns an error", async () => {
    // Arrange
    const req = {
      body: {
        email: "missing@example.com",
        password: "AnyPassword123",
      },
    };
    const res = createMockRes();

    // Act
    await loginController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.body).toMatchObject({
      success: false,
      message: "No account found with this email",
    });
  });

  it("forgotPasswordController resets password with correct answer and stores hashed value", async () => {
    // Arrange
    const originalPassword = "OldPassword123";
    const newPassword = "NewPassword123";

    await userModel.create({
      name: "Forgot User",
      email: "forgot@example.com",
      password: await hashPassword(originalPassword),
      phone: "97777777",
      address: "Forgot Address",
      answer: "teal",
    });

    const req = {
      body: {
        email: "forgot@example.com",
        answer: "teal",
        newPassword,
      },
    };
    const res = createMockRes();

    // Act
    await forgotPasswordController(req, res);

    // Assert
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.body).toMatchObject({
      success: true,
      message: "Password Reset Successfully",
    });

    const updatedUser = await userModel.findOne({
      email: "forgot@example.com",
    });
    expect(updatedUser.password).not.toBe(originalPassword);
    await expect(
      comparePassword(newPassword, updatedUser.password),
    ).resolves.toBe(true);
    await expect(
      comparePassword(originalPassword, updatedUser.password),
    ).resolves.toBe(false);
  });
});
