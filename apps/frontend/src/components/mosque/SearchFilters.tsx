'use client';
import { useState } from 'react';
import type { SearchFilters } from '@/lib/api';

const DENOMINATIONS = ['', 'sunni', 'shia', 'sufi', 'ahmadiyya', 'ibadi', 'other'];

interface Props {
  filters: SearchFilters;
  onChange: (filters: SearchFilters) => void;
  total: number;
  loading: boolean;
}

export function SearchFiltersBar({ filters, onChange, total, loading }: Props) {
  const [localQuery, setLocalQuery] = useState(filters.query ?? '');

  const handleSearch = () => {
    onChange({ ...filters, query: localQuery, page: 1 });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 24 }}>
      {/* Main search bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 18 }}>🔍</span>
          <input
            value={localQuery}
            onChange={e => setLocalQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search by name, city or country..."
            style={{
              width: '100%',
              padding: '12px 16px 12px 44px',
              border: '1.5px solid #e5e7eb',
              borderRadius: 10,
              fontSize: 15,
              outline: 'none',
              boxSizing: 'border-box',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => (e.target.style.borderColor = '#10b981')}
            onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={loading}
          style={{
            padding: '12px 28px',
            background: '#10b981',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            whiteSpace: 'nowrap',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => { if (!loading) (e.currentTarget.style.background = '#059669'); }}
          onMouseLeave={e => { (e.currentTarget.style.background = '#10b981'); }}
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={filters.city ?? ''}
          onChange={e => onChange({ ...filters, city: e.target.value, page: 1 })}
          placeholder="City"
          style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, width: 140 }}
        />
        <input
          value={filters.country ?? ''}
          onChange={e => onChange({ ...filters, country: e.target.value.toUpperCase(), page: 1 })}
          placeholder="Country code (GB, US...)"
          style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, width: 180 }}
          maxLength={2}
        />
        <select
          value={filters.denomination ?? ''}
          onChange={e => onChange({ ...filters, denomination: e.target.value, page: 1 })}
          style={{ padding: '8px 14px', border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 14, background: '#fff', cursor: 'pointer' }}
        >
          <option value="">All denominations</option>
          {DENOMINATIONS.slice(1).map(d => (
            <option key={d} value={d} style={{ textTransform: 'capitalize' }}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
          ))}
        </select>

        {/* Clear filters */}
        {(filters.query || filters.city || filters.country || filters.denomination) && (
          <button
            onClick={() => { setLocalQuery(''); onChange({ page: 1, limit: 20 }); }}
            style={{ padding: '8px 14px', border: '1px solid #fca5a5', borderRadius: 8, fontSize: 13, color: '#ef4444', background: '#fff9f9', cursor: 'pointer' }}
          >
            Clear filters
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#6b7280' }}>
          {loading ? 'Loading...' : `${total.toLocaleString()} mosque${total !== 1 ? 's' : ''} found`}
        </span>
      </div>
    </div>
  );
}
