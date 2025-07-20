// データベースレスポンスの型定義
interface DogParkResponse {
  id: string;
  name: string;
  description?: string;
  address: string;
  latitude: number;
  longitude: number;
  price: number;
  current_occupancy: number;
  max_capacity: number;
  status: string;
  facilities?: string;
  image_url?: string;
  average_rating: number;
  review_count: number;
  created_at: string;
}

interface PetFacilityResponse {
  id: string;
  name: string;
  description?: string;
  category_id: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  status: string;
  created_at: string;
  facility_categories?: {
    name: string;
    name_ja: string;
  };
}

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
          *
        `)
        .eq('status', 'approved')
        .order('name');

      if (queryError) {
        throw queryError;
      }

      // データの型安全性を確保
      const parksData: DogPark[] = (data as DogParkResponse[] || []).map((park) => ({
        id: park.id || '',
        name: park.name || '',
        description: park.description || '',
        address: park.address || '',
        latitude: Number(park.latitude) || 0,
        longitude: Number(park.longitude) || 0,
        max_capacity: Number(park.max_capacity) || 0,
        current_occupancy: Number(park.current_occupancy) || 0,
        price: Number(park.price) || 0,
        status: park.status as 'pending' | 'approved' | 'rejected' || 'pending',
        facilities: park.facilities || '',
        image_url: park.image_url || '',
        average_rating: Number(park.average_rating) || 0,
        review_count: Number(park.review_count) || 0,
        created_at: park.created_at || '',
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
        .select(`
          *,
          facility_categories (
            name,
            name_ja
          )
        `)
        .eq('status', 'approved')
        .order('name');

      if (queryError) {
        throw queryError;
      }

      // データの型安全性を確保
      const facilitiesData: PetFacility[] = (data as PetFacilityResponse[] || []).map((facility) => ({
        id: facility.id || '',
        name: facility.name || '',
        description: facility.description || '',
        category: facility.category_id || 'other',
        address: facility.address || '',
        latitude: Number(facility.latitude) || 0,
        longitude: Number(facility.longitude) || 0,
        phone: facility.phone || '',
        website: facility.website || '',
        status: facility.status as 'pending' | 'approved' | 'rejected' | 'suspended' || 'pending',
        created_at: facility.created_at || '',
        category_name: facility.facility_categories?.name_ja || '',
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
