// 管理者データ取得のカスタムフック

import { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import { PendingPark, PendingVaccine, FacilityImage } from '../types/admin';
import { ensureVaccineBucketIsPublic } from '../utils/storageUtils';

export const useAdminData = (activeTab: 'parks' | 'vaccines') => {
  const [pendingParks, setPendingParks] = useState<PendingPark[]>([]);
  const [pendingVaccines, setPendingVaccines] = useState<PendingVaccine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchParks = async () => {
    try {
      // Get parks that have passed first stage or are in second stage review
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
        .in('status', ['first_stage_passed', 'second_stage_review'])
        .order('created_at', { ascending: false });
      
      if (parksError) throw parksError;
      if (!parksData || parksData.length === 0) {
        setPendingParks([]);
        return;
      }

      // Extract IDs for parallel queries
      const ownerIds = [...new Set(parksData.map(park => park.owner_id))];
      const parkIds = parksData.map(park => park.id);

      // Fetch all related data in parallel for better performance
      const [ownersResponse, reviewStagesResponse, imagesResponse] = await Promise.allSettled([
        // Get owner information
        ownerIds.length > 0 
          ? supabase.from('profiles').select('id, name').in('id', ownerIds)
          : Promise.resolve({ data: [], error: null }),
        
        // Get review stages
        parkIds.length > 0
          ? supabase.from('dog_park_review_stages').select('park_id, second_stage_submitted_at').in('park_id', parkIds)
          : Promise.resolve({ data: [], error: null }),
        
        // Get facility images stats
        parkIds.length > 0
          ? supabase.from('dog_park_facility_images').select('park_id, is_approved').in('park_id', parkIds)
          : Promise.resolve({ data: [], error: null })
      ]);

      // Process results safely
      const ownersData = ownersResponse.status === 'fulfilled' && !ownersResponse.value.error 
        ? ownersResponse.value.data || [] 
        : [];
      
      const reviewStagesData = reviewStagesResponse.status === 'fulfilled' && !reviewStagesResponse.value.error
        ? reviewStagesResponse.value.data || []
        : [];
      
      const imagesData = imagesResponse.status === 'fulfilled' && !imagesResponse.value.error
        ? imagesResponse.value.data || []
        : [];

      // Log any errors but continue processing
      if (ownersResponse.status === 'rejected' || (ownersResponse.status === 'fulfilled' && ownersResponse.value.error)) {
        console.warn('Error fetching owners:', ownersResponse.status === 'rejected' ? ownersResponse.reason : ownersResponse.value.error);
      }
      if (reviewStagesResponse.status === 'rejected' || (reviewStagesResponse.status === 'fulfilled' && reviewStagesResponse.value.error)) {
        console.warn('Error fetching review stages:', reviewStagesResponse.status === 'rejected' ? reviewStagesResponse.reason : reviewStagesResponse.value.error);
      }
      if (imagesResponse.status === 'rejected' || (imagesResponse.status === 'fulfilled' && imagesResponse.value.error)) {
        console.warn('Error fetching image stats:', imagesResponse.status === 'rejected' ? imagesResponse.reason : imagesResponse.value.error);
      }
      
      // Combine the data
      const combinedData = parksData?.map((park: any) => {
        const reviewStage = reviewStagesData.find(stage => stage.park_id === park.id);
        const parkImages = imagesData.filter(img => img.park_id === park.id);
        
        return {
          ...park,
          owner_name: ownersData.find(owner => owner.id === park.owner_id)?.name || 'Unknown',
          second_stage_submitted_at: reviewStage?.second_stage_submitted_at || null,
          total_images: parkImages.length,
          pending_images: parkImages.filter(img => img.is_approved === null).length,
          approved_images: parkImages.filter(img => img.is_approved === true).length,
          rejected_images: parkImages.filter(img => img.is_approved === false).length
        };
      }) || [];
      
      // Show all parks that are in first_stage_passed or second_stage_review
      // For first_stage_passed, only show if they have submitted second stage
      const filteredData = combinedData.filter(park => {
        if (park.status === 'second_stage_review') {
          return true; // Always show parks in second stage review
        }
        if (park.status === 'first_stage_passed') {
          return park.second_stage_submitted_at !== null; // Only show if they've submitted
        }
        return false;
      });
      
      setPendingParks(filteredData);
    } catch (error) {
      console.warn('Parks fetch error:', error);
      throw error;
    }
  };

  const fetchVaccines = async () => {
    try {
      const { data: vaccinesData, error: vaccinesError } = await supabase
        .from('vaccine_certifications')
        .select(`
          *,
          dog:dogs(*, owner:profiles(*))
        `)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (vaccinesError) throw vaccinesError;
      setPendingVaccines(vaccinesData || []);
    } catch (error) {
      console.warn('Vaccines fetch error:', error);
      throw error;
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      // バケットをパブリックに設定
      await ensureVaccineBucketIsPublic();
      
      if (activeTab === 'parks') {
        await fetchParks();
      } else {
        await fetchVaccines();
      }
    } catch (error) {
      setError((error as Error).message || 'エラーが発生しました');
    } finally {
      setIsLoading(false);
    }
  };

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const showSuccess = (message: string) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  const showError = (message: string) => {
    setError(message);
  };

  return {
    pendingParks,
    pendingVaccines,
    isLoading,
    error,
    success,
    fetchData,
    clearMessages,
    showSuccess,
    showError,
    setPendingParks,
    setPendingVaccines
  };
};

export const useParkImages = (parkId: string | null) => {
  const [parkImages, setParkImages] = useState<FacilityImage[]>([]);
  const [allImagesApproved, setAllImagesApproved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchParkImages = async (id: string) => {
    try {
      setIsLoading(true);
      setError('');
      
      const { data, error } = await supabase
        .from('dog_park_facility_images')
        .select('*')
        .eq('park_id', id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.warn('Error fetching park images:', error);
        throw error;
      }
      
      // プロセス画像データ - 必要に応じてURLを生成
      const processedImages = data?.map(img => {
        let imageUrl = img.image_url;
        
        // URLがnullまたは空の場合の処理
        if (!imageUrl) {
          return {
            ...img,
            image_url: 'https://via.placeholder.com/400x300?text=No+Image+URL'
          };
        }
        
        // もしimage_urlが相対パスの場合、フルURLを生成
        if (!imageUrl.startsWith('http')) {
          // dog-park-imagesバケットを使用
          imageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/dog-park-images/${imageUrl}`;
        }
        
        return {
          ...img,
          image_url: imageUrl
        };
      }) || [];
      
      setParkImages(processedImages);
      
      // すべての画像が承認されているかチェック
      const allApproved = processedImages.length > 0 && processedImages.every(img => img.is_approved === true);
      setAllImagesApproved(allApproved);
    } catch (error) {
      console.warn('Error in fetchParkImages:', error);
      setError((error as Error).message || '施設画像の取得に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  // parkIdが変更されたときに画像を取得
  useEffect(() => {
    if (parkId) {
      fetchParkImages(parkId);
    } else {
      setParkImages([]);
      setAllImagesApproved(false);
    }
  }, [parkId]);

  return {
    parkImages,
    allImagesApproved,
    isLoading,
    error,
    fetchParkImages,
    setParkImages
  };
}; 