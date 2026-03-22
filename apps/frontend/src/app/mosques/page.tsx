'use client';
import { useState, useEffect, useCallback } from 'react';
import { searchMosques, getStats, type Mosque, type SearchFilters } from '@/lib/api';
import { MosqueCard } from '@/components/mosque/MosqueCard';
import { SearchFiltersBar } from '@/components/mosque/SearchFilters';
import Link from 'next/link';

export default function MosquesPage() {
  const [mosques, setMosques] = useState<Mosque[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<{ total: number; byCountry: Record<string, number> } | null>(null);
  const [filters, setFilters] = useState<SearchFilters>({ page: 1, limit: 20 });

  const fetchMosques = useCallback(async (f: SearchFilters) => {
    setLoading(true);
    try {
      const result = await searchMosques(f);
      setMosques(result.data);
      setTotal(result.total);
      setTotalPages(result.totalPages);
    } catch (err) {
      console.error('Search failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMosques(filters);
  }, [filters, fetchMosques]);

  useEffect(() => {
    getStats().then(r => setStats(r.data)).catch(() => {});
  }, []);

  const handleFiltersChange = (newFilters: SearchFilters) => {
    setFilters(newFilters);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '16px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 24 }}>🕌</span>
            <span style={{ fontSize: 20, fontWeight: 700, color: '#111' }}>Mosque Platform</span>
          </Link>
          {stats && (
            <div style={{ fontSize: 13, color: '#6b7280' }}>
              <span style={{ fontWeight: 600, color: '#10b981' }}>{stats.total.toLocaleString()}</span> mosques in <span style={{ fontWeight: 600, color: '#10b981' }}>{Object.keys(stats.byCountry).length}</span> countries
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* Page title */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, margin: '0 0 8px', color: '#111' }}>Find a Mosque</h1>
          <p style={{ fontSize: 16, color: '#6b7280', margin: 0 }}>Search our global database of mosques by name, location, or denomination</p>
        </div>

        {/* Search filters */}
        <SearchFiltersBar
          filters={filters}
          onChange={handleFiltersChange}
          total={total}
          loading={loading}
        />

        {/* Results grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{ background: '#fff', borderRadius: 12, padding: 20, border: '1px solid #e5e7eb', height: 180, animation: 'pulse 1.5s ease-in-out infinite' }}>
                <div style={{ background: '#f3f4f6', borderRadius: 8, height: 20, marginBottom: 12, width: '70%' }} />
                <div style={{ background: '#f3f4f6', borderRadius: 8, height: 14, marginBottom: 8, width: '50%' }} />
                <div style={{ background: '#f3f4f6', borderRadius: 8, height: 14, width: '80%' }} />
              </div>
            ))}
          </div>
        ) : mosques.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: '#fff', borderRadius: 16, border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🕌</div>
            <h3 style={{ fontSize: 20, fontWeight: 600, margin: '0 0 8px', color: '#111' }}>No mosques found</h3>
            <p style={{ color: '#6b7280', margin: '0 0 20px' }}>Try adjusting your search filters or adding a new mosque</p>
            <Link href="/" style={{
              display: 'inline-block', padding: '10px 24px',
              background: '#10b981', color: '#fff', borderRadius: 8,
              textDecoration: 'none', fontWeight: 600, fontSize: 14,
            }}>
              Add a mosque
            </Link>
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20, marginBottom: 32 }}>
              {mosques.map(mosque => (
                <MosqueCard key={mosque.id} mosque={mosque} />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                <button
                  onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) - 1 }))}
                  disabled={!filters.page || filters.page <= 1}
                  style={{
                    padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: 8,
                    background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                    opacity: (!filters.page || filters.page <= 1) ? 0.4 : 1,
                  }}
                >
                  ← Previous
                </button>
                <span style={{ padding: '10px 20px', fontSize: 14, color: '#6b7280', display: 'flex', alignItems: 'center' }}>
                  Page {filters.page ?? 1} of {totalPages}
                </span>
                <button
                  onClick={() => setFilters(f => ({ ...f, page: (f.page ?? 1) + 1 }))}
                  disabled={(filters.page ?? 1) >= totalPages}
                  style={{
                    padding: '10px 20px', border: '1px solid #e5e7eb', borderRadius: 8,
                    background: '#fff', cursor: 'pointer', fontSize: 14, fontWeight: 500,
                    opacity: (filters.page ?? 1) >= totalPages ? 0.4 : 1,
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
