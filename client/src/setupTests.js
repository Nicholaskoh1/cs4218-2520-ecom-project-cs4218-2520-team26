// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import "@testing-library/jest-dom";

const originalConsoleError = console.error;
console.error = (...args) => {
  const [first] = args;
  if (typeof first === "string" && first.startsWith("Warning:")) {
    return;
  }
  originalConsoleError(...args);
};

const originalConsoleLog = console.log;
console.log = (...args) => {
  const [first] = args;
  if (first instanceof Error) {
    return;
  }
  if (typeof first === "string" && first.startsWith("Error:")) {
    return;
  }
  originalConsoleLog(...args);
};
