// Page Pulse frontend — plain JS, no framework, no build step.

const form = document.getElementById('audit-form');
const resultsEl = document.getElementById('results');

form.addEventListener('submit', async (event) => {
  event.preventDefault();

  // TODO:
  // 1. Read the URL value from the form input.
  // 2. POST it to /api/audit as { url } via fetch().
  // 3. Handle the loading state (e.g. disable the button, show a spinner).
  // 4. Render the returned audit results into #results.
  // 5. Handle/display errors (bad URL, server error, etc.).
});

// TODO: renderResults(data) — takes the audit JSON and builds DOM nodes in #results.
