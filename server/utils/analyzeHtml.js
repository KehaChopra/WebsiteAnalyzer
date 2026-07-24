// Pure HTML analysis logic — NO Express, NO req/res, NO network calls.
// Takes an HTML string in, returns a plain audit result object out.
// Keeping this pure makes it trivial to unit test in isolation (e.g. with Jest/Vitest)
// by feeding it HTML fixtures and asserting on the returned object.

// const cheerio = require('cheerio'); // TODO: use to parse the HTML string into a queryable DOM

/**
 * Analyze raw HTML and return audit findings.
 * @param {string} html - Raw HTML markup to analyze.
 * @returns {object} Audit result (shape TBD — e.g. { seo: {...}, performance: {...}, accessibility: {...} }).
 */
function analyzeHtml(html) {
  // TODO:
  // 1. Load `html` into cheerio: const $ = cheerio.load(html);
  // 2. Run individual checks (title tag, meta description, image alt text,
  //    heading structure, etc.) against $.
  // 3. Aggregate checks into a single results object.
  // 4. Return the results object — do not touch req/res/network here.

  throw new Error('analyzeHtml: not implemented yet');
}

module.exports = { analyzeHtml };
