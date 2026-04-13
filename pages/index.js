import { useState } from 'react';
import Head from 'next/head';

const STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

export default function Home() {
  const [form, setForm] = useState({ address: '', name: '', zip: '', state: '', type: 'all' });
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cases, setCases] = useState([]);
  const [noteInput, setNoteInput] = useState({});

  const handleChange = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleSearch = async e => {
    e.preventDefault();
    setError('');
    setResults(null);
    setLoading(true);

    try {
      const params = new URLSearchParams();
      if (form.address) params.set('address', form.address + (form.state ? ` ${form.state}` : ''));
      if (form.name) params.set('name', form.name);
      if (form.zip) params.set('zip', form.zip);
      params.set('type', form.type);

      const res = await fetch(`/api/search?${params.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Search failed.');
        setLoading(false);
        return;
      }

      setResults(data);

      // Add to case log
      const subject = form.name || form.address || form.zip || 'Unknown';
      setCases(prev => [{
        id: Date.now(),
        subject,
        searchedAt: new Date().toLocaleString(),
        status: 'Active',
        count: data.count,
        notes: '',
      }, ...prev]);
    } catch (err) {
      setError('Network error. Please try again.');
    }

    setLoading(false);
  };

  const updateCaseStatus = (id, status) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, status } : c));
  };

  const saveNote = (id) => {
    setCases(prev => prev.map(c => c.id === id ? { ...c, notes: noteInput[id] || '' } : c));
    setNoteInput(n => ({ ...n, [id]: '' }));
  };

  const statusColor = s => s === 'Located' ? '#22c55e' : s === 'Closed' ? '#6b7280' : '#C9A84C';

  return (
    <>
      <Head>
        <title>BondSAI — Property & Public Record Search</title>
        <meta name="description" content="Professional bail bond property search system" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <div style={styles.page}>
        {/* Header */}
        <header style={styles.header}>
          <div style={styles.headerInner}>
            <div>
              <h1 style={styles.logo}>BOND<span style={{ color: '#C9A84C' }}>SAI</span></h1>
              <p style={styles.tagline}>Verified Property & Public Record Intelligence</p>
            </div>
            <div style={styles.badge}>LIVE DATA</div>
          </div>
        </header>

        <main style={styles.main}>
          {/* Search Form */}
          <section style={styles.card}>
            <h2 style={styles.sectionTitle}>Search Subject</h2>
            <form onSubmit={handleSearch}>
              <div style={styles.grid2}>
                <div style={styles.field}>
                  <label style={styles.label}>Owner / Subject Name</label>
                  <input
                    style={styles.input}
                    type="text"
                    name="name"
                    placeholder="Last, First or Full Name"
                    value={form.name}
                    onChange={handleChange}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>Last Known Address</label>
                  <input
                    style={styles.input}
                    type="text"
                    name="address"
                    placeholder="123 Main St"
                    value={form.address}
                    onChange={handleChange}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>ZIP Code</label>
                  <input
                    style={styles.input}
                    type="text"
                    name="zip"
                    placeholder="33301"
                    maxLength={5}
                    value={form.zip}
                    onChange={handleChange}
                  />
                </div>
                <div style={styles.field}>
                  <label style={styles.label}>State</label>
                  <select style={styles.input} name="state" value={form.state} onChange={handleChange}>
                    <option value="">-- Select State --</option>
                    {STATES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
                <button type="submit" style={styles.btn} disabled={loading}>
                  {loading ? 'Searching...' : '🔍 Search Property Records'}
                </button>
                <button type="button" style={styles.btnOutline}
                  onClick={() => { setForm({ address:'',name:'',zip:'',state:'',type:'all' }); setResults(null); setError(''); }}>
                  Clear
                </button>
              </div>
            </form>
          </section>

          {/* Error */}
          {error && (
            <div style={styles.errorBox}>⚠ {error}</div>
          )}

          {/* Loading */}
          {loading && (
            <div style={styles.loadingBox}>
              <div style={styles.spinner} />
              <span style={{ color: '#C9A84C', marginLeft: 12 }}>Querying verified data sources...</span>
            </div>
          )}

          {/* Results */}
          {results && !loading && (
            <section style={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                <h2 style={styles.sectionTitle}>
                  Results <span style={{ color: '#C9A84C' }}>({results.count})</span>
                </h2>
                {results.count === 0 && (
                  <span style={{ color: '#6b7280', fontSize: 14 }}>No verified data found for this query.</span>
                )}
              </div>

              {results.sourceErrors?.map((e, i) => (
                <div key={i} style={styles.warnBox}>⚡ {e.source} unavailable: {e.error}</div>
              ))}

              <div style={styles.resultsGrid}>
                {results.results.map((r, i) => (
                  <ResultCard key={i} result={r} />
                ))}
              </div>
            </section>
          )}

          {/* Case Log */}
          {cases.length > 0 && (
            <section style={styles.card}>
              <h2 style={styles.sectionTitle}>Case Log <span style={{ color: '#6b7280', fontSize: 14, fontWeight: 400 }}>(this session)</span></h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      {['Subject', 'Searched', 'Hits', 'Status', 'Notes', ''].map(h => (
                        <th key={h} style={styles.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {cases.map(c => (
                      <tr key={c.id} style={styles.tr}>
                        <td style={styles.td}>{c.subject}</td>
                        <td style={styles.td}>{c.searchedAt}</td>
                        <td style={styles.td}>{c.count}</td>
                        <td style={styles.td}>
                          <select
                            style={{ ...styles.inputSm, color: statusColor(c.status), background: '#0d1f35', border: `1px solid ${statusColor(c.status)}` }}
                            value={c.status}
                            onChange={e => updateCaseStatus(c.id, e.target.value)}>
                            <option>Active</option>
                            <option>Located</option>
                            <option>Closed</option>
                          </select>
                        </td>
                        <td style={styles.td}>
                          <input
                            style={styles.inputSm}
                            placeholder="Add note..."
                            value={noteInput[c.id] || c.notes || ''}
                            onChange={e => setNoteInput(n => ({ ...n, [c.id]: e.target.value }))}
                          />
                        </td>
                        <td style={styles.td}>
                          <button style={styles.btnXs} onClick={() => saveNote(c.id)}>Save</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </main>

        <footer style={styles.footer}>
          <p>© {new Date().getFullYear()} BondSAI · All data sourced from verified APIs · For licensed bail bond professionals</p>
        </footer>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0A1628; font-family: 'Inter', sans-serif; }
        input::placeholder { color: #4a5568; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }
      `}</style>
    </>
  );
}

function ResultCard({ result }) {
  const fields = [
    { label: 'Owner', value: result.owner },
    { label: 'Est. Value', value: result.value },
    { label: 'Rent Estimate', value: result.rentEstimate },
    { label: 'Type', value: result.propertyType },
    { label: 'Beds / Baths', value: result.bedrooms ? `${result.bedrooms} bd / ${result.bathrooms || '?'} ba` : null },
    { label: 'Sq Ft', value: result.sqft ? `${Number(result.sqft).toLocaleString()} sqft` : null },
    { label: 'Year Built', value: result.yearBuilt },
    { label: 'Last Sale', value: result.lastSaleDate ? `${result.lastSaleDate}${result.lastSalePrice ? ` · ${result.lastSalePrice}` : ''}` : null },
  ].filter(f => f.value);

  return (
    <div style={{
      background: '#0d1f35',
      border: result.outdated ? '1px solid #7c3f00' : '1px solid #1e3a5f',
      borderRadius: 10,
      padding: 18,
      position: 'relative',
    }}>
      {result.outdated && (
        <span style={{ position: 'absolute', top: 10, right: 10, background: '#7c3f00', color: '#fbbf24', fontSize: 10, padding: '2px 6px', borderRadius: 4 }}>
          OUTDATED
        </span>
      )}
      <div style={{ color: '#C9A84C', fontWeight: 600, fontSize: 15, marginBottom: 10 }}>
        📍 {result.address}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px' }}>
        {fields.map(f => (
          <div key={f.label}>
            <span style={{ color: '#6b7280', fontSize: 11 }}>{f.label}</span>
            <div style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 500 }}>{f.value}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: '#4a5568' }}>
        Source: {result.source} · Updated: {new Date(result.last_updated).toLocaleDateString()}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: '100vh', background: '#0A1628', color: '#e2e8f0' },
  header: { background: '#0d1f35', borderBottom: '2px solid #C9A84C', padding: '16px 24px' },
  headerInner: { maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  logo: { fontSize: 28, fontWeight: 800, color: '#e2e8f0', letterSpacing: 2 },
  tagline: { color: '#6b7280', fontSize: 13, marginTop: 2 },
  badge: { background: '#C9A84C', color: '#0A1628', fontWeight: 700, fontSize: 11, padding: '4px 10px', borderRadius: 20, letterSpacing: 1 },
  main: { maxWidth: 1100, margin: '0 auto', padding: '24px 16px' },
  card: { background: '#0d1f35', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24, marginBottom: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 700, color: '#e2e8f0', marginBottom: 16 },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: '#C9A84C', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { background: '#142236', border: '1px solid #1e3a5f', borderRadius: 8, padding: '10px 12px', color: '#e2e8f0', fontSize: 14, outline: 'none', width: '100%' },
  btn: { background: '#C9A84C', color: '#0A1628', fontWeight: 700, border: 'none', borderRadius: 8, padding: '11px 24px', fontSize: 15, cursor: 'pointer', whiteSpace: 'nowrap' },
  btnOutline: { background: 'transparent', color: '#C9A84C', fontWeight: 600, border: '1px solid #C9A84C', borderRadius: 8, padding: '11px 24px', fontSize: 15, cursor: 'pointer' },
  errorBox: { background: '#2d0a0a', border: '1px solid #7f1d1d', borderRadius: 8, padding: '12px 16px', color: '#fca5a5', marginBottom: 16 },
  warnBox: { background: '#1a1200', border: '1px solid #7c3f00', borderRadius: 8, padding: '10px 14px', color: '#fbbf24', fontSize: 13, marginBottom: 12 },
  loadingBox: { display: 'flex', alignItems: 'center', padding: '20px', justifyContent: 'center' },
  spinner: { width: 24, height: 24, border: '3px solid #1e3a5f', borderTop: '3px solid #C9A84C', borderRadius: '50%', animation: 'spin 0.8s linear infinite' },
  resultsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16, marginTop: 12 },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', color: '#C9A84C', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, padding: '8px 10px', borderBottom: '1px solid #1e3a5f' },
  td: { padding: '10px 10px', borderBottom: '1px solid #0d2040', verticalAlign: 'middle' },
  tr: { transition: 'background 0.15s' },
  inputSm: { background: '#142236', border: '1px solid #1e3a5f', borderRadius: 6, padding: '6px 8px', color: '#e2e8f0', fontSize: 12, width: '100%' },
  btnXs: { background: '#1e3a5f', color: '#C9A84C', border: 'none', borderRadius: 5, padding: '5px 10px', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  footer: { textAlign: 'center', color: '#374151', fontSize: 12, padding: '20px 16px', borderTop: '1px solid #0d2040' },
};
