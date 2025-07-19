import { useState } from 'react';
import type { DogPark } from '../types';
import { supabase } from '../utils/supabase';

// 共通のPetFacility型定義をエクスポート
export interface FacilityImage {
  id: string;
  facility_id: string;
  image_data: string;
  is_primary: boolean;
  created_at: string;
}

export interface PetFacility {
  id: string;
  name: string;
  category_id: string;
  address: string;
  phone?: string;
  website?: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  latitude?: number;
  longitude?: number;
  created_at: string;
  owner_id: string;
  images?: FacilityImage[];
}

export const useParkData = () => {
  const [parks, setParks] = useState<DogPark[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchParkData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('🔍 Fetching park data...');

      const { data: parksData, error } = await supabase
        .from('dog_parks')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Park fetch error:', error);
        throw error;
      }

      console.log('✅ Found', parksData?.length || 0, 'approved parks');
      setParks(parksData || []);
    } catch (error) {
      console.error('❌ Error fetching parks:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch park data');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    parks,
    isLoading,
    error,
    fetchParkData,
    setError,
    setIsLoading
  };
};

export const useFacilityData = () => {
  const [facilities, setFacilities] = useState<PetFacility[]>([]);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchFacilities = async () => {
    try {
      setFacilitiesLoading(true);
      setError(null);
      console.log('🏪 Fetching pet facilities...');

      const { data: facilitiesData, error: facilitiesError } = await supabase
        .from('pet_facilities')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (facilitiesError) {
        console.error('❌ Facilities fetch error:', facilitiesError);
        throw facilitiesError;
      }

      console.log('✅ Found', facilitiesData?.length || 0, 'approved facilities');

      // 各施設の画像を取得
      const facilitiesWithImages = await Promise.all(
        (facilitiesData || []).map(async (facility) => {
          const { data: images, error: imagesError } = await supabase
            .from('facility_images')
            .select('*')
            .eq('facility_id', facility.id)
            .order('is_primary', { ascending: false });

          if (imagesError) {
            console.error('Images fetch error for facility', facility.id, ':', imagesError);
            return { ...facility, images: [] };
          }

          return { ...facility, images: images || [] };
        })
      );

      setFacilities(facilitiesWithImages);
    } catch (error) {
      console.error('❌ Error fetching facilities:', error);
      setError(error instanceof Error ? error.message : 'Failed to fetch facilities');
    } finally {
      setFacilitiesLoading(false);
    }
  };

  return {
    facilities,
    facilitiesLoading,
    error,
    fetchFacilities,
    setError
  };
}; 