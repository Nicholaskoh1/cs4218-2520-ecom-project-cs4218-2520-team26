// Emberlynn Loo, A0255614E

// ─────────────────────────────────────────────────────────────────────────────
// Purpose: Temporarily monkey-patches Mongoose's internal readyState to
//          simulate a DB disconnection on an Atlas-hosted cluster (where you
//          cannot stop mongod directly).  Mount this router ONLY during
//          recovery testing – never in production.
//
// Usage (add to server.js before your route mounts, guarded by NODE_ENV):
//
// Endpoints exposed:
//   POST /_test/db/disconnect  – freeze readyState → 0 (disconnected)
//   POST /_test/db/reconnect   – restore readyState + real connection
//   GET  /_test/db/status      – return current readyState
// ─────────────────────────────────────────────────────────────────────────────

import express from "express";
import mongoose from "mongoose";

const connectionProto = Object.getPrototypeOf(mongoose.connection);
const originalDescriptor =
    Object.getOwnPropertyDescriptor(connectionProto, "readyState") ||
    Object.getOwnPropertyDescriptor(mongoose.connection, "readyState");


const originalGetter =
    originalDescriptor && typeof originalDescriptor.get === "function"
        ? originalDescriptor.get.bind(mongoose.connection)
        : null;

let _forcedState = null; // null → not patched; 0 → forced disconnected


function patchReadyState() {
    Object.defineProperty(mongoose.connection, "readyState", {
        configurable: true,
        enumerable: true,
        get() {
            if (_forcedState !== null) return _forcedState;
            if (originalGetter) {
                try {
                    return originalGetter();
                } catch (_) {
                }
            }
            return this._readyState ?? 0;
        },
        set(v) {
            this._readyState = v;
        },
    });
}

function restoreReadyState() {
    try {
        delete mongoose.connection.readyState;
    } catch (_) {
        if (originalDescriptor) {
            Object.defineProperty(
                connectionProto,
                "readyState",
                originalDescriptor
            );
        }
    }
    _forcedState = null;
}

const _originalExec = mongoose.Query.prototype.exec;
let queryInterceptInstalled = false;

function installQueryInterceptor() {
    if (queryInterceptInstalled) return;
    mongoose.Query.prototype.exec = async function (...args) {
        if (_forcedState === 0) {
            const err = new Error(
                "[FaultInjection] Simulated MongoDB network error – connection lost"
            );
            err.name = "MongoNetworkError";
            err.code = "ECONNRESET"; // mimic a real network drop
            throw err;
        }
        return _originalExec.apply(this, args);
    };
    queryInterceptInstalled = true;
}

function removeQueryInterceptor() {
    mongoose.Query.prototype.exec = _originalExec;
    queryInterceptInstalled = false;
}

export function createDbFailureRouter() {
    const router = express.Router();

    router.post("/db/disconnect", (req, res) => {
        const { durationMs } = req.body || {};

        console.warn(
            `[FaultInjection] ⚡ Simulating DB disconnection at ${new Date().toISOString()}`
        );

        patchReadyState();
        _forcedState = 0; // 0 = disconnected
        installQueryInterceptor();

        const responsePayload = {
            status: "disconnected",
            readyState: mongoose.connection.readyState,
            forced: true,
            timestamp: Date.now(),
        };

        if (durationMs && Number.isFinite(Number(durationMs)) && Number(durationMs) > 0) {
            const ms = Number(durationMs);
            responsePayload.autoReconnectAfterMs = ms;
            setTimeout(() => {
                console.warn(
                    `[FaultInjection] ⚡ Auto-restoring DB connection after ${ms}ms`
                );
                _forcedState = null;
                removeQueryInterceptor();
                restoreReadyState();
            }, ms);
        }

        res.json(responsePayload);
    });

    router.post("/db/reconnect", (req, res) => {
        console.warn(
            `[FaultInjection] ✅ Restoring DB connection at ${new Date().toISOString()}`
        );

        _forcedState = null;
        removeQueryInterceptor();
        restoreReadyState();

        res.json({
            status: "reconnected",
            readyState: mongoose.connection.readyState,
            forced: false,
            timestamp: Date.now(),
        });
    });

    router.get("/db/status", (_req, res) => {
        res.json({
            readyState: mongoose.connection.readyState,
            forced: _forcedState !== null,
            forcedValue: _forcedState,
            timestamp: Date.now(),
        });
    });

    return router;
}