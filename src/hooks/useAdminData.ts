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
      console.log('📊 Fetching pending parks...');
      const { data: parksData, error: parksError } = await supabase
        .from('admin_pending_parks_view')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (parksError) throw parksError;
      setPendingParks(parksData || []);
    } catch (error) {
      console.error('Parks fetch error:', error);
      throw error;
    }
  };

  const fetchVaccines = async () => {
    try {
      console.log('📊 Fetching pending vaccines...');
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
      console.error('Vaccines fetch error:', error);
      throw error;
    }
  };

  const fetchData = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSuccess('');
      
      // バケットをパブリックに設定
      console.log('🔧 Ensuring vaccine-certs bucket is public...');
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
      
      if (error) throw error;
      
      setParkImages(data || []);
      
      // すべての画像が承認されているかチェック
      const allApproved = data && data.length > 0 && data.every(img => img.is_approved === true);
      setAllImagesApproved(allApproved);
    } catch (error) {
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