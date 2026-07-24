// Controlled form: just the URL input + submit button. All state and the
// actual fetch() call live in App.jsx — this component only renders and
// reports user input upward via props.
function AuditForm({ url, onUrlChange, onSubmit, loading }) {
  return (
    <form className="audit-form" onSubmit={onSubmit}>
      <input
        type="url"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        placeholder="https://example.com"
        required
        disabled={loading}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Auditing…' : 'Audit'}
      </button>
    </form>
  );
}

export default AuditForm;
