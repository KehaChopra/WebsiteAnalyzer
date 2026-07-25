# Page Pulse
Live:https://pagepulse-mdqb.onrender.com/
A small tool that fetches a web page and reports a quick audit: title, meta
description, response time, heading structure, missing image alt text, and
approximate word count.

- **Server**: Node.js + Express (`server/`)
- **Client**: React + Vite (`client/`)
- **Analysis**: `cheerio` for HTML parsing, `node-fetch` for fetching pages

## Setup

```bash
git clone <this-repo-url>
cd digitalheroes
npm install
```

Copy the env file and adjust if needed (currently just the port):

```bash
cp .env.example .env
```

### Run it (production-style, one server)

This is how it actually runs in prod: Express serves the built React app and
the API from the same origin.

```bash
npm run build   # builds client/dist and verifies it exists
npm start        # serves the API + client/dist on http://localhost:3000
```

### Run it (development, hot reload)

Two terminals — the server and the Vite dev server run separately, and Vite
proxies `/api` to Express so there's no CORS to deal with.

```bash
# terminal 1
npm run dev              # nodemon-style watch on server/index.js, :3000

# terminal 2
cd client
npm install
npm run dev               # Vite dev server with HMR, :5173
```

Open `http://localhost:5173` while developing. Open `http://localhost:3000`
to hit the production build.

### Tests

```bash
npm test
```

## API Contract

### `POST /api/audit`

**Request body:**

```json
{
  "url": "https://example.com"
}
```

**Success response — `200`:**

```json
{
  "success": true,
  "data": {
    "url": "https://example.com/",
    "responseTimeMs": 226,
    "contentType": "text/html; charset=utf-8",
    "isHtml": true,
    "title": "Example Domain",
    "metaDescription": null,
    "h1Count": 1,
    "imagesMissingAlt": 0,
    "wordCount": 17
  }
}
```

**Error response shape** (always the same envelope, status code varies):

```json
{
  "success": false,
  "error": {
    "type": "invalid_url",
    "message": "\"not a url\" is not a valid URL."
  }
}
```

| `error.type`    | HTTP status | Meaning                                                       |
| --------------- | ----------- | -------------------------------------------------------------- |
| `invalid_url`   | 400         | The `url` field is missing, empty, or not a parseable http(s) URL |
| `non_html`      | 422         | The page fetched fine, but the response wasn't HTML             |
| `timeout`       | 504         | The target page didn't respond within 8 seconds                 |
| `fetch_failed`  | 502         | DNS failure, connection refused, non-2xx response, etc.         |
| `parse_failed`  | 502         | The HTML was fetched but something went wrong parsing it (rare) |
| `internal_error`| 500         | Anything unexpected — the server never leaks a raw stack trace  |

Example — non-HTML content:

```json
{
  "success": false,
  "error": {
    "type": "non_html",
    "message": "The response from https://example.com/data.json was \"application/json\", not HTML, so it can't be audited."
  }
}
```

Example — timeout:

```json
{
  "success": false,
  "error": {
    "type": "timeout",
    "message": "Request to https://example.com/ timed out after 8000ms."
  }
}
```

## Design Decisions

A few choices in here weren't obvious defaults, so here's the actual
reasoning behind them:

**Why an `AbortController` timeout instead of just letting `fetch` run.**
This tool fetches *arbitrary* URLs that someone types in — I have no control
over how fast (or whether) the target server responds. Without a timeout,
one slow or hanging page ties up a request indefinitely, and since this is
a synchronous request/response flow (the user is sitting there waiting for
a result, not polling a job), an unbounded wait is a worse experience than
a clear failure. I picked 8 seconds specifically as a middle ground: long
enough to cover a normal page load including a slightly slow server, short
enough that a user isn't staring at a spinner wondering if the app is
broken. If this became a background job/queue system instead of a
request-response API, I'd probably relax or remove the timeout — but for
"paste a URL, wait, get a result," 8s felt like the right failure point.

**Why I check `Content-Type` before parsing anything.** Early on I
realized someone could paste a link to a JSON endpoint, an image, or a PDF,
and the naive version of this tool would happily hand raw bytes to cheerio
and either crash or silently produce a nonsense "audit" (empty title, zero
h1s, weird word count) with no indication *why* it's empty. Checking
`Content-Type` first is basically free — it's a header I already have from
the fetch, no extra request — and it lets me short-circuit before doing any
real work. It also changes how I model the failure: "this isn't an HTML
page" isn't really an *error* in the audit sense, it's a valid outcome of
auditing a URL, which is why it's a distinct `non_html` result (422) rather
than lumped in with `fetch_failed`.

**Why word count is approximate, not exact.** "Exact" word counting is a
much bigger problem than it sounds like once you get past English text with
normal spacing — hyphenated compounds, CJK text with no spaces between
words at all, numbers and punctuation-heavy content all make a "real" word
count ambiguous without pulling in a locale-aware text segmentation
library. That's a lot of weight for what this number is actually used for:
a rough signal of whether a page has substantial content or is thin/empty.
So I strip `<script>`/`<style>` content (so inline JS/CSS doesn't get
counted as "words"), take the visible text, and split on whitespace. It's
not going to match what Word would report, but it doesn't need to — it
just needs to tell the difference between a page with 20 words and a page
with 2,000.

## AI Usage

I used Claude Code to scaffold the Express backend, the cheerio-based HTML parsing logic, and the React frontend, working through it in phases rather than generating everything in one pass so I could review and test each part before moving on. During testing, I found two real issues the initial code didn't handle. First, when a URL's domain didn't resolve (e.g. a nonexistent domain), the raw Node.js ENOTFOUND error was leaking straight through to the API response instead of being caught as a proper error — I traced it to the catch block only handling AbortError for timeouts and missed the general network-failure case, so I had it add explicit handling for DNS/connection failures, checking error.cause since fetch nests the actual reason there, and mapping it to a clean typed error with a 502 status. Second, I noticed the frontend was showing two different-looking validation messages for what was really the same category of error — an empty field triggered the browser's native HTML5 validation popup, while other invalid input triggered my own custom message, so I removed the required attribute and routed all validation through one consistent component. I also independently tested the API directly with curl/PowerShell (bypassing the React form entirely) to confirm the server rejects bad input on its own, not just via frontend checks. Design decisions like the AbortController timeout value and how non-HTML content types are handled were my own calls, explained in the Design Decisions section above
