import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Gauge, Counter } from "k6/metrics";

// Earnest Suprapmo, A0251966U

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";

// Metrics for user order history
const userOrdersDuration = new Trend("user_orders_duration");
const userOrdersPayloadSize = new Gauge("user_orders_payload_size_bytes");
const userOrdersCount = new Gauge("user_orders_count");
const userOrdersTotalCount = new Counter("user_orders_total_count");

// Metrics for admin order history
const adminOrdersDuration = new Trend("admin_orders_duration");
const adminOrdersPayloadSize = new Gauge("admin_orders_payload_size_bytes");
const adminOrdersCount = new Gauge("admin_orders_count");
const adminOrdersTotalCount = new Counter("admin_orders_total_count");

export const options = {
  scenarios: {
    // Regular users viewing their own order history.
    user_order_history: {
      executor: "ramping-vus",
      exec: "userOrderHistory",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 10 },
        { duration: "1m", target: 30 },
        { duration: "30s", target: 0 },
      ],
    },

    // Admins viewing all orders across the system.
    admin_order_history: {
      executor: "ramping-vus",
      exec: "adminOrderHistory",
      startVUs: 0,
      stages: [
        { duration: "30s", target: 5 },
        { duration: "1m", target: 15 },
        { duration: "30s", target: 0 },
      ],
      startTime: "15s",
    },
  },

  thresholds: {
    http_req_failed: ["rate<0.01"],

    "http_req_duration{scenario:user_order_history}": ["p(95)<800"],
    "http_req_duration{scenario:admin_order_history}": ["p(95)<1000"],

    user_orders_duration: ["p(95)<800"],
    admin_orders_duration: ["p(95)<1000"],
  },
};

function login(email, password) {
  const payload = JSON.stringify({ email, password });
  const params = {
    headers: {
      "Content-Type": "application/json",
    },
  };

  const res = http.post(`${BASE_URL}/api/v1/auth/login`, payload, params);

  check(res, {
    "login status is 200": (r) => r.status === 200,
    "login returns token": (r) => {
      try {
        const body = r.json();
        return !!body?.token;
      } catch {
        return false;
      }
    },
  });

  const body = res.json();
  const token = body && body.token;
  if (!token) {
    throw new Error(`Failed to obtain token for ${email}`);
  }
  return token;
}

export function setup() {
  const userToken = login("cs4218@test.com", "cs4218@test.com");
  const adminToken = login("admin@test.sg", "admin@test.sg");

  return {
    userToken,
    adminToken,
  };
}

export function userOrderHistory(data) {
  const headers = {
    Authorization: data.userToken,
  };

  const res = http.get(`${BASE_URL}/api/v1/auth/orders`, { headers });

  userOrdersDuration.add(res.timings.duration);
  userOrdersPayloadSize.add(res.body ? res.body.length : 0);

  let orders = [];
  try {
    orders = res.json();
  } catch {
  }

  check(res, {
    "user orders status is 200": (r) => r.status === 200,
    "user orders is an array": () => Array.isArray(orders),
    "user orders have status/payment/products": () => {
      if (!Array.isArray(orders) || orders.length === 0) return true;
      const sample = orders[Math.floor(Math.random() * orders.length)];
      return (
        typeof sample.status === "string" &&
        typeof sample.payment === "object" &&
        Array.isArray(sample.products)
      );
    },
  });

  if (Array.isArray(orders)) {
    userOrdersCount.add(orders.length);
    userOrdersTotalCount.add(orders.length);
  }

  sleep(0.5);
}

export function adminOrderHistory(data) {
  const headers = {
    Authorization: data.adminToken,
  };

  const res = http.get(`${BASE_URL}/api/v1/auth/all-orders`, { headers });

  adminOrdersDuration.add(res.timings.duration);
  adminOrdersPayloadSize.add(res.body ? res.body.length : 0);

  let orders = [];
  try {
    orders = res.json();
  } catch {
  }

  const isSortedDesc = (() => {
    if (!Array.isArray(orders) || orders.length < 2) return true;
    for (let i = 0; i < orders.length - 1; i += 1) {
      const current = new Date(orders[i].createdAt).getTime();
      const next = new Date(orders[i + 1].createdAt).getTime();
      if (Number.isNaN(current) || Number.isNaN(next)) {
        return false;
      }
      if (current < next) {
        return false;
      }
    }
    return true;
  })();

  check(res, {
    "admin orders status is 200": (r) => r.status === 200,
    "admin orders is an array": () => Array.isArray(orders),
    "admin orders sorted by createdAt desc": () => isSortedDesc,
    "admin orders have status/payment/products": () => {
      if (!Array.isArray(orders) || orders.length === 0) return true;
      const sample = orders[Math.floor(Math.random() * orders.length)];
      return (
        typeof sample.status === "string" &&
        typeof sample.payment === "object" &&
        Array.isArray(sample.products)
      );
    },
  });

  if (Array.isArray(orders)) {
    adminOrdersCount.add(orders.length);
    adminOrdersTotalCount.add(orders.length);
  }

  sleep(0.5);
}
