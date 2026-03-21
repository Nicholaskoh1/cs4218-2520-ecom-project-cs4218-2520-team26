export const setupMockLocalStorage = ({ auth = null, cart = null } = {}) => {
  const store = {};

  if (auth !== null) {
    store.auth = JSON.stringify(auth);
  }

  if (cart !== null) {
    store.cart = JSON.stringify(cart);
  }

  Object.defineProperty(window, "localStorage", {
    value: {
      getItem: jest.fn((key) => (key in store ? store[key] : null)),
      setItem: jest.fn((key, value) => {
        store[key] = String(value);
      }),
      removeItem: jest.fn((key) => {
        delete store[key];
      }),
      clear: jest.fn(() => {
        Object.keys(store).forEach((key) => delete store[key]);
      }),
    },
    writable: true,
    configurable: true,
  });
};
