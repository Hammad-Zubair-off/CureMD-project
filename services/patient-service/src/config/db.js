import mongoose from "mongoose";
import { logger } from "../utils/logger.js";

/**
 * Cached connection for serverless.
 *
 * On Vercel every warm invocation reuses the same Node process, so we memoize
 * the connection promise on `globalThis` and reuse it instead of dialing a new
 * MongoDB connection per request. On a normal long-lived server (local / Docker)
 * this simply connects once on startup.
 */
const globalForMongoose = globalThis;
globalForMongoose._curemdMongoose ??= { conn: null, promise: null };
const cached = globalForMongoose._curemdMongoose;

export const connectDB = async () => {
    if (cached.conn) return cached.conn;

    if (!cached.promise) {
        const uri = process.env.MONGODB_URI;
        if (!uri) throw new Error("MONGODB_URI is not set");

        cached.promise = mongoose
            .connect(uri, {
                // Fail fast instead of buffering queries while disconnected —
                // important in serverless so a bad connection surfaces as a 5xx
                // rather than a hung request.
                bufferCommands: false,
                serverSelectionTimeoutMS: 10000,
            })
            .then((m) => {
                logger.success(`MongoDB connected (db: ${m.connection.name})`);
                return m;
            })
            .catch((error) => {
                // Reset so the next request can retry a fresh connection.
                cached.promise = null;
                logger.error("MongoDB connection error:", error);
                throw error;
            });
    }

    cached.conn = await cached.promise;
    return cached.conn;
};

// Connection lifecycle logs (attached once).
mongoose.connection.on("error", (err) => logger.error("Mongoose error:", err));
mongoose.connection.on("disconnected", () => logger.warn("Mongoose disconnected"));
