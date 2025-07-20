// useParkData.ts - ドッグパークと施設データ管理のカスタムフック
import { useCallback, useState } from 'react';
import { type DogPark } from '../types';
import { type PetFacility } from '../types/facilities';
import { supabase } from '../utils/supabase';

// ドッグパークデータ管理フック
export function useParkData() {
  const [parks, setParks] = useState<DogPark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchParkData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('dog_parks')
        .select(`
          *,
          park_facilities (
            id,
            name,
            category,
            is_available
          )
        `)
        .eq('is_active', true)
        .order('name');

      if (queryError) {
        throw queryError;
      }

      // データの型安全性を確保
      const parksData: DogPark[] = (data || []).map((park: any) => ({
        id: park.id || '',
        name: park.name || '',
        description: park.description || '',
        address: park.address || '',
        prefecture: park.prefecture || '',
        city: park.city || '',
        latitude: park.latitude || 0,
        longitude: park.longitude || 0,
        max_capacity: park.max_capacity || 0,
        current_occupancy: park.current_occupancy || 0,
        hourly_rate: park.hourly_rate || 0,
        is_active: park.is_active || false,
        is_open: park.is_open || false,
        opening_hours: park.opening_hours || '',
        contact_phone: park.contact_phone || '',
        contact_email: park.contact_email || '',
        website_url: park.website_url || '',
        image_urls: Array.isArray(park.image_urls) ? park.image_urls : [],
        amenities: Array.isArray(park.amenities) ? park.amenities : [],
        rules: Array.isArray(park.rules) ? park.rules : [],
        created_at: park.created_at || '',
        updated_at: park.updated_at || '',
        park_facilities: Array.isArray(park.park_facilities) ? park.park_facilities : [],
      }));

      setParks(parksData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'データの取得に失敗しました';
      setError(errorMessage);
      if (import.meta.env.DEV) {
        console.warn('🔥 Park data fetch error:', err);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    parks,
    isLoading,
    error,
    fetchParkData,
    setError,
    setIsLoading,
  };
}

// 施設データ管理フック
export function useFacilityData() {
  const [facilities, setFacilities] = useState<PetFacility[]>([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFacilities = useCallback(async () => {
    try {
      setFacilitiesLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('pet_facilities')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (queryError) {
        throw queryError;
      }

      // データの型安全性を確保
      const facilitiesData: PetFacility[] = (data || []).map((facility: any) => ({
        id: facility.id || '',
        name: facility.name || '',
        description: facility.description || '',
        category: facility.category || 'other',
        address: facility.address || '',
        prefecture: facility.prefecture || '',
        city: facility.city || '',
        latitude: facility.latitude || 0,
        longitude: facility.longitude || 0,
        phone: facility.phone || '',
        email: facility.email || '',
        website_url: facility.website_url || '',
        operating_hours: facility.operating_hours || '',
        is_active: facility.is_active || false,
        is_pet_friendly: facility.is_pet_friendly || false,
        price_range: facility.price_range || '',
        rating: facility.rating || 0,
        review_count: facility.review_count || 0,
        image_urls: Array.isArray(facility.image_urls) ? facility.image_urls : [],
        amenities: Array.isArray(facility.amenities) ? facility.amenities : [],
        pet_policies: facility.pet_policies || '',
        created_at: facility.created_at || '',
        updated_at: facility.updated_at || '',
      }));

      setFacilities(facilitiesData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '施設データの取得に失敗しました';
      setError(errorMessage);
      if (import.meta.env.DEV) {
        console.warn('🔥 Facility data fetch error:', err);
      }
    } finally {
      setFacilitiesLoading(false);
    }
  }, []);

  return {
    facilities,
    facilitiesLoading,
    error,
    fetchFacilities,
    setError,
    setFacilitiesLoading,
  };
}
