import http from "k6/http";
import { check, sleep } from "k6";

// Earnest Suprapmo, A0251966U

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";

// Use search keywords matching seeded data.
const SEARCH_KEYWORDS = [
  "volume",
  "product",
  "electronics",
  "kitchen",
  "sports",
];

const CATEGORY_IDS = (__ENV.CATEGORY_IDS || "")
  .split(",")
  .map((id) => id.trim())
  .filter((id) => id.length > 0);

// Price ranges used in filter tests [min, max].
const PRICE_RANGES = [
  [0, 50],
  [50, 200],
  [200, 1000],
  [1000, 5000],
];

export const options = {
  scenarios: {
    // Users browsing paginated product lists.
    browse_products: {
      executor: "ramping-vus",
      exec: "browseProducts",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 20 },
        { duration: "1m", target: 50 },
        { duration: "30s", target: 0 },
      ],
    },

    // Users searching by keyword.
    search_products: {
      executor: "ramping-vus",
      exec: "searchProducts",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 30 },
        { duration: "30s", target: 0 },
      ],
      startTime: "10s",
    },

    // Users applying filters and pagination.
    filter_and_paginate: {
      executor: "ramping-vus",
      exec: "filterAndPaginate",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 30 },
        { duration: "30s", target: 0 },
      ],
      startTime: "20s",
    },
  },

  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<700"],

    "http_req_duration{scenario:browse_products}": ["p(95)<500"],
    "http_req_duration{scenario:search_products}": ["p(95)<600"],
    "http_req_duration{scenario:filter_and_paginate}": ["p(95)<700"],
  },
};

export function browseProducts() {
  const countRes = http.get(`${BASE_URL}/api/v1/product/product-count`);
  check(countRes, {
    "product count status is 200": (r) => r.status === 200,
  });

  const page = Math.floor(Math.random() * 100) + 1;
  const res = http.get(`${BASE_URL}/api/v1/product/product-list/${page}`);

  check(res, {
    "browse status is 200": (r) => r.status === 200,
    "browse payload contains products": (r) => {
      try {
        const body = r.json();
        return (
          body &&
          body.success === true &&
          Array.isArray(body.products) &&
          body.products.length <= 6
        );
      } catch {
        return false;
      }
    },
  });

  sleep(0.5);
}

export function searchProducts() {
  const keyword =
    SEARCH_KEYWORDS[Math.floor(Math.random() * SEARCH_KEYWORDS.length)];

  const res = http.get(`${BASE_URL}/api/v1/product/search/${encodeURIComponent(keyword)}`);

  check(res, {
    "search status is 200": (r) => r.status === 200,
    "search returns array of products": (r) => {
      try {
        const body = r.json();
        return Array.isArray(body);
      } catch {
        return false;
      }
    },
  });

  sleep(0.5);
}

export function filterAndPaginate() {
  const range =
    PRICE_RANGES[Math.floor(Math.random() * PRICE_RANGES.length)];

  const payload = {
    checked: CATEGORY_IDS.length
      ? [CATEGORY_IDS[Math.floor(Math.random() * CATEGORY_IDS.length)]]
      : [],
    radio: range,
  };

  const headers = {
    "Content-Type": "application/json",
  };

  const filterRes = http.post(
    `${BASE_URL}/api/v1/product/product-filters`,
    JSON.stringify(payload),
    { headers }
  );

  check(filterRes, {
    "filter status is 200": (r) => r.status === 200,
    "filter returns products array": (r) => {
      try {
        const body = r.json();
        return (
          body &&
          body.success === true &&
          Array.isArray(body.products)
        );
      } catch {
        return false;
      }
    },
  });

  const page = Math.floor(Math.random() * 100) + 1;
  const listRes = http.get(
    `${BASE_URL}/api/v1/product/product-list/${page}`
  );

  check(listRes, {
    "filter scenario list status is 200": (r) => r.status === 200,
  });

  sleep(0.5);
}

