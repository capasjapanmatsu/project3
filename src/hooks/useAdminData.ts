// 管理者データ取得のカスタムフック

import { useEffect, useState } from 'react';
import { FacilityImage, PendingPark, PendingVaccine } from '../types/admin';
import { handleSupabaseError, log, safeSupabaseQuery } from '../utils/helpers';
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
      log('info', '🔍 Fetching pending parks...');
      
      // Get parks that need approval (pending, first_stage_passed, second_stage_review)
      const result = await safeSupabaseQuery(() =>
        supabase
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
          .order('created_at', { ascending: false })
      );
      
      if (result.error) {
        log('error', '❌ Parks fetch error:', result.error);
        throw result.error;
      }
      
      const parksData = result.data || [];
      
      if (parksData.length === 0) {
        log('info', 'ℹ️ No pending parks found');
        setPendingParks([]);
        return;
      }

      log('info', `✅ Found ${parksData.length} pending parks`);

      // Extract IDs for parallel queries
      const ownerIds = [...new Set(parksData.map(park => park.owner_id))];
      const parkIds = parksData.map(park => park.id);

      // Fetch all related data in parallel for better performance
      const [ownersResponse, reviewStagesResponse, imagesResponse, identityResponse] = await Promise.allSettled([
        // Get owner information (詳細情報も取得)
        ownerIds.length > 0 
          ? supabase.from('profiles').select('id, name, postal_code, address, phone_number, email').in('id', ownerIds)
          : Promise.resolve({ data: [], error: null }),
        
        // Get review stages (if table exists)
        parkIds.length > 0
          ? supabase.from('dog_park_review_stages').select('park_id, second_stage_submitted_at').in('park_id', parkIds)
          : Promise.resolve({ data: [], error: null }),
        
        // Get facility images
        parkIds.length > 0
          ? supabase.from('dog_park_facility_images').select('park_id, is_approved').in('park_id', parkIds)
          : Promise.resolve({ data: [], error: null }),
        
        // Get identity verification documents
        ownerIds.length > 0
          ? supabase.from('owner_verifications').select('user_id, verification_id, status, verification_data, created_at').in('user_id', ownerIds)
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

      // Process identity verification data
      const identityData = identityResponse.status === 'fulfilled' ? identityResponse.value.data || [] : [];
      const identityMap = new Map(identityData.map(identity => [identity.user_id, identity]));

      // Transform data to PendingPark format
      const transformedParks: PendingPark[] = parksData.map(park => {
        const owner = ownersMap.get(park.owner_id);
        const reviewStage = reviewStagesMap.get(park.id);
        const parkImages = imagesMap.get(park.id) || [];
        const identity = identityMap.get(park.owner_id);

        // Calculate image statistics
        const totalImages = parkImages.length;
        const approvedImages = parkImages.filter((img: any) => img.is_approved === true).length;
        const rejectedImages = parkImages.filter((img: any) => img.is_approved === false).length;
        const pendingImages = parkImages.filter((img: any) => img.is_approved === null).length;

        // Extract identity document information
        let identityDocumentUrl = '';
        let identityDocumentFilename = '';
        
        if (identity && identity.verification_data) {
          if (typeof identity.verification_data === 'object') {
            identityDocumentUrl = identity.verification_data.document_url || identity.verification_data.file_path || '';
            identityDocumentFilename = identity.verification_data.file_name || identity.verification_data.filename || '';
          }
        }
        
        // verification_idがファイルパスの場合はそれを使用
        if (!identityDocumentUrl && identity?.verification_id) {
          identityDocumentUrl = identity.verification_id;
        }
        
        if (!identityDocumentFilename && identityDocumentUrl) {
          identityDocumentFilename = identityDocumentUrl.split('/').pop() || 'identity_document';
        }

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
          pending_images: pendingImages,
          // 申請者の詳細情報
          owner_postal_code: owner?.postal_code || '',
          owner_address: owner?.address || '',
          owner_phone_number: owner?.phone_number || '',
          owner_email: owner?.email || '',
          // 本人確認書類情報
          identity_document_url: identityDocumentUrl,
          identity_document_filename: identityDocumentFilename,
          identity_status: identity?.status || 'not_submitted',
          identity_created_at: identity?.created_at || ''
        };
      });

      log('info', `✅ Transformed ${transformedParks.length} parks with image data`);
      setPendingParks(transformedParks);
      
    } catch (error) {
      log('error', '❌ Error fetching parks:', { error: handleSupabaseError(error) });
      setError(`ドッグラン申請データの取得に失敗しました: ${handleSupabaseError(error)}`);
    }
  };

  const fetchVaccines = async () => {
    try {
      log('info', '🔍 Fetching pending vaccines...');
      
      // Ensure vaccine bucket is public
      await ensureVaccineBucketIsPublic();
      
      const result = await safeSupabaseQuery(() =>
        supabase
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
          .order('created_at', { ascending: false })
      );
      
      if (result.error) {
        log('error', '❌ Vaccines fetch error:', result.error);
        throw result.error;
      }
      
      const vaccinesData = result.data || [];
      
      if (vaccinesData.length === 0) {
        log('info', 'ℹ️ No pending vaccines found');
        setPendingVaccines([]);
        return;
      }

      log('info', `✅ Found ${vaccinesData.length} pending vaccines`);

      // Transform data to PendingVaccine format
      const transformedVaccines: PendingVaccine[] = vaccinesData.map(vaccine => {
        const dog = Array.isArray(vaccine.dog) ? vaccine.dog[0] : vaccine.dog;
        const owner = dog ? (Array.isArray(dog.owner) ? dog.owner[0] : dog.owner) : null;
        
        if (!dog || !owner) {
          log('warn', '❌ Invalid vaccine data:', { vaccine });
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
      log('error', '❌ Error fetching vaccines:', { error: handleSupabaseError(error) });
      setError(`ワクチン証明書データの取得に失敗しました: ${handleSupabaseError(error)}`);
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
      log('error', '❌ Error in fetchData:', { error: handleSupabaseError(error) });
      setError(`データの取得に失敗しました: ${handleSupabaseError(error)}`);
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
      
      log('info', `🔍 Fetching images for park: ${id}`);
      
      const result = await safeSupabaseQuery(() =>
        supabase
          .from('dog_park_facility_images')
          .select('*')
          .eq('park_id', id)
          .order('created_at', { ascending: false })
      );
      
      if (result.error) {
        log('error', '❌ Images fetch error:', result.error);
        throw result.error;
      }
      
      const imagesData = result.data || [];
      log('info', `✅ Found ${imagesData.length} images for park ${id}`);
      setParkImages(imagesData);
      
    } catch (error) {
      log('error', '❌ Error fetching park images:', { error: handleSupabaseError(error) });
      setError(`画像データの取得に失敗しました: ${handleSupabaseError(error)}`);
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