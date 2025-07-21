import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PetFacility } from '../types/facilities';
import { supabase } from '../utils/supabase';

// 拡張された施設データの型定義
interface ExtendedPetFacility extends PetFacility {
  owner_name: string;
  owner_email: string;
  owner?: {
    username: string | null;
    email: string | null;
  } | null;
}

// Supabaseのレスポンス型
interface FacilityResponse extends PetFacility {
  owner?: {
    username: string | null;
    email: string | null;
  } | null;
}

// 施設データを取得するためのキー
const facilityKeys = {
  all: ['facilities'] as const,
  list: (filters: string) => [...facilityKeys.all, 'list', filters] as const,
  detail: (id: string) => [...facilityKeys.all, 'detail', id] as const,
};

// 1. 効率的なデータ取得関数
const fetchFacilities = async (): Promise<ExtendedPetFacility[]> => {
  const { data, error } = await supabase
    .from('pet_facilities')
    .select(`
      *,
      owner:profiles (
        username,
        email
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching facilities:', error);
    throw new Error(error.message);
  }

  return (data as FacilityResponse[] || []).map((facility) => ({
    ...facility,
    owner_name: facility.owner?.username ?? 'N/A',
    owner_email: facility.owner?.email ?? 'N/A',
  }));
};

// 2. 施設リストを取得するためのカスタムフック
export const useFacilities = (options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: facilityKeys.all,
    queryFn: fetchFacilities,
    ...options,
  });
};

// 3. 施設のステータスを更新するためのカスタムフック
export const useUpdateFacilityStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => {
      const { error } = await supabase
        .from('pet_facilities')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        console.error('Error updating facility status:', error);
        throw new Error(error.message);
      }
    },
    onSuccess: (_, variables) => {
      // IDに基づいて特定のクエリのみを無効化
      void queryClient.invalidateQueries({ 
        queryKey: facilityKeys.detail(variables.id)
      });
    },
  });
};

// 4. 施設を削除するためのカスタムフック
export const useDeleteFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // 関連する画像の削除を最初に実行
      const { error: imageError } = await supabase
        .from('facility_images')
        .delete()
        .eq('facility_id', id);

      if (imageError) {
        console.error('Error deleting facility images:', imageError);
        throw new Error(imageError.message);
      }

      // 施設本体の削除
      const { error } = await supabase
        .from('pet_facilities')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting facility:', error);
        throw new Error(error.message);
      }
    },
    onSuccess: (_, id) => {
      // 無限リロード防止: クエリ無効化を最小限に抑制
      console.log(`Facility ${id} deleted successfully`);
      
      // 削除された特定の施設のクエリのみを無効化
      queryClient.removeQueries({ 
        queryKey: facilityKeys.detail(id)
      });
      
      // 全体リストは一度だけ更新（無限ループ防止）
      setTimeout(() => {
        void queryClient.invalidateQueries({ 
          queryKey: facilityKeys.all,
          exact: true
        });
      }, 100); // 100ms遅延で一度だけ実行
    },
  });
};
