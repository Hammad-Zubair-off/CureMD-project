import app from '../src/app.js';
import { connectDB } from '../src/config/db.js';

// Vercel serverless entrypoint. Every request ensures the (cached) DB
// connection is up, then hands off to the Express app.
export default async function handler(req, res) {
    try {
        await connectDB();
    } catch (error) {
        res.status(503).json({ success: false, error: 'Database unavailable' });
        return;
    }
    return app(req, res);
}
