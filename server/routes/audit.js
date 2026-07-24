// Express route for the page audit feature.
// This file stays "thin": parse the request, call into utils/analyzeHtml.js
// for the actual logic, and map the outcome onto an HTTP response. No fetch/
// cheerio logic belongs here — that all lives in analyzeUrl()/analyzeHtml().

const express = require('express');
const { analyzeUrl, AnalyzeError } = require('../utils/analyzeHtml');

const router = express.Router();

// Maps AnalyzeError.type -> HTTP status code.
// parse_failed isn't in the spec's list but can be thrown by analyzeUrl(), so
// it's mapped here too (as an upstream-content problem, like fetch_failed).
const ERROR_STATUS_BY_TYPE = {
  invalid_url: 400,
  timeout: 504,
  unreachable: 502,
  fetch_failed: 502,
  parse_failed: 502,
};

// POST /api/audit
// Expected body: { url: string } — the page to fetch and audit.
router.post('/', async (req, res) => {
  const { url } = req.body || {};

  if (typeof url !== 'string' || url.trim() === '') {
    return res.status(400).json({
      success: false,
      error: { type: 'invalid_url', message: 'A non-empty "url" field is required in the request body.' },
    });
  }

  let result;
  try {
    result = await analyzeUrl(url);
  } catch (err) {
    if (err instanceof AnalyzeError) {
      const status = ERROR_STATUS_BY_TYPE[err.type] || 500;
      return res.status(status).json({
        success: false,
        error: { type: err.type, message: err.message },
      });
    }

    // Anything that isn't our own typed error is unexpected — log it for
    // debugging but never forward its stack trace/message to the client.
    console.error('Unexpected error in POST /api/audit:', err);
    return res.status(500).json({
      success: false,
      error: { type: 'internal_error', message: 'Something went wrong while analyzing the URL.' },
    });
  }

  // analyzeUrl() represents "non-HTML content" as a *successful* return value
  // (see analyzeHtml.js) rather than a thrown error, so it's translated to a
  // 422 here rather than in the catch block above.
  if (result.isHtml === false) {
    return res.status(422).json({
      success: false,
      error: {
        type: 'non_html',
        message: `The response from ${result.url} was "${result.contentType || 'unknown'}", not HTML, so it can't be audited.`,
      },
    });
  }

  res.json({ success: true, data: result });
});

module.exports = router;
