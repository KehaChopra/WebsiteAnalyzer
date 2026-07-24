// Entry point for the Page Pulse server.
// Responsibilities: load env config, set up middleware, mount routes, start listening.

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

const auditRouter = require('./routes/audit');

const app = express();
const PORT = process.env.PORT || 3000;

// --- Global middleware ---
app.use(cors());
app.use(express.json());

// --- Serve the static frontend from public/ ---
app.use(express.static(path.join(__dirname, '..', 'public')));

// --- API routes ---
app.use('/api/audit', auditRouter);

// TODO: add a catch-all 404 handler and a shared error-handling middleware here.

app.listen(PORT, () => {
  console.log(`Page Pulse server running on http://localhost:${PORT}`);
});
