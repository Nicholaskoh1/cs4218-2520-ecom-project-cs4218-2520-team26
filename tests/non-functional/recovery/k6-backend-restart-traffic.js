// Emberlynn Loo, A0255614E

import http from "k6/http";
import { check, sleep } from "k6";
import { Trend, Counter, Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";

const requestDuration = new Trend("request_duration");
const failedRequests = new Counter("failed_requests");
const successfulRequests = new Counter("successful_requests");
const errorRate = new Rate("error_rate");
const failureWindowStart = new Trend("failure_window_start_ms");

export const options = {
    scenarios: {
        continuous_traffic: {
            executor: "constant-vus",
            vus: 20,
            duration: "30s",
        },
    },
    thresholds: {
        http_req_duration: ["p(95)<5000"],
    },
};

function login(email, password) {
    const res = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify({ email, password }),
        { headers: { "Content-Type": "application/json" } }
    );
    const body = res.json();
    return body?.token || null;
}

export function setup() {
    const userToken = login("cs4218@test.com", "cs4218@test.com");
    const adminToken = login("admin@test.sg", "admin@test.sg");
    return { userToken, adminToken };
}

export default function (data) {
    const headers = { Authorization: data.userToken };
    const adminHeaders = { Authorization: data.adminToken };

    // Test 1: Product listing (read operation)
    const productRes = http.get(
        `${BASE_URL}/api/v1/product/product-list/1`,
        { headers }
    );
    requestDuration.add(productRes.timings.duration);

    const productOk = check(productRes, {
        "product list status 200": (r) => r.status === 200,
    });
    if (!productOk) {
        failedRequests.add(1);
        errorRate.add(1);
        failureWindowStart.add(Date.now()); // record timestamp of failure
    } else {
        successfulRequests.add(1);
        errorRate.add(0);
    }

    sleep(0.5);

    // Test 2: Category fetch (read operation)
    const catRes = http.get(
        `${BASE_URL}/api/v1/category/get-category`,
        { headers }
    );
    requestDuration.add(catRes.timings.duration);

    const catOk = check(catRes, {
        "category list status 200": (r) => r.status === 200,
    });
    if (!catOk) {
        failedRequests.add(1);
        errorRate.add(1);
        failureWindowStart.add(Date.now());
    } else {
        successfulRequests.add(1);
        errorRate.add(0);
    }

    sleep(0.5);

    // Test 3: Session validation with existing token
    const userAuthRes = http.get(
        `${BASE_URL}/api/v1/auth/user-auth`,
        { headers }
    );
    requestDuration.add(userAuthRes.timings.duration);

    const userAuthOk = check(userAuthRes, {
        "session validation with pre-restart token": (r) => r.status === 200,
    });
    if (!userAuthOk) {
        failedRequests.add(1);
        errorRate.add(1);
        failureWindowStart.add(Date.now());
    } else {
        successfulRequests.add(1);
        errorRate.add(0);
    }

    sleep(0.5);

    // Test 4: User orders (authenticated read)
    const ordersRes = http.get(
        `${BASE_URL}/api/v1/auth/orders`,
        { headers }
    );
    requestDuration.add(ordersRes.timings.duration);

    const ordersOk = check(ordersRes, {
        "orders status 200": (r) => r.status === 200,
        "orders response is array": (r) => {
            try {
                return Array.isArray(r.json());
            } catch (_e) {
                return false;
            }
        },
    });
    if (!ordersOk) {
        failedRequests.add(1);
        errorRate.add(1);
        failureWindowStart.add(Date.now());
    } else {
        successfulRequests.add(1);
        errorRate.add(0);
    }

    sleep(0.5);

    // Test 5: Re-login after restart (auth token validation post-restart)
    const reloginRes = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify({ email: "cs4218@test.com", password: "cs4218@test.com" }),
        { headers: { "Content-Type": "application/json" } }
    );
    const reloginOk = check(reloginRes, {
        "re-login after restart succeeds": (r) => r.status === 200 && r.json()?.token,
    });
    if (!reloginOk) {
        failedRequests.add(1);
        errorRate.add(1);
        failureWindowStart.add(Date.now());
    } else {
        successfulRequests.add(1);
        errorRate.add(0);
    }

    sleep(0.5);

    // Test 6: Admin all-orders endpoint during restart
    const adminOrdersRes = http.get(
        `${BASE_URL}/api/v1/auth/all-orders`,
        { headers: adminHeaders }
    );
    requestDuration.add(adminOrdersRes.timings.duration);

    const adminOrdersOk = check(adminOrdersRes, {
        "admin all-orders graceful during disruption": (r) => r.status === 200 || r.status === 503,
    });
    if (!adminOrdersOk) {
        failedRequests.add(1);
        errorRate.add(1);
        failureWindowStart.add(Date.now());
    } else {
        successfulRequests.add(1);
        errorRate.add(0);
    }

    sleep(0.5);

    // Test 7: Admin session validation with admin token
    const adminAuthRes = http.get(
        `${BASE_URL}/api/v1/auth/admin-auth`,
        { headers: adminHeaders }
    );
    requestDuration.add(adminAuthRes.timings.duration);

    const adminAuthOk = check(adminAuthRes, {
        "admin token remains valid after restart": (r) => r.status === 200,
    });
    if (!adminAuthOk) {
        failedRequests.add(1);
        errorRate.add(1);
        failureWindowStart.add(Date.now());
    } else {
        successfulRequests.add(1);
        errorRate.add(0);
    }

    sleep(0.5);

    // Test 8: Get all products during disruption (public product read operation)
    const allProductsRes = http.get(
        `${BASE_URL}/api/v1/product/get-product`,
        { headers }
    );
    const allProductsOk = check(allProductsRes, {
        "get all products graceful during disruption": (r) => r.status === 200 || r.status === 503,
        "product response shape valid": (r) => {
            if (r.status !== 200) return true;
            try {
                const body = r.json();
                return body && typeof body === "object" && Array.isArray(body.products);
            } catch (_e) {
                return false;
            }
        },
    });
    if (!allProductsOk) {
        failedRequests.add(1);
        errorRate.add(1);
        failureWindowStart.add(Date.now());
    } else {
        successfulRequests.add(1);
        errorRate.add(0);
    }

    // Test 9: Health check recovers after backend restart
    const healthRes = http.get(`${BASE_URL}/healthz`);
    const healthOk = check(healthRes, {
        "health endpoint responds": (r) => r.status === 200,
    });
    if (!healthOk) {
        failedRequests.add(1);
        errorRate.add(1);
        failureWindowStart.add(Date.now());
    } else {
        successfulRequests.add(1);
        errorRate.add(0);
    }

    sleep(0.5);
}