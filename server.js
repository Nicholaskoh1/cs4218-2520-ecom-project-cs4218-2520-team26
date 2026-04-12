import express from "express";
import colors from "colors";
import dotenv from "dotenv";
import morgan from "morgan";
import connectDB from "./config/db.js";
import authRoutes from './routes/authRoute.js'
import categoryRoutes from './routes/categoryRoutes.js'
import productRoutes from './routes/productRoutes.js'
import cors from "cors";
import mongoose from "mongoose";
import { createDbFailureRouter } from "./tests/non-functional/recovery/inject-db-failure.js";

// configure env
dotenv.config();

//database config
connectDB();

const app = express();

//middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// ── Fault injection (recovery testing only) ───────────────────────────────────
// Mount BEFORE application routes so /_test/* is never shadowed.
// Activated only when ENABLE_FAULT_INJECTION=true to ensure it never runs in prod.
if (process.env.ENABLE_FAULT_INJECTION === "true") {
    app.use("/_test", createDbFailureRouter());
    console.warn("[FAULT INJECTION] /_test routes are ACTIVE – not for production".bgRed.white);
}

//routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/category", categoryRoutes);
app.use("/api/v1/product", productRoutes);

// ── Health check ──────────────────────────────────────────────────────────────
// readyState: 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
// Returns 503 when DB is not ready so load balancers + the recovery test can
// detect degraded state without relying on a failed application request.
app.get("/healthz", (req, res) => {
    const readyState = mongoose.connection.readyState;
    if (readyState === 1) {
        return res.status(200).json({
            status: "ok",
            db: "connected",
            readyState,
            timestamp: new Date().toISOString(),
        });
    }
    return res.status(503).json({
        status: "degraded",
        db: "disconnected",
        readyState,
        timestamp: new Date().toISOString(),
    });
});

// rest api
app.get('/', (req, res) => {
    res.send("<h1>Welcome to ecommerce app</h1>");
});

const PORT = process.env.PORT || 6060;

app.listen(PORT, () => {
    console.log(`Server running on ${process.env.DEV_MODE} mode on ${PORT}`.bgCyan.white);
});