import { useNotifications } from '@/store/uiStore';
import { supabase } from '@/utils/supabase';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// Query Keys の定数定義
export const QUERY_KEYS = {
  // 商品関連
  products: ['products'] as const,
  product: (id: string) => ['products', id] as const,
  productsByCategory: (category: string) => ['products', 'category', category] as const,
  
  // ドッグパーク関連
  dogParks: ['dogParks'] as const,
  dogPark: (id: string) => ['dogParks', id] as const,
  nearbyParks: (lat: number, lng: number) => ['dogParks', 'nearby', lat, lng] as const,
  
  // ユーザー関連
  userProfile: (id: string) => ['profile', id] as const,
  userDogs: (userId: string) => ['dogs', userId] as const,
  
  // 予約関連
  reservations: (userId: string) => ['reservations', userId] as const,
  parkReservations: (parkId: string) => ['reservations', 'park', parkId] as const,
  
  // 管理者関連
  adminUsers: ['admin', 'users'] as const,
  adminStats: ['admin', 'stats'] as const,
} as const;

// 商品データのクエリフック
export const useProducts = () => {
  return useQuery({
    queryKey: QUERY_KEYS.products,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 10, // 商品は10分キャッシュ
  });
};

// 単一商品のクエリフック
export const useProduct = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.product(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

// カテゴリ別商品のクエリフック
export const useProductsByCategory = (category: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.productsByCategory(category),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', category)
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!category,
  });
};

// ドッグパークのクエリフック
export const useDogParks = () => {
  return useQuery({
    queryKey: QUERY_KEYS.dogParks,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dog_parks')
        .select('*')
        .eq('status', 'approved')
        .order('name');
      
      if (error) throw error;
      return data;
    },
    staleTime: 1000 * 60 * 15, // パークは15分キャッシュ
  });
};

// 単一ドッグパークのクエリフック
export const useDogPark = (id: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.dogPark(id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dog_parks')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

// ユーザープロフィールのクエリフック
export const useUserProfile = (userId: string) => {
  return useQuery({
    queryKey: QUERY_KEYS.userProfile(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
};

// 商品作成・更新のミューテーションフック
export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  const { success, error: showError } = useNotifications();

  return useMutation({
    mutationFn: async (productData: any) => {
      const { data, error } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // キャッシュを無効化して再フェッチ
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.productsByCategory(data.category) 
      });
      
      success('商品を作成しました', '新しい商品が正常に登録されました');
    },
    onError: (error) => {
      console.error('Product creation error:', error);
      showError('商品作成エラー', '商品の作成に失敗しました');
    },
  });
};

// 商品更新のミューテーションフック
export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  const { success, error: showError } = useNotifications();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & any) => {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // 特定の商品キャッシュを更新
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.product(data.id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
      queryClient.invalidateQueries({ 
        queryKey: QUERY_KEYS.productsByCategory(data.category) 
      });
      
      success('商品を更新しました', '商品情報が正常に更新されました');
    },
    onError: (error) => {
      console.error('Product update error:', error);
      showError('商品更新エラー', '商品の更新に失敗しました');
    },
  });
};

// 商品削除のミューテーションフック
export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  const { success, error: showError } = useNotifications();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      // キャッシュから削除
      queryClient.removeQueries({ queryKey: QUERY_KEYS.product(id) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.products });
      
      success('商品を削除しました', '商品が正常に削除されました');
    },
    onError: (error) => {
      console.error('Product deletion error:', error);
      showError('商品削除エラー', '商品の削除に失敗しました');
    },
  });
};

// カスタムフック: ミューテーションのローディング状態管理
export const useMutationLoading = (mutations: Array<{ isPending: boolean }>) => {
  return mutations.some(mutation => mutation.isPending);
}; 