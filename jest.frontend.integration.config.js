export default {
  displayName: "frontend-integration",
  testEnvironment: "jest-environment-jsdom",

  transform: {
    "^.+\\.jsx?$": "babel-jest",
  },

  moduleNameMapper: {
    "\\.(css|scss)$": "identity-obj-proxy",
    "^client/(.*)$": "<rootDir>/client/$1",
  },

  transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js)$)"],

  testMatch: [
    "<rootDir>/client/src/tests/integration/*.integration.test.js",
  ],

  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
};
