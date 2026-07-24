// Entry point for the Page Pulse server.
// Responsibilities: load env config, set up middleware, mount routes, start listening.

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const auditRouter = require('./routes/audit');

const app = express();
const PORT = process.env.PORT || 3000;

// The built React app (npm run build, from client/) — this is what gets
// served in production. In dev, the frontend is served separately by the
// Vite dev server (npm run dev, from client/), which proxies /api/* here.
const CLIENT_DIST_DIR = path.join(__dirname, '..', 'client', 'dist');

// --- Global middleware ---
app.use(cors());
app.use(express.json());

// --- Serve the built React app as static files ---
app.use(express.static(CLIENT_DIST_DIR));

// --- API routes ---
app.use('/api/audit', auditRouter);

// --- 404 handler for unmatched API routes ---
app.use('/api', (req, res) => {
  res.status(404).json({ success: false, error: { type: 'not_found', message: 'Unknown API endpoint.' } });
});

// --- SPA catch-all ---
// Must be registered AFTER the /api routes above, or it would intercept
// every API request and answer with index.html instead of JSON. This app
// has no client-side routing today, but this keeps a hard refresh on any
// path from 404ing if routing is added later.
app.get('*', (req, res, next) => {
  res.sendFile(path.join(CLIENT_DIST_DIR, 'index.html'), (err) => {
    if (err) next(err);
  });
});

// --- Shared error-handling middleware ---
// Catches anything that reaches here unhandled (e.g. express.json() failing
// to parse malformed request bodies, or a route handler throwing/rejecting
// synchronously). Always responds with sanitized JSON — never a raw stack
// trace — regardless of what threw.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: { type: 'internal_error', message: 'Something went wrong on the server.' },
  });
});

app.listen(PORT, () => {
  console.log(`Page Pulse server running on http://localhost:${PORT}`);
});
