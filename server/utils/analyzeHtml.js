// Pure HTML analysis logic — NO Express, NO req/res.
// analyzeHtml() is a pure function (string in, object out) so it's trivial to unit
// test with static HTML fixtures. analyzeUrl() is the impure orchestrator that
// handles the network side (fetch, timeout, content-type) and then *delegates*
// parsing to analyzeHtml(), keeping the two concerns testable independently.

const cheerio = require('cheerio');
const fetch = require('node-fetch');

const FETCH_TIMEOUT_MS = 8000;

/**
 * Custom error type for analyzeUrl() failures.
 *
 * We throw a real Error subclass (not a plain `{ type, message }` object literal)
 * because:
 *   - it preserves a stack trace, which a plain object would lose — useful for
 *     debugging when this bubbles up through the route handler.
 *   - `instanceof AnalyzeError` lets callers distinguish "expected, typed"
 *     failures from truly unexpected bugs, while `.type` still gives them a
 *     simple string to switch on for HTTP status mapping (invalid_url -> 400,
 *     timeout -> 504, etc.) without parsing the message.
 *
 * `type` is intentionally not a closed enum in code (just documented below) —
 * new categories (e.g. 'parse_failed') can be added without touching a shared
 * constants file.
 *
 * @property {'invalid_url'|'timeout'|'unreachable'|'fetch_failed'|'parse_failed'} type
 * @property {string} message
 */
class AnalyzeError extends Error {
  constructor(type, message) {
    super(message);
    this.name = 'AnalyzeError';
    this.type = type;
  }
}

/**
 * Analyze raw HTML and return audit findings.
 * Pure: never touches the network, never throws for malformed markup — cheerio's
 * parser (built on parse5/htmlparser2) is error-tolerant by design, and every
 * field below has a safe fallback, so worst case you get nulls/zeros back
 * instead of a crash.
 *
 * @param {string} html - Raw HTML markup to analyze.
 * @returns {{title: string|null, metaDescription: string|null, h1Count: number, imagesMissingAlt: number, wordCount: number}}
 */
function analyzeHtml(html) {
  const $ = cheerio.load(typeof html === 'string' ? html : '');

  // Strip script/style content before computing word count so inline JS/CSS
  // text doesn't get counted as "words" on the page.
  $('script, style').remove();

  const title = $('title').first().text().trim() || null;

  const metaDescriptionRaw = $('meta[name="description"]').attr('content');
  const metaDescription = typeof metaDescriptionRaw === 'string' ? metaDescriptionRaw.trim() : null;

  const h1Count = $('h1').length;

  // "Missing an alt attribute" means the attribute is absent entirely
  // (attr() === undefined) — an img with alt="" is still explicitly marked
  // decorative and is not counted as missing here.
  let imagesMissingAlt = 0;
  $('img').each((_, el) => {
    if ($(el).attr('alt') === undefined) {
      imagesMissingAlt += 1;
    }
  });

  const bodyText = $('body').text();
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  return { title, metaDescription, h1Count, imagesMissingAlt, wordCount };
}

/**
 * Fetch a URL and run the full Page Pulse audit against it.
 *
 * @param {string} url
 * @returns {Promise<object>} Audit result, or a "non-HTML content" result
 *   (never both a throw and a resolved value for the same failure mode).
 * @throws {AnalyzeError} typed failure — invalid_url | timeout | unreachable | fetch_failed | parse_failed
 */
async function analyzeUrl(url) {
  // --- 1. Validate the URL up front -----------------------------------------
  // `new URL()` throws a generic TypeError with a not-very-actionable message
  // ("Invalid URL") and no indication of *why* to the caller. We catch that
  // and re-throw our own typed error instead of letting it crash uncaught.
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (err) {
    throw new AnalyzeError('invalid_url', `"${url}" is not a valid URL.`);
  }

  // Reject non-http(s) protocols (file:, ftp:, javascript:, etc.) explicitly —
  // `new URL()` happily parses those, but fetch() has no business following them.
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new AnalyzeError(
      'invalid_url',
      `Unsupported protocol "${parsedUrl.protocol}" — only http and https URLs can be audited.`
    );
  }

  // --- 2/3. Fetch with an abort timeout, measuring response time ------------
  // AbortController is how you time-box a fetch(); without it a hung server
  // would leave the request (and this promise) pending indefinitely.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  const startTime = Date.now();
  let response;
  try {
    response = await fetch(parsedUrl.href, { signal: controller.signal });
  } catch (err) {
    // node-fetch rejects with an AbortError (name check, not instanceof —
    // works across the DOMException/Error implementations different Node
    // versions use) when the controller fires.
    if (err.name === 'AbortError') {
      throw new AnalyzeError('timeout', `Request to ${parsedUrl.href} timed out after ${FETCH_TIMEOUT_MS}ms.`);
    }

    // Anything else thrown by fetch() itself (as opposed to a resolved
    // response with a bad status) means the request never made it to a
    // server at all — DNS lookup failure, connection refused/reset, TLS
    // handshake failure, etc. node-fetch (and native fetch) often nest the
    // real system error under `.cause` rather than putting it directly on
    // the caught error, so we check both when looking for a code — relying
    // on `err.message` alone would miss cases where the useful part (e.g.
    // `ENOTFOUND`) only shows up on `err.cause.code`.
    const errorCode = err.code || (err.cause && err.cause.code);
    console.error(
      `analyzeUrl: network failure reaching ${parsedUrl.href}${errorCode ? ` (${errorCode})` : ''}:`,
      err
    );

    // Deliberately a fixed, friendly message — never err.message or the
    // error code — so internal Node/DNS error text never reaches the client.
    throw new AnalyzeError('unreachable', 'Could not reach that URL. Please check the domain and try again.');
  } finally {
    // Always clear the timer, on both success and failure paths, so it can't
    // fire after the fact and so the event loop isn't held open needlessly.
    clearTimeout(timeoutId);
  }
  const responseTimeMs = Date.now() - startTime;

  if (!response.ok) {
    throw new AnalyzeError(
      'fetch_failed',
      `Received HTTP ${response.status} ${response.statusText} from ${parsedUrl.href}.`
    );
  }

  // --- 4. Content-Type gate ---------------------------------------------------
  // Non-HTML responses (JSON APIs, images, PDFs...) aren't a *failure* of the
  // audit — they're a valid, expected outcome — so this returns a normal
  // result object rather than throwing.
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/html')) {
    return {
      url: parsedUrl.href,
      responseTimeMs,
      contentType,
      isHtml: false,
      message: 'non-HTML content',
    };
  }

  // --- 5. Read the body defensively ------------------------------------------
  let html;
  try {
    html = await response.text();
  } catch (err) {
    throw new AnalyzeError('fetch_failed', `Failed to read response body from ${parsedUrl.href}: ${err.message}`);
  }

  // Delegate parsing to the pure function. Wrapped in try/catch so that even
  // if cheerio ever chokes on something bizarre, the caller gets a typed
  // AnalyzeError instead of an arbitrary uncaught exception.
  let extracted;
  try {
    extracted = analyzeHtml(html);
  } catch (err) {
    throw new AnalyzeError('parse_failed', `Failed to parse HTML from ${parsedUrl.href}: ${err.message}`);
  }

  // --- 6. Assemble the final result -------------------------------------------
  return {
    url: parsedUrl.href,
    responseTimeMs,
    contentType,
    isHtml: true,
    ...extracted,
  };
}

module.exports = { analyzeHtml, analyzeUrl, AnalyzeError };
