import { query, pool } from '../db/client.js';
import { logger } from '../utils/logger.js';

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
      `SELECT *,
        ST_Y(location::geometry) AS latitude,
        ST_X(location::geometry) AS longitude
       FROM mosques WHERE id = $1 AND status != 'closed'`,
      [id]
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
      conditions.push(
        `(name_primary ILIKE $${paramIdx} OR address_city ILIKE $${paramIdx})`
      );
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

    let distanceSelect = '';
    if (filters.lat && filters.lng) {
      distanceSelect = `,
        ST_Distance(
          location::geography,
          ST_MakePoint($${paramIdx}, $${paramIdx + 1})::geography
        ) / 1000 AS distance_km`;
      params.push(filters.lng, filters.lat);
      paramIdx += 2;

      if (filters.radiusKm) {
        conditions.push(
          `ST_DWithin(
            location::geography,
            ST_MakePoint($${paramIdx - 2}, $${paramIdx - 1})::geography,
            $${paramIdx}
          )`
        );
        params.push(filters.radiusKm * 1000);
        paramIdx++;
      }
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = filters.lat && filters.lng ? 'ORDER BY distance_km ASC' : 'ORDER BY name_primary ASC';

    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) FROM mosques ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    params.push(limit, offset);
    const dataResult = await query<MosqueRow>(
      `SELECT *,
        ST_Y(location::geometry) AS latitude,
        ST_X(location::geometry) AS longitude
        ${distanceSelect}
       FROM mosques
       ${where}
       ${orderBy}
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      params
    );

    return { data: dataResult.rows, total };
  }

  async findNearby(lat: number, lng: number, radiusKm: number, limit: number): Promise<MosqueRow[]> {
    const result = await query<MosqueRow>(
      `SELECT *,
        ST_Y(location::geometry) AS latitude,
        ST_X(location::geometry) AS longitude,
        ST_Distance(
          location::geography,
          ST_MakePoint($1, $2)::geography
        ) / 1000 AS distance_km
       FROM mosques
       WHERE status = 'active'
         AND ST_DWithin(
           location::geography,
           ST_MakePoint($1, $2)::geography,
           $3
         )
       ORDER BY distance_km ASC
       LIMIT $4`,
      [lng, lat, radiusKm * 1000, limit]
    );
    return result.rows;
  }

  async create(data: {
    name_primary: string;
    name_arabic?: string;
    address_street?: string;
    address_city: string;
    address_country: string;
    address_country_code: string;
    lat: number;
    lng: number;
    denomination?: string;
    capacity?: number;
    facilities?: string[];
    phone?: string;
    email?: string;
    website?: string;
    description?: string;
    languages?: string[];
    submitted_by?: string;
  }): Promise<MosqueRow> {
    const result = await query<MosqueRow>(
      `INSERT INTO mosques (
        name_primary, name_arabic, address_street, address_city,
        address_country, address_country_code, location, denomination,
        capacity, facilities, phone, email, website, description,
        languages, status, data_source, submitted_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        ST_MakePoint($8, $7)::geography,
        $9, $10, $11, $12, $13, $14, $15, $16,
        'pending', 'user_submitted', $17
      )
      RETURNING *,
        ST_Y(location::geometry) AS latitude,
        ST_X(location::geometry) AS longitude`,
      [
        data.name_primary,
        data.name_arabic ?? null,
        data.address_street ?? null,
        data.address_city,
        data.address_country,
        data.address_country_code,
        data.lat,
        data.lng,
        data.denomination ?? 'sunni',
        data.capacity ?? null,
        data.facilities ?? [],
        data.phone ?? null,
        data.email ?? null,
        data.website ?? null,
        data.description ?? null,
        data.languages ?? [],
        data.submitted_by ?? null,
      ]
    );
    return result.rows[0];
  }

  async update(id: string, data: Partial<{
    name_primary: string;
    address_city: string;
    address_country: string;
    address_country_code: string;
    denomination: string;
    status: string;
    capacity: number;
    phone: string;
    email: string;
    website: string;
    description: string;
  }>): Promise<MosqueRow | null> {
    const fields = Object.keys(data);
    if (fields.length === 0) return this.findById(id);

    const setClauses = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
    const values = fields.map((f) => (data as any)[f]);

    const result = await query<MosqueRow>(
      `UPDATE mosques SET ${setClauses}, updated_at = NOW()
       WHERE id = $1
       RETURNING *,
         ST_Y(location::geometry) AS latitude,
         ST_X(location::geometry) AS longitude`,
      [id, ...values]
    );
    return result.rows[0] ?? null;
  }

  async delete(id: string): Promise<void> {
    await query(`UPDATE mosques SET status = 'closed' WHERE id = $1`, [id]);
  }

  async getStats(): Promise<{ total: number; byCountry: Record<string, number> }> {
    const totalResult = await query<{ count: string }>(
      `SELECT COUNT(*) FROM mosques WHERE status = 'active'`
    );
    const byCountryResult = await query<{ address_country_code: string; count: string }>(
      `SELECT address_country_code, COUNT(*) FROM mosques
       WHERE status = 'active'
       GROUP BY address_country_code
       ORDER BY count DESC LIMIT 20`
    );

    return {
      total: parseInt(totalResult.rows[0].count, 10),
      byCountry: Object.fromEntries(
        byCountryResult.rows.map((r) => [r.address_country_code, parseInt(r.count, 10)])
      ),
    };
  }
}

export const mosqueRepository = new MosqueRepository();
