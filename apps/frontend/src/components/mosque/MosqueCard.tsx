'use client';
import Link from 'next/link';
import type { Mosque } from '@/lib/api';

const DENOMINATION_COLORS: Record<string, string> = {
  sunni:      '#10b981',
  shia:       '#6366f1',
  sufi:       '#f59e0b',
  ahmadiyya:  '#ec4899',
  ibadi:      '#14b8a6',
  other:      '#6b7280',
};

export function MosqueCard({ mosque }: { mosque: Mosque }) {
  const color = DENOMINATION_COLORS[mosque.denomination] ?? '#6b7280';

  return (
    <Link href={`/mosques/${mosque.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div style={{
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12,
        padding: '20px',
        cursor: 'pointer',
        transition: 'box-shadow 0.15s, transform 0.15s',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.1)';
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
          (e.currentTarget as HTMLDivElement).style.transform = 'none';
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0, lineHeight: 1.3, color: '#111' }}>
            {mosque.name.primary}
          </h3>
          <span style={{
            background: color + '20',
            color,
            fontSize: 11,
            fontWeight: 600,
            padding: '3px 8px',
            borderRadius: 100,
            whiteSpace: 'nowrap',
            textTransform: 'capitalize',
            flexShrink: 0,
          }}>
            {mosque.denomination}
          </span>
        </div>

        {/* Arabic name */}
        {mosque.name.arabic && (
          <p style={{ fontSize: 14, color: '#6b7280', margin: 0, direction: 'rtl', fontFamily: 'serif' }}>
            {mosque.name.arabic}
          </p>
        )}

        {/* Address */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6b7280', fontSize: 13 }}>
          <span>📍</span>
          <span>{mosque.address.formatted}</span>
        </div>

        {/* Distance */}
        {mosque.distanceKm !== undefined && (
          <div style={{ fontSize: 13, color: '#10b981', fontWeight: 500 }}>
            {mosque.distanceKm.toFixed(1)} km away
          </div>
        )}

        {/* Description */}
        {mosque.description && (
          <p style={{
            fontSize: 13,
            color: '#4b5563',
            margin: 0,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.5,
          }}>
            {mosque.description}
          </p>
        )}

        {/* Facilities */}
        {mosque.facilities.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
            {mosque.facilities.slice(0, 3).map(f => (
              <span key={f} style={{
                background: '#f3f4f6',
                color: '#374151',
                fontSize: 11,
                padding: '2px 8px',
                borderRadius: 100,
                textTransform: 'capitalize',
              }}>
                {f.replace(/_/g, ' ')}
              </span>
            ))}
            {mosque.facilities.length > 3 && (
              <span style={{ fontSize: 11, color: '#9ca3af' }}>+{mosque.facilities.length - 3} more</span>
            )}
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9ca3af' }}>
          <span>{mosque.capacity ? `Capacity: ${mosque.capacity.toLocaleString()}` : 'Capacity unknown'}</span>
          <span style={{ color: '#10b981' }}>View details →</span>
        </div>
      </div>
    </Link>
  );
}
