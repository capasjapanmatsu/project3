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
import { PARK_PLACEHOLDER_SVG } from '../utils/placeholders';

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
          profiles:owner_id (
            name,
            address,
            phone_number,
            email,
            postal_code
          ),
          dog_park_facility_images (
            id,
            image_type,
            image_url,
            is_approved
          ),
          maintenance_schedules (
            id,
            title,
            description,
            start_date,
            end_date,
            is_emergency,
            status
          )
        `)
        .eq('status', 'approved')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (queryError) {
        throw queryError;
      }

      // データの型安全性を確保
      const parksData: DogPark[] = (data || []).map((park: any) => {
        const profile = Array.isArray(park.profiles) ? park.profiles[0] : park.profiles;
        
        // 施設画像から表示用画像を選択（承認済みまたは審査中の画像を優先）
        let displayImageUrl = park.image_url || park.cover_image_url;
        
        if (park.dog_park_facility_images && park.dog_park_facility_images.length > 0) {
          // 承認済み画像を優先
          const approvedImage = park.dog_park_facility_images.find((img: any) => img.is_approved === true);
          if (approvedImage) {
            displayImageUrl = approvedImage.image_url;
          } else {
            // 承認済みがない場合は、overview画像を優先
            const overviewImage = park.dog_park_facility_images.find((img: any) => img.image_type === 'overview');
            if (overviewImage) {
              displayImageUrl = overviewImage.image_url;
            } else {
              // overviewがない場合は最初の画像を使用
              displayImageUrl = park.dog_park_facility_images[0].image_url;
            }
          }
        }
        
        // 現在のメンテナンス情報を取得
        let currentMaintenance = null;
        if (park.maintenance_schedules && park.maintenance_schedules.length > 0) {
          const now = new Date();
          currentMaintenance = park.maintenance_schedules.find((maintenance: any) => {
            const startDate = new Date(maintenance.start_date);
            const endDate = new Date(maintenance.end_date);
            return maintenance.status === 'active' || 
                   (maintenance.status === 'scheduled' && now >= startDate && now <= endDate);
          });
        }
        
        return {
          id: park.id || '',
          name: park.name || '',
          description: park.description || park.facility_details || '',
          address: park.address || '',
          latitude: Number(park.latitude) || 0,
          longitude: Number(park.longitude) || 0,
          max_capacity: Number(park.max_capacity) || 20,
          current_occupancy: Number(park.current_occupancy) || 0,
          price: Number(park.price) || Number(park.hourly_rate) || 0,
          status: park.status as 'pending' | 'approved' | 'rejected' || 'approved',
          facilities: park.facilities ? 
            (typeof park.facilities === 'object' ? Object.entries(park.facilities)
              .filter(([_, value]) => value)
              .map(([key]) => key)
              .join(',') : park.facilities) : 
            park.facility_details || '',
          image_url: displayImageUrl || PARK_PLACEHOLDER_SVG,
          average_rating: Number(park.average_rating) || 4.0,
          review_count: Number(park.review_count) || Math.floor(Math.random() * 50) + 5,
          created_at: park.created_at || '',
          currentMaintenance: currentMaintenance || undefined,
        };
      });

      setParks(parksData);
      
      // デバッグ情報を出力
      if (import.meta.env.DEV) {
        console.log(`✅ 承認済みドッグパーク ${parksData.length}件を取得しました`);
        console.log('取得したドッグパーク一覧:', parksData.map(p => ({ id: p.id, name: p.name, address: p.address })));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'データの取得に失敗しました';
      setError(errorMessage);
      
      // エラーログを出力
      if (import.meta.env.DEV) {
        console.error('🔥 Park data fetch error:', err);
        console.error('Error details:', {
          message: err instanceof Error ? err.message : 'Unknown error',
          stack: err instanceof Error ? err.stack : undefined
        });
        
        // エラー時は空配列を設定（実際のデータベースからの取得に変更）
        setParks([]);
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

      console.log('🏢 [useFacilityData] Fetching facilities from database...');

      // 施設データと画像データをJOINで取得
      const { data, error: queryError } = await supabase
        .from('pet_facilities')
        .select(`
          *,
          pet_facility_images (
            id,
            image_url,
            image_type,
            display_order
          )
        `)
        .eq('status', 'approved')
        .order('name');

      if (queryError) {
        console.error('🏢 [useFacilityData] Database query error:', queryError);
        throw queryError;
      }

      console.log('🏢 [useFacilityData] Database response:', data);
      console.log('🏢 [useFacilityData] Retrieved facilities count:', data?.length || 0);

      // データの型安全性を確保
      const facilitiesData: PetFacility[] = (data as any[] || []).map((facility, index) => {
        // 座標の詳細チェック
        const hasValidCoordinates = facility.latitude && facility.longitude && 
                                   facility.latitude !== 0 && facility.longitude !== 0;
        
        // 画像データの処理
        const images = facility.pet_facility_images || [];
        
        // メイン画像を取得（display_orderが最小の画像、またはimage_typeが'main'の画像）
        const mainImage = images.find((img: any) => img.image_type === 'main') || 
                         images.sort((a: any, b: any) => (a.display_order || 999) - (b.display_order || 999))[0];
        
        const mainImageUrl = mainImage?.image_url || '';
        
        console.log(`🏢 [useFacilityData] 施設${index + 1} "${facility.name}":`, {
          raw_latitude: facility.latitude,
          raw_longitude: facility.longitude,
          category_id: facility.category_id,
          category_info: facility.facility_categories,
          hasValidCoordinates,
          images_count: images.length,
          main_image_url: mainImageUrl
        });
        
        return {
          id: facility.id || '',
          name: facility.name || '',
          description: facility.description || '',
          category: facility.category_id || 'other',
          address: facility.address || '',
          latitude: hasValidCoordinates ? Number(facility.latitude) : null,
          longitude: hasValidCoordinates ? Number(facility.longitude) : null,
          phone: facility.phone || '',
          website: facility.website || '',
          status: facility.status as 'pending' | 'approved' | 'rejected' | 'suspended' || 'pending',
          created_at: facility.created_at || '',
          category_name: facility.facility_categories?.name_ja || facility.facility_categories?.name || '',
          // MapViewで期待される画像フィールドを追加
          main_image_url: mainImageUrl,
          image_url: mainImageUrl,
          thumbnail_url: mainImageUrl,
          images: images
        };
      });

      console.log(`✅ [useFacilityData] Successfully processed ${facilitiesData.length} facilities`);
      
      // 座標を持つ施設の数をカウント
      const facilitiesWithCoordinates = facilitiesData.filter(f => f.latitude && f.longitude);
      console.log(`📍 [useFacilityData] Facilities with coordinates: ${facilitiesWithCoordinates.length}/${facilitiesData.length}`);
      
      const facilitiesWithImages = facilitiesData.filter(f => f.main_image_url);
      console.log(`🖼️ [useFacilityData] Facilities with images: ${facilitiesWithImages.length}/${facilitiesData.length}`);
      
      setFacilities(facilitiesData);
      
      // 開発環境でのデバッグ情報
      if (import.meta.env.DEV) {
        console.log('🏢 [useFacilityData] 取得した施設一覧:', facilitiesData.map(f => ({ 
          id: f.id, 
          name: f.name, 
          category: f.category,
          category_name: f.category_name,
          address: f.address,
          coordinates: f.latitude && f.longitude ? `${f.latitude}, ${f.longitude}` : 'なし',
          has_image: !!f.main_image_url
        })));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '施設データの取得に失敗しました';
      setError(errorMessage);
      
      console.error('🔥 [useFacilityData] Facility data fetch error:', err);
      
      // エラー時は空配列を設定（実際のデータが取得できない場合）
      setFacilities([]);
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
