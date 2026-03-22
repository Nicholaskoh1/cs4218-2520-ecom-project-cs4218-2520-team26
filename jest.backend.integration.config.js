export default {
  displayName: "backend-integration",

  testEnvironment: "node",

  testMatch: [
    "<rootDir>/tests/integration/authController/*.integration.test.js",
    "<rootDir>/tests/integration/*.integration.test.js",
  ],
};

