import Link from 'next/link';

async function getStats() {
  try {
    const res = await fetch('http://localhost:3001/api/v1/mosques/stats', { next: { revalidate: 60 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.data;
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const stats = await getStats();
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 50%, #f0f9ff 100%)' }}>
      <nav style={{ padding: '20px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 28 }}>🕌</span>
          <span style={{ fontSize: 22, fontWeight: 700, color: '#111' }}>Mosque Platform</span>
        </div>
        <Link href="/mosques" style={{ padding: '10px 24px', background: '#10b981', color: '#fff', borderRadius: 10, textDecoration: 'none', fontWeight: 600, fontSize: 15 }}>
          Find a Mosque
        </Link>
      </nav>

      <div style={{ textAlign: 'center', padding: '80px 24px 60px', maxWidth: 800, margin: '0 auto' }}>
        <h1 style={{ fontSize: 56, fontWeight: 800, color: '#111', margin: '0 0 20px', lineHeight: 1.1 }}>
          The Global Mosque Directory
        </h1>
        <p style={{ fontSize: 20, color: '#4b5563', margin: '0 0 40px', lineHeight: 1.6 }}>
          Find mosques anywhere in the world. Prayer times, directions, facilities — all in one place.
        </p>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/mosques" style={{ padding: '16px 40px', background: '#10b981', color: '#fff', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 18, boxShadow: '0 4px 20px rgba(16,185,129,0.3)' }}>
            Search Mosques
          </Link>
          <Link href="/mosques" style={{ padding: '16px 40px', background: '#fff', color: '#111', borderRadius: 12, textDecoration: 'none', fontWeight: 700, fontSize: 18, border: '2px solid #e5e7eb' }}>
            Add a Mosque
          </Link>
        </div>
      </div>

      {stats && (
        <div style={{ maxWidth: 700, margin: '0 auto', padding: '0 24px 60px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
            {[
              { label: 'Mosques', value: stats.total.toLocaleString(), icon: '🕌' },
              { label: 'Countries', value: Object.keys(stats.byCountry).length, icon: '🌍' },
              { label: 'Community', value: 'Open data', icon: '🤝' },
            ].map((stat: any) => (
              <div key={stat.label} style={{ background: '#fff', borderRadius: 16, padding: 24, textAlign: 'center', border: '1px solid #e5e7eb' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{stat.icon}</div>
                <div style={{ fontSize: 32, fontWeight: 700, color: '#10b981' }}>{stat.value}</div>
                <div style={{ fontSize: 14, color: '#6b7280', marginTop: 4 }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
