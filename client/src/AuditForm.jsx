// Controlled form: just the URL input + submit button. All state and the
// actual fetch() call live in App.jsx — this component only renders and
// reports user input upward via props.
function AuditForm({ url, onUrlChange, onSubmit, loading }) {
  return (
    // noValidate: all validation (empty, malformed, wrong protocol) is
    // handled ourselves in App.jsx via validateUrl() + the shared error
    // message UI, so the browser's own "please enter a URL" popup never
    // gets a chance to fire — even for type="url" values it considers
    // malformed on its own.
    <form className="audit-form" onSubmit={onSubmit} noValidate>
      <input
        type="url"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder="https://example.com"
        disabled={loading}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Auditing…' : 'Audit'}
      </button>
    </form>
  );
}

export default AuditForm;
