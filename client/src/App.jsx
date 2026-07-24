import { useState } from 'react';
import AuditForm from './AuditForm.jsx';
import ReportCard from './ReportCard.jsx';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const body = await response.json();

      if (!response.ok || !body.success) {
        // Surface the server's own message (e.g. "not a valid URL", "timed
        // out after 8000ms") instead of a generic fallback.
        throw new Error(body?.error?.message || 'Audit failed.');
      }

      setResult(body.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="app">
      <header>
        <h1>Page Pulse</h1>
        <p className="tagline">Quick SEO &amp; accessibility snapshot for any page.</p>
      </header>

      <main>
        <AuditForm url={url} onUrlChange={setUrl} onSubmit={handleSubmit} loading={loading} />

        {loading && <p className="loading-indicator">Analyzing page…</p>}

        {error && <p className="error-message">{error}</p>}

        {result && <ReportCard data={result} />}
      </main>

      <footer>
        Built for{' '}
        <a href="https://digitalheroesco.com" target="_blank" rel="noopener noreferrer">
          Digital Heroes Training Task
        </a>
      </footer>
    </div>
  );
}

export default App;
