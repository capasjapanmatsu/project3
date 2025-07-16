// 管理者データ取得のカスタムフック

import { useEffect, useState } from 'react';
import { FacilityImage, PendingPark, PendingVaccine } from '../types/admin';
import { ensureVaccineBucketIsPublic } from '../utils/storageUtils';
import { supabase } from '../utils/supabase';

export const useAdminData = (activeTab: 'parks' | 'vaccines') => {
  const [pendingParks, setPendingParks] = useState<PendingPark[]>([]);
  const [pendingVaccines, setPendingVaccines] = useState<PendingVaccine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchParks = async () => {
    try {
      console.log('🔍 Fetching pending parks...');
      
      // Get parks that need approval (pending, first_stage_passed, second_stage_review)
      const { data: parksData, error: parksError } = await supabase
        .from('dog_parks')
        .select(`
          id,
          name,
          address,
          status,
          created_at,
          owner_id
        `)
        .in('status', ['pending', 'first_stage_passed', 'second_stage_review'])
        .order('created_at', { ascending: false });
      
      if (parksError) {
        console.error('❌ Parks fetch error:', parksError);
        throw parksError;
      }
      
      if (!parksData || parksData.length === 0) {
        console.log('ℹ️ No pending parks found');
        setPendingParks([]);
        return;
      }

      console.log(`✅ Found ${parksData.length} pending parks`);

      // Extract IDs for parallel queries
      const ownerIds = [...new Set(parksData.map(park => park.owner_id))];
      const parkIds = parksData.map(park => park.id);

      // Fetch all related data in parallel for better performance
      const [ownersResponse, reviewStagesResponse, imagesResponse] = await Promise.allSettled([
        // Get owner information
        ownerIds.length > 0 
          ? supabase.from('profiles').select('id, name').in('id', ownerIds)
          : Promise.resolve({ data: [], error: null }),
        
        // Get review stages (if table exists)
        parkIds.length > 0
          ? supabase.from('dog_park_review_stages').select('park_id, second_stage_submitted_at').in('park_id', parkIds)
          : Promise.resolve({ data: [], error: null }),
        
        // Get facility images
        parkIds.length > 0
          ? supabase.from('dog_park_facility_images').select('park_id, is_approved').in('park_id', parkIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      // Process owners data
      const ownersData = ownersResponse.status === 'fulfilled' ? ownersResponse.value.data || [] : [];
      const ownersMap = new Map(ownersData.map(owner => [owner.id, owner]));

      // Process review stages data (handle if table doesn't exist)
      const reviewStagesData = reviewStagesResponse.status === 'fulfilled' ? reviewStagesResponse.value.data || [] : [];
      const reviewStagesMap = new Map(reviewStagesData.map(stage => [stage.park_id, stage]));

      // Process images data (handle if table doesn't exist)
      const imagesData = imagesResponse.status === 'fulfilled' ? imagesResponse.value.data || [] : [];
      const imagesMap = new Map();
      
      // Group images by park_id
      imagesData.forEach(image => {
        if (!imagesMap.has(image.park_id)) {
          imagesMap.set(image.park_id, []);
        }
        imagesMap.get(image.park_id).push(image);
      });

             // Transform data to PendingPark format
       const transformedParks: PendingPark[] = parksData.map(park => {
         const owner = ownersMap.get(park.owner_id);
         const reviewStage = reviewStagesMap.get(park.id);
         const parkImages = imagesMap.get(park.id) || [];
         
         // Calculate image statistics
         const totalImages = parkImages.length;
         const approvedImages = parkImages.filter((img: any) => img.is_approved === true).length;
         const rejectedImages = parkImages.filter((img: any) => img.is_approved === false).length;
         const pendingImages = parkImages.filter((img: any) => img.is_approved === null).length;

         return {
           id: park.id,
           name: park.name,
           address: park.address,
           status: park.status,
           created_at: park.created_at,
           owner_id: park.owner_id,
           owner_name: owner?.name || 'Unknown Owner',
           second_stage_submitted_at: reviewStage?.second_stage_submitted_at || null,
           total_images: totalImages,
           approved_images: approvedImages,
           rejected_images: rejectedImages,
           pending_images: pendingImages
         };
       });

      console.log(`✅ Transformed ${transformedParks.length} parks with image data`);
      setPendingParks(transformedParks);
      
    } catch (error) {
      console.error('❌ Error fetching parks:', error);
      setError(`ドッグラン申請データの取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const fetchVaccines = async () => {
    try {
      console.log('🔍 Fetching pending vaccines...');
      
      // Ensure vaccine bucket is public
      await ensureVaccineBucketIsPublic();
      
      const { data: vaccinesData, error: vaccinesError } = await supabase
        .from('vaccine_certifications')
        .select(`
          id,
          dog_id,
          rabies_vaccine_image,
          combo_vaccine_image,
          rabies_expiry_date,
          combo_expiry_date,
          status,
          created_at,
          dog:dogs (
            id,
            name,
            breed,
            gender,
            birth_date,
            owner:profiles (
              id,
              name
            )
          )
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (vaccinesError) {
        console.error('❌ Vaccines fetch error:', vaccinesError);
        throw vaccinesError;
      }
      
      if (!vaccinesData || vaccinesData.length === 0) {
        console.log('ℹ️ No pending vaccines found');
        setPendingVaccines([]);
        return;
      }

      console.log(`✅ Found ${vaccinesData.length} pending vaccines`);

      // Transform data to PendingVaccine format
      const transformedVaccines: PendingVaccine[] = vaccinesData.map(vaccine => {
        const dog = Array.isArray(vaccine.dog) ? vaccine.dog[0] : vaccine.dog;
        const owner = dog ? (Array.isArray(dog.owner) ? dog.owner[0] : dog.owner) : null;
        
        if (!dog || !owner) {
          console.warn('❌ Invalid vaccine data:', vaccine);
          return null;
        }
        
        return {
          id: vaccine.id,
          dog_id: vaccine.dog_id,
          rabies_vaccine_image: vaccine.rabies_vaccine_image,
          combo_vaccine_image: vaccine.combo_vaccine_image,
          rabies_expiry_date: vaccine.rabies_expiry_date,
          combo_expiry_date: vaccine.combo_expiry_date,
          status: vaccine.status,
          created_at: vaccine.created_at,
          dog: {
            id: dog.id,
            name: dog.name,
            breed: dog.breed,
            gender: dog.gender,
            birth_date: dog.birth_date,
            owner: {
              id: owner.id,
              name: owner.name
            }
          }
        };
      }).filter(vaccine => vaccine !== null) as PendingVaccine[];

      setPendingVaccines(transformedVaccines);
      
    } catch (error) {
      console.error('❌ Error fetching vaccines:', error);
      setError(`ワクチン証明書データの取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      if (activeTab === 'parks') {
        await fetchParks();
      } else if (activeTab === 'vaccines') {
        await fetchVaccines();
      }
    } catch (error) {
      console.error('❌ Error in fetchData:', error);
      setError(`データの取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  return {
    pendingParks,
    pendingVaccines,
    isLoading,
    error,
    success,
    refetch: fetchData
  };
};

// 画像データ取得のカスタムフック
export const useParkImages = (parkId: string | null) => {
  const [parkImages, setParkImages] = useState<FacilityImage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchParkImages = async (id: string) => {
    try {
      setIsLoading(true);
      setError('');
      
      console.log(`🔍 Fetching images for park: ${id}`);
      
      const { data: imagesData, error: imagesError } = await supabase
        .from('dog_park_facility_images')
        .select('*')
        .eq('park_id', id)
        .order('created_at', { ascending: false });
      
      if (imagesError) {
        console.error('❌ Images fetch error:', imagesError);
        throw imagesError;
      }
      
      console.log(`✅ Found ${imagesData?.length || 0} images for park ${id}`);
      setParkImages(imagesData || []);
      
    } catch (error) {
      console.error('❌ Error fetching park images:', error);
      setError(`画像データの取得に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (parkId) {
      fetchParkImages(parkId);
    }
  }, [parkId]);

  return {
    parkImages,
    isLoading,
    error,
    fetchParkImages
  };
}; 