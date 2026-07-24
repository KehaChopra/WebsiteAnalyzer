// Tests for analyzeUrl(). node-fetch is mocked throughout — no real network
// calls are made — so these run fast and deterministically in CI.

jest.mock('node-fetch');
const fetch = require('node-fetch');
const { analyzeUrl, AnalyzeError } = require('./analyzeHtml');

// Builds a minimal fake node-fetch Response — analyzeUrl only ever touches
// .ok, .status, .statusText, .headers.get(), and .text(), so that's all
// this needs to provide.
function mockResponse({ ok = true, status = 200, statusText = 'OK', contentType = 'text/html', body = '' } = {}) {
  return {
    ok,
    status,
    statusText,
    headers: { get: (name) => (name.toLowerCase() === 'content-type' ? contentType : null) },
    text: async () => body,
  };
}

describe('analyzeUrl', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('happy path: extracts all fields from a valid HTML response', async () => {
    const html = `
      <html>
        <head>
          <title>  Test Page  </title>
          <meta name="description" content="A test description">
        </head>
        <body>
          <h1>Heading One</h1>
          <h1>Heading Two</h1>
          <img src="a.png" alt="a">
          <img src="b.png">
          <p>Hello world this is a page</p>
        </body>
      </html>
    `;
    fetch.mockResolvedValueOnce(mockResponse({ contentType: 'text/html; charset=utf-8', body: html }));

    const result = await analyzeUrl('https://example.com');

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('https://example.com/', expect.objectContaining({ signal: expect.anything() }));

    expect(result).toEqual({
      url: 'https://example.com/',
      responseTimeMs: expect.any(Number),
      contentType: 'text/html; charset=utf-8',
      isHtml: true,
      title: 'Test Page',
      metaDescription: 'A test description',
      h1Count: 2,
      imagesMissingAlt: 1,
      wordCount: 10,
    });
  });

  test('invalid URL string throws a typed invalid_url error', async () => {
    await expect(analyzeUrl('not a url')).rejects.toBeInstanceOf(AnalyzeError);
    await expect(analyzeUrl('not a url')).rejects.toMatchObject({
      type: 'invalid_url',
    });

    // Should fail validation before ever attempting a network call.
    expect(fetch).not.toHaveBeenCalled();
  });

  test('non-HTML content-type returns a non-HTML result instead of parsing', async () => {
    fetch.mockResolvedValueOnce(mockResponse({ contentType: 'application/json' }));

    const result = await analyzeUrl('https://example.com/data.json');

    expect(result).toEqual({
      url: 'https://example.com/data.json',
      responseTimeMs: expect.any(Number),
      contentType: 'application/json',
      isHtml: false,
      message: 'non-HTML content',
    });
  });
});
