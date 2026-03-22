import { query } from '../db/client.js';

export interface MosqueRow {
  id: string;
  name_primary: string;
  name_arabic?: string;
  address_street?: string;
  address_city: string;
  address_country: string;
  address_country_code: string;
  address_formatted?: string;
  latitude: number;
  longitude: number;
  denomination: string;
  status: string;
  capacity?: number;
  facilities: string[];
  languages: string[];
  description?: string;
  image_urls: string[];
  phone?: string;
  email?: string;
  website?: string;
  data_source: string;
  confidence?: number;
  created_at: string;
  updated_at: string;
  distance_km?: number;
}

export interface SearchFilters {
  query?: string;
  country?: string;
  city?: string;
  denomination?: string;
  status?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page?: number;
  limit?: number;
}

export class MosqueRepository {
  async findById(id: string): Promise<MosqueRow | null> {
    const result = await query<MosqueRow>(
      'SELECT * FROM mosques WHERE id = $1 AND status != $2',
      [id, 'closed']
    );
    return result.rows[0] ?? null;
  }

  async search(filters: SearchFilters): Promise<{ data: MosqueRow[]; total: number }> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const offset = (page - 1) * limit;
    const conditions: string[] = ["status = 'active'"];
    const params: unknown[] = [];
    let paramIdx = 1;

    if (filters.query) {
      conditions.push(`(name_primary ILIKE $${paramIdx} OR address_city ILIKE $${paramIdx})`);
      params.push(`%${filters.query}%`);
      paramIdx++;
    }
    if (filters.country) {
      conditions.push(`address_country_code = $${paramIdx}`);
      params.push(filters.country.toUpperCase());
      paramIdx++;
    }
    if (filters.city) {
      conditions.push(`address_city ILIKE $${paramIdx}`);
      params.push(`%${filters.city}%`);
      paramIdx++;
    }
    if (filters.denomination) {
      conditions.push(`denomination = $${paramIdx}`);
      params.push(filters.denomination);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await query<{ count: string }>(`SELECT COUNT(*) FROM mosques ${where}`, params);
    const total = parseInt(countResult.rows[0].count, 10);
    params.push(limit, offset);
    const dataResult = await query<MosqueRow>(
      `SELECT * FROM mosques ${where} ORDER BY name_primary ASC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );
    return { data: dataResult.rows, total };
  }

  async findNearby(lat: number, lng: number, radiusKm: number, limit: number): Promise<MosqueRow[]> {
    const result = await query<MosqueRow>(
      `SELECT *, (6371 * acos(LEAST(1.0, cos(radians($1)) * cos(radians(latitude)) * cos(radians(longitude) - radians($2)) + sin(radians($1)) * sin(radians(latitude))))) AS distance_km
       FROM mosques WHERE status = 'active'
       ORDER BY distance_km ASC LIMIT $3`,
      [lat, lng, limit]
    );
    return result.rows.filter(r => (r.distance_km ?? 0) <= radiusKm);
  }

  async create(data: any): Promise<MosqueRow> {
    const result = await query<MosqueRow>(
      `INSERT INTO mosques (name_primary, name_arabic, address_street, address_city, address_country, address_country_code, latitude, longitude, denomination, capacity, facilities, phone, email, website, description, languages, data_source)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,'user_submitted') RETURNING *`,
      [
        data.name_primary, data.name_arabic ?? null, data.address_street ?? null,
        data.address_city, data.address_country, data.address_country_code,
        data.lat, data.lng, data.denomination ?? 'sunni', data.capacity ?? null,
        data.facilities ?? [], data.phone ?? null, data.email ?? null,
        data.website ?? null, data.description ?? null, data.languages ?? [],
      ]
    );
    return result.rows[0];
  }

  async update(id: string, data: any): Promise<MosqueRow | null> {
    const fields = Object.keys(data);
    if (fields.length === 0) return this.findById(id);
    const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = fields.map((f) => (data as any)[f]);
    const result = await query<MosqueRow>(
      `UPDATE mosques SET ${setClauses}, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<void> {
    await query(`UPDATE mosques SET status = 'closed' WHERE id = $1`, [id]);
  }

  async getStats(): Promise<{ total: number; byCountry: Record<string, number> }> {
    const totalResult = await query<{ count: string }>(`SELECT COUNT(*) FROM mosques WHERE status = 'active'`);
    const byCountryResult = await query<{ address_country_code: string; count: string }>(
      `SELECT address_country_code, COUNT(*) FROM mosques WHERE status = 'active' GROUP BY address_country_code ORDER BY count DESC LIMIT 20`
    );
    return {
      total: parseInt(totalResult.rows[0].count, 10),
      byCountry: Object.fromEntries(byCountryResult.rows.map(r => [r.address_country_code, parseInt(r.count, 10)])),
    };
  }
}

export const mosqueRepository = new MosqueRepository();
