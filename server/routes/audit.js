// Express route for the page audit feature.
// This file should stay "thin": parse the request, call into utils/analyzeHtml.js
// for the actual logic, and shape the HTTP response. No analysis logic belongs here.

const express = require('express');
// const fetch = require('node-fetch'); // TODO: use to fetch the target page's HTML
// const { analyzeHtml } = require('../utils/analyzeHtml'); // TODO: pure analysis function

const router = express.Router();

// POST /api/audit
// Expected body: { url: string } — the page to fetch and audit.
router.post('/', async (req, res) => {
  // TODO:
  // 1. Validate req.body.url is present and well-formed.
  // 2. Fetch the HTML for that URL (node-fetch).
  // 3. Pass the HTML string into analyzeHtml(html) to get audit results.
  // 4. Return the results as JSON, with proper error handling for
  //    unreachable URLs / non-HTML responses / analysis failures.

  res.status(501).json({ message: 'Not implemented yet' });
});

module.exports = router;
