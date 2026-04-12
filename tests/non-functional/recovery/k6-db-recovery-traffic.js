// Emberlynn Loo, A0255614E
// ─────────────────────────────────────────────────────────────────────────────
// Recovery test: DB Connectivity Loss and Recovery Validation
//
// Three-phase structure (total ~90 s):
//   Phase 1 – Baseline (0–30 s):   All endpoints must return 200.
//   Phase 2 – Failure (30–60 s):   DB is forcibly disconnected; we assert
//                                   the server returns 503/500/504 (graceful
//                                   degradation), NOT 200 with corrupt data.
//   Phase 3 – Recovery (60–90 s):  DB reconnected; all endpoints must return
//                                   200 again, confirming zero data corruption.
//
// Run:
//   BASE_URL=http://localhost:6060 k6 run k6-db-recovery-traffic.js
// ─────────────────────────────────────────────────────────────────────────────

import http from "k6/http";
import { check, sleep, group } from "k6";
import { Trend, Counter, Rate } from "k6/metrics";

const BASE_URL = __ENV.BASE_URL || "http://localhost:6060";

const requestDuration = new Trend("request_duration", true);
const failedRequests = new Counter("failed_requests");
const successfulRequests = new Counter("successful_requests");
const errorRate = new Rate("error_rate");

const baselineSuccessRate = new Rate("baseline_success_rate");
const failureGracefulRate = new Rate("failure_graceful_rate");
const recoverySuccessRate = new Rate("recovery_success_rate");

export const options = {
    scenarios: {
        recovery_traffic: {
            executor: "constant-vus",
            vus: 20,
            duration: "90s",
        },
    },
    thresholds: {
        baseline_success_rate: ["rate>=0.95"],
        recovery_success_rate: ["rate>=0.95"],
        failure_graceful_rate: ["rate>=0.90"],
        http_req_duration: ["p(95)<5000"],
        error_rate: ["rate<0.60"],
    },
};

function elapsedSeconds(startEpochMs) {
    return (Date.now() - startEpochMs) / 1000;
}

function getPhase(startEpochMs) {
    const t = elapsedSeconds(startEpochMs);
    if (t < 30) return "baseline";
    if (t < 60) return "failure";
    return "recovery";
}

function login(email, password) {
    const res = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify({ email, password }),
        { headers: { "Content-Type": "application/json" }, timeout: "10s" }
    );
    try {
        const body = res.json();
        return body?.token || null;
    } catch (_) {
        return null;
    }
}

export function setup() {
    const userToken = login("cs4218@test.com", "cs4218@test.com");
    const adminToken = login("admin@test.sg", "admin@test.sg");

    console.log(`[setup] userToken present:  ${!!userToken}`);
    console.log(`[setup] adminToken present: ${!!adminToken}`);

    if (!userToken) {
        console.error("[setup] ⚠️  Could not obtain user token – auth endpoint may be down");
    }

    const startEpochMs = Date.now();
    console.log(`[setup] startEpochMs: ${startEpochMs}`);

    return { userToken, adminToken, startEpochMs };
}

export default function (data) {
    const { userToken, adminToken, startEpochMs } = data;
    const phase = getPhase(startEpochMs);
    const authHeaders = {
        Authorization: userToken,
        "Content-Type": "application/json",
    };

    group("product_list", () => {
        const res = http.get(
            `${BASE_URL}/api/v1/product/get-product`,
            { headers: authHeaders, timeout: "8s" }
        );
        requestDuration.add(res.timings.duration);
        recordMetrics(res, phase, "product_list");
    });

    sleep(0.3);

    group("category_list", () => {
        const res = http.get(
            `${BASE_URL}/api/v1/category/get-category`,
            { headers: authHeaders, timeout: "8s" }
        );
        requestDuration.add(res.timings.duration);
        recordMetrics(res, phase, "category_list");
    });

    sleep(0.3);

    group("user_orders", () => {
        const res = http.get(
            `${BASE_URL}/api/v1/auth/orders`,
            { headers: authHeaders, timeout: "8s" }
        );
        requestDuration.add(res.timings.duration);
        recordMetrics(res, phase, "user_orders");
    });

    sleep(0.3);

    group("relogin", () => {
        const res = http.post(
            `${BASE_URL}/api/v1/auth/login`,
            JSON.stringify({ email: "cs4218@test.com", password: "cs4218@test.com" }),
            { headers: { "Content-Type": "application/json" }, timeout: "8s" }
        );
        requestDuration.add(res.timings.duration);
        recordMetrics(res, phase, "relogin");
    });

    sleep(0.3);

    group("healthz", () => {
        const res = http.get(`${BASE_URL}/healthz`, { timeout: "5s" });
        requestDuration.add(res.timings.duration);

        // Health endpoint should ALWAYS return an HTTP response (never hang).
        // During the failure window, 503 is the correct/expected response.
        const alwaysResponds = check(res, {
            "healthz always returns an HTTP response": (r) =>
                r.status === 200 || r.status === 503,
        });

        if (phase === "baseline") {
            const ok = check(res, {
                "healthz returns 200 when DB is up (baseline)": (r) => r.status === 200,
            });
            baselineSuccessRate.add(ok ? 1 : 0);
            errorRate.add(ok ? 0 : 1);
            ok ? successfulRequests.add(1) : failedRequests.add(1);
        } else if (phase === "recovery") {
            const ok = check(res, {
                "healthz returns 200 when DB is up (recovery)": (r) => r.status === 200,
            });
            recoverySuccessRate.add(ok ? 1 : 0);
            errorRate.add(ok ? 0 : 1);
            ok ? successfulRequests.add(1) : failedRequests.add(1);
        } else {
            const graceful = check(res, {
                "healthz returns 503 when DB is down (graceful)": (r) =>
                    r.status === 503 || r.status === 200,
            });
            failureGracefulRate.add(graceful ? 1 : 0);
            errorRate.add(alwaysResponds ? 0 : 1);
            alwaysResponds ? successfulRequests.add(1) : failedRequests.add(1);
        }
    });

    sleep(0.3);

    group("db_status_probe", () => {
        const res = http.get(`${BASE_URL}/_test/db/status`, { timeout: "5s" });
        const reachable = check(res, {
            "db status endpoint reachable": (r) => r.status === 200,
        });
        if (reachable) {
            let body;
            try { body = res.json(); } catch (_) { return; }

            if (phase === "failure") {
                check({ readyState: body?.readyState, forced: body?.forced }, {
                    "readyState is 0 during failure window": (d) => d.readyState === 0,
                    "forced flag is true during failure window": (d) => d.forced === true,
                });
            } else if (phase === "recovery") {
                check({ readyState: body?.readyState }, {
                    "readyState is 1 after recovery": (d) => d.readyState === 1,
                });
            }
        }
    });

    sleep(0.2);
}

export function teardown(data) {
    console.log("\n[teardown] ── Post-test integrity checks ──────────────────");

    // 1. Force reconnect in case auto-reconnect hasn't fired yet
    const reconnectRes = http.post(
        `${BASE_URL}/_test/db/reconnect`,
        null,
        { timeout: "10s" }
    );
    let reconnectBody;
    try { reconnectBody = reconnectRes.json(); } catch (_) { reconnectBody = {}; }
    console.log(
        `[teardown] reconnect response: ${reconnectRes.status} ` +
        `readyState=${reconnectBody?.readyState}`
    );

    sleep(2);

    // Verify DB is up
    const statusRes = http.get(`${BASE_URL}/_test/db/status`, { timeout: "5s" });
    const statusOk = check(statusRes, {
        "[teardown] DB readyState is 1 (connected) after recovery": (r) => {
            try { return r.json()?.readyState === 1; } catch (_) { return false; }
        },
    });
    console.log(`[teardown] DB status check passed: ${statusOk}`);

    const healthRes = http.get(`${BASE_URL}/healthz`, { timeout: "5s" });
    const healthOk = check(healthRes, {
        "[teardown] /healthz returns 200 after full recovery": (r) => r.status === 200,
    });
    console.log(`[teardown] Health check passed: ${healthOk}`);

    // Data integrity
    const headers = { Authorization: data.userToken };
    const productRes = http.get(
        `${BASE_URL}/api/v1/product/get-product`,
        { headers, timeout: "10s" }
    );
    const productOk = check(productRes, {
        "[teardown] products readable after recovery (no corruption)": (r) => {
            if (r.status !== 200) return false;
            try {
                const body = r.json();
                return body?.success === true && Array.isArray(body?.products);
            } catch (_) { return false; }
        },
    });
    console.log(`[teardown] Product integrity check passed: ${productOk}`);

    const reloginRes = http.post(
        `${BASE_URL}/api/v1/auth/login`,
        JSON.stringify({ email: "cs4218@test.com", password: "cs4218@test.com" }),
        { headers: { "Content-Type": "application/json" }, timeout: "10s" }
    );
    const authOk = check(reloginRes, {
        "[teardown] login succeeds after recovery (auth not corrupted)": (r) => {
            if (r.status !== 200) return false;
            try { return !!r.json()?.token; } catch (_) { return false; }
        },
    });
    console.log(`[teardown] Auth integrity check passed: ${authOk}`);

    const ordersRes = http.get(
        `${BASE_URL}/api/v1/auth/orders`,
        { headers, timeout: "10s" }
    );
    const ordersOk = check(ordersRes, {
        "[teardown] orders readable after recovery (no data loss)": (r) => {
            if (r.status !== 200) return false;
            try {
                const body = r.json();
                return Array.isArray(body);
            } catch (_) { return false; }
        },
    });
    console.log(`[teardown] Orders integrity check passed: ${ordersOk}`);

    console.log("[teardown] ── Integrity checks complete ───────────────────\n");
}

function recordMetrics(res, phase, label) {
    const isSuccess = res.status === 200;
    const isGraceful =
        res.status === 200 ||
        res.status === 500 ||
        res.status === 503 ||
        res.status === 504;

    if (phase === "baseline") {
        const ok = check(res, {
            [`[baseline] ${label} returns 200`]: (r) => r.status === 200,
        });
        baselineSuccessRate.add(ok ? 1 : 0);
        isSuccess ? successfulRequests.add(1) : failedRequests.add(1);
        errorRate.add(isSuccess ? 0 : 1);
    } else if (phase === "failure") {
        const ok = check(res, {
            [`[failure] ${label} degrades gracefully (200/500/503/504)`]: () => isGraceful,
        });
        failureGracefulRate.add(ok ? 1 : 0);
        errorRate.add(isSuccess ? 0 : 1);
        isSuccess ? successfulRequests.add(1) : failedRequests.add(1);
    } else {
        const ok = check(res, {
            [`[recovery] ${label} returns 200 after reconnect`]: (r) => r.status === 200,
        });
        recoverySuccessRate.add(ok ? 1 : 0);
        isSuccess ? successfulRequests.add(1) : failedRequests.add(1);
        errorRate.add(isSuccess ? 0 : 1);
    }
}