import { supabase } from './supabase';

export async function getDeploymentStatus(options: { id?: string } = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('認証が必要です');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/getDeploymentStatus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        id: options.id,
        netlifyApiKey: import.meta.env.VITE_NETLIFY_API_KEY, // Add Netlify API key
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'デプロイステータスの取得に失敗しました');
    }

    return await response.json();
  } catch (error) {
    console.error('Error getting deployment status:', error);
    throw error;
  }
}