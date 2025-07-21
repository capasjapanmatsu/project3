import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FacilityApplication } from '../types'; // Assuming types are in /types
import { supabase } from '../utils/supabase';

// 施設データを取得するためのキー
const facilityKeys = {
  all: ['facilities'] as const,
  list: (filters: string) => [...facilityKeys.all, 'list', filters] as const,
  detail: (id: string) => [...facilityKeys.all, 'detail', id] as const,
};

// 1. 効率的なデータ取得関数
// 施設情報と所有者情報を一度に取得
const fetchFacilities = async (): Promise<FacilityApplication[]> => {
  const { data, error } = await supabase
    .from('pet_facilities')
    .select(`
      *,
      owner:profiles (
        username,
        email
      )
    `);

  if (error) {
    console.error('Error fetching facilities:', error);
    throw new Error(error.message);
  }

  // 取得したデータをアプリケーションで使いやすい形式に整形
  return data.map((facility: any) => ({
    ...facility,
    owner_name: facility.owner?.username || 'N/A',
    owner_email: facility.owner?.email || 'N/A',
  }));
};

// 2. 施設リストを取得するためのカスタムフック (useQuery)
export const useFacilities = () => {
  return useQuery({
    queryKey: facilityKeys.all,
    queryFn: fetchFacilities,
  });
};

// 3. 施設のステータスを更新するためのカスタムフック (useMutation)
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
    // 成功時にキャッシュを無効化し、データを再取得
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: facilityKeys.all });
    },
  });
};

// 4. 施設を削除するためのカスタムフック (useMutation)
export const useDeleteFacility = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // TODO: 関連データの削除ロジックをここに集約する (例: facility_images)
      // この例では簡略化のため施設本体の削除のみ
      const { error } = await supabase
        .from('pet_facilities')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting facility:', error);
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: facilityKeys.all });
    },
  });
};
