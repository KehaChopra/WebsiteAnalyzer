// Pure client-side validation for the audit form's URL input. Mirrors the
// checks the server does in analyzeUrl() (empty, unparseable, wrong
// protocol) so obviously-bad input is rejected instantly instead of round
// tripping to the server just to get the same answer back.
//
// Returns null when the URL is valid, or a human-readable message when it
// isn't — callers render that message through the app's normal error UI, so
// every validation failure (empty field, malformed URL, missing protocol...)
// looks and feels identical to a server-side audit error.
export function validateUrl(url) {
  const trimmed = (url || '').trim();

  if (!trimmed) {
    return 'Please enter a URL to audit.';
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return 'That doesn\'t look like a valid URL. Check for typos or a missing "https://".';
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return `Only http and https URLs can be audited (got "${parsed.protocol}").`;
  }

  return null;
}
