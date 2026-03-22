import { mosqueRepository, type SearchFilters, type MosqueRow } from '../repositories/mosque.repository.js';
import { logger } from '../utils/logger.js';

function formatMosque(row: MosqueRow) {
  return {
    id: row.id,
    name: {
      primary: row.name_primary,
      arabic: row.name_arabic ?? null,
    },
    address: {
      street: row.address_street ?? null,
      city: row.address_city,
      country: row.address_country,
      countryCode: row.address_country_code,
      formatted: row.address_formatted ?? `${row.address_city}, ${row.address_country}`,
    },
    coordinates: {
      lat: parseFloat(String(row.latitude)),
      lng: parseFloat(String(row.longitude)),
    },
    denomination: row.denomination,
    status: row.status,
    capacity: row.capacity ?? null,
    facilities: row.facilities ?? [],
    languages: row.languages ?? [],
    description: row.description ?? null,
    imageUrls: row.image_urls ?? [],
    contact: {
      phone: row.phone ?? null,
      email: row.email ?? null,
      website: row.website ?? null,
    },
    dataSource: row.data_source,
    distanceKm: row.distance_km ? parseFloat(String(row.distance_km)) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class MosqueService {
  async search(filters: SearchFilters) {
    const { data, total } = await mosqueRepository.search(filters);
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;

    return {
      data: data.map(formatMosque),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1,
    };
  }

  async findById(id: string) {
    const row = await mosqueRepository.findById(id);
    if (!row) return null;
    return formatMosque(row);
  }

  async findNearby(lat: number, lng: number, radiusKm = 5, limit = 10) {
    const rows = await mosqueRepository.findNearby(lat, lng, radiusKm, limit);
    return rows.map(formatMosque);
  }

  async create(input: any, userId?: string) {
    logger.info({ name: input.name?.primary, userId }, 'Creating mosque');
    const row = await mosqueRepository.create({
      name_primary: input.name?.primary ?? input.name_primary,
      name_arabic: input.name?.arabic ?? input.name_arabic,
      address_street: input.address?.street ?? input.address_street,
      address_city: input.address?.city ?? input.address_city,
      address_country: input.address?.country ?? input.address_country,
      address_country_code: input.address?.countryCode ?? input.address_country_code,
      lat: input.coordinates?.lat ?? input.lat,
      lng: input.coordinates?.lng ?? input.lng,
      denomination: input.denomination,
      capacity: input.capacity,
      facilities: input.facilities,
      phone: input.contact?.phone ?? input.phone,
      email: input.contact?.email ?? input.email,
      website: input.contact?.website ?? input.website,
      description: input.description,
      languages: input.languages,
      submitted_by: userId,
    });
    return formatMosque(row);
  }

  async update(id: string, input: any, user?: any) {
    // Non-admins can only update pending mosques
    const existing = await mosqueRepository.findById(id);
    if (!existing) throw new Error('Mosque not found');

    if (user?.role !== 'admin' && user?.role !== 'moderator') {
      if (existing.status !== 'pending') {
        throw new Error('You can only edit mosques pending review');
      }
    }

    const row = await mosqueRepository.update(id, input);
    if (!row) throw new Error('Update failed');
    return formatMosque(row);
  }

  async delete(id: string) {
    await mosqueRepository.delete(id);
    logger.info({ id }, 'Mosque soft-deleted');
  }

  async getStats() {
    return mosqueRepository.getStats();
  }
}

export const mosqueService = new MosqueService();
