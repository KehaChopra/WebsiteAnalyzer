// Sanity check run at the end of `npm run build`: confirms the client build
// actually produced something server/index.js can serve, so a broken/empty
// build fails fast in CI/deploy instead of surfacing as a 404 in production.
const fs = require('fs');
const path = require('path');

const indexHtmlPath = path.join(__dirname, '..', 'client', 'dist', 'index.html');

if (!fs.existsSync(indexHtmlPath)) {
  console.error(`Build check failed: ${indexHtmlPath} does not exist.`);
  console.error('The client build did not produce an index.html for the server to serve.');
  process.exit(1);
}

console.log(`Build check passed: ${indexHtmlPath} exists and is ready to be served.`);
