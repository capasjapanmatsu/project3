import { supabase } from './supabase';

interface DeployOptions {
  buildCommand?: string;
  outputDir?: string;
  siteId?: string;
  deployId?: string;
}

export async function deployToNetlify(options: DeployOptions = {}) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.access_token) {
      throw new Error('認証が必要です');
    }

    const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/deploy-to-netlify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        buildCommand: options.buildCommand || 'npm run build',
        outputDir: options.outputDir || 'dist',
        siteId: options.siteId,
        deployId: options.deployId,
        netlifyApiKey: import.meta.env.VITE_NETLIFY_API_KEY, // Add Netlify API key
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'デプロイに失敗しました');
    }

    return await response.json();
  } catch (error) {
    console.error('Deploy error:', error);
    throw error;
  }
}

export async function getDeploymentStatus(siteId: string, deployId: string) {
  try {
    return await deployToNetlify({ siteId, deployId });
  } catch (error) {
    console.error('Error getting deployment status:', error);
    throw error;
  }
}