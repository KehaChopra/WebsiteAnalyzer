// Renders a successful /api/audit result. Purely presentational — takes the
// `data` object straight off the API response and lays it out as a grid of
// stats, no logic of its own.
function ReportCard({ data }) {
  const {
    url,
    title,
    metaDescription,
    responseTimeMs,
    h1Count,
    imagesMissingAlt,
    wordCount,
  } = data;

  return (
    <section className="report-card">
      <h2>Audit Results</h2>
      <p className="report-url">{url}</p>

      <dl className="report-grid">
        <div className="report-item">
          <dt>Title</dt>
          <dd>{title || <em>None found</em>}</dd>
        </div>

        <div className="report-item">
          <dt>Meta Description</dt>
          <dd>{metaDescription || <em>None found</em>}</dd>
        </div>

        <div className="report-item">
          <dt>Response Time</dt>
          <dd>{responseTimeMs} ms</dd>
        </div>

        <div className="report-item">
          <dt>H1 Tags</dt>
          <dd>{h1Count}</dd>
        </div>

        <div className="report-item">
          <dt>Images Missing Alt</dt>
          <dd>{imagesMissingAlt}</dd>
        </div>

        <div className="report-item">
          <dt>Word Count</dt>
          <dd>{wordCount}</dd>
        </div>
      </dl>
    </section>
  );
}

export default ReportCard;
