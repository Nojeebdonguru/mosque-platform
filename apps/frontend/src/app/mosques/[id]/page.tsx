import { getMosque } from '@/lib/api';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function MosqueDetailPage({ params }: { params: { id: string } }) {
  let mosque;
  try {
    const res = await getMosque(params.id);
    mosque = res.data;
  } catch {
    notFound();
  }

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mosque.coordinates.lat},${mosque.coordinates.lng}`;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <Link href="/mosques" style={{ color: '#10b981', textDecoration: 'none', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 24 }}>
        ← Back to search
      </Link>

      <div style={{ background: '#fff', borderRadius: 16, padding: 32, border: '1px solid #e5e7eb', marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 4px', color: '#111' }}>{mosque.name.primary}</h1>
            {mosque.name.arabic && (
              <p style={{ fontSize: 20, color: '#6b7280', margin: 0, direction: 'rtl', fontFamily: 'serif' }}>{mosque.name.arabic}</p>
            )}
          </div>
          <span style={{ background: '#d1fae5', color: '#065f46', fontSize: 13, fontWeight: 600, padding: '6px 14px', borderRadius: 100, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
            {mosque.denomination}
          </span>
        </div>
        {mosque.description && (
          <p style={{ fontSize: 15, color: '#4b5563', lineHeight: 1.7, margin: '16px 0 0' }}>{mosque.description}</p>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Address</h3>
          <p style={{ margin: 0, fontSize: 15, color: '#111', lineHeight: 1.6 }}>
            {mosque.address.street && <>{mosque.address.street}<br /></>}
            {mosque.address.city}<br />
            {mosque.address.country}
          </p>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 12, color: '#10b981', fontSize: 13, textDecoration: 'none' }}>
            Open in Google Maps →
          </a>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Contact</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {mosque.contact.phone
              ? <a href={`tel:${mosque.contact.phone}`} style={{ color: '#111', fontSize: 14, textDecoration: 'none' }}>📞 {mosque.contact.phone}</a>
              : <span style={{ fontSize: 14, color: '#9ca3af' }}>No phone listed</span>}
            {mosque.contact.email
              ? <a href={`mailto:${mosque.contact.email}`} style={{ color: '#10b981', fontSize: 14 }}>✉️ {mosque.contact.email}</a>
              : <span style={{ fontSize: 14, color: '#9ca3af' }}>No email listed</span>}
            {mosque.contact.website
              ? <a href={mosque.contact.website} target="_blank" rel="noopener noreferrer" style={{ color: '#10b981', fontSize: 14 }}>🌐 Website</a>
              : <span style={{ fontSize: 14, color: '#9ca3af' }}>No website listed</span>}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Details</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, color: '#374151' }}>
            <div><span style={{ color: '#6b7280' }}>Capacity:</span> {mosque.capacity ? mosque.capacity.toLocaleString() + ' worshippers' : 'Unknown'}</div>
            <div><span style={{ color: '#6b7280' }}>Languages:</span> {mosque.languages.length > 0 ? mosque.languages.join(', ') : 'Not listed'}</div>
            <div><span style={{ color: '#6b7280' }}>Source:</span> <span style={{ textTransform: 'capitalize' }}>{mosque.dataSource.replace(/_/g, ' ')}</span></div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 12px' }}>Facilities</h3>
          {mosque.facilities.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {mosque.facilities.map((f: string) => (
                <span key={f} style={{ background: '#f0fdf4', color: '#065f46', fontSize: 12, padding: '4px 10px', borderRadius: 100, textTransform: 'capitalize' }}>
                  {f.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: '#9ca3af' }}>No facilities listed</p>
          )}
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        <iframe
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${mosque.coordinates.lng - 0.01},${mosque.coordinates.lat - 0.01},${mosque.coordinates.lng + 0.01},${mosque.coordinates.lat + 0.01}&layer=mapnik&marker=${mosque.coordinates.lat},${mosque.coordinates.lng}`}
          width="100%"
          height="300"
          style={{ border: 'none', display: 'block' }}
          title="Mosque location"
        />
      </div>
    </div>
  );
}
