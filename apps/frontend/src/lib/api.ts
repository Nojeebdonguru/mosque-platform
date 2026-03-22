const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Mosque {
  id: string;
  name: { primary: string; arabic: string | null };
  address: {
    street: string | null;
    city: string;
    country: string;
    countryCode: string;
    formatted: string;
  };
  coordinates: { lat: number; lng: number };
  denomination: string;
  status: string;
  capacity: number | null;
  facilities: string[];
  languages: string[];
  description: string | null;
  imageUrls: string[];
  contact: { phone: string | null; email: string | null; website: string | null };
  distanceKm?: number;
  createdAt: string;
}

export interface SearchResult {
  success: boolean;
  data: Mosque[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface SearchFilters {
  query?: string;
  country?: string;
  city?: string;
  denomination?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page?: number;
  limit?: number;
}

export async function searchMosques(filters: SearchFilters): Promise<SearchResult> {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, val]) => {
    if (val !== undefined && val !== '') params.set(key, String(val));
  });
  const res = await fetch(`${API_URL}/api/v1/mosques?${params}`);
  if (!res.ok) throw new Error('Failed to fetch mosques');
  return res.json();
}

export async function getMosque(id: string): Promise<{ success: boolean; data: Mosque }> {
  const res = await fetch(`${API_URL}/api/v1/mosques/${id}`);
  if (!res.ok) throw new Error('Mosque not found');
  return res.json();
}

export async function getNearby(lat: number, lng: number, radiusKm = 10): Promise<{ success: boolean; data: Mosque[] }> {
  const res = await fetch(`${API_URL}/api/v1/mosques/nearby?lat=${lat}&lng=${lng}&radiusKm=${radiusKm}`);
  if (!res.ok) throw new Error('Failed to fetch nearby mosques');
  return res.json();
}

export async function getStats(): Promise<{ success: boolean; data: { total: number; byCountry: Record<string, number> } }> {
  const res = await fetch(`${API_URL}/api/v1/mosques/stats`);
  if (!res.ok) throw new Error('Failed to fetch stats');
  return res.json();
}
