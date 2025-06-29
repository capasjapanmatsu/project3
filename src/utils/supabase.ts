import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables');
  throw new Error('Supabase configuration is missing. Please check your .env file.');
}

// Validate Supabase URL format
try {
  new URL(supabaseUrl);
} catch (error) {
  console.error('Invalid Supabase URL format:', supabaseUrl);
  throw new Error('Invalid Supabase URL format. Please check your VITE_SUPABASE_URL in .env file.');
}

// Enhanced fetch function with better error handling and retry logic
const enhancedFetch = async (...args: Parameters<typeof fetch>): Promise<Response> => {
  const controller = new AbortController();
  const { signal } = controller;
  
  // Set timeout to 15 seconds initially
  const timeoutId = setTimeout(() => controller.abort(), 15000);
  
  try {
    const response = await fetch(args[0], {
      ...args[1],
      signal,
      headers: {
        ...args[1]?.headers,
        'Cache-Control': 'no-cache',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });
    
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    console.warn('Initial fetch failed:', error);
    
    // Check if it's a network-related error that might benefit from retry
    const isRetryableError = 
      error instanceof TypeError ||
      error.name === 'AbortError' ||
      error.message.includes('NetworkError') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('fetch');
    
    if (isRetryableError) {
      console.warn('Network error detected, attempting retry after delay...');
      
      // Wait 2 seconds before retry
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Create new controller for retry
      const retryController = new AbortController();
      const retryTimeoutId = setTimeout(() => retryController.abort(), 20000); // Longer timeout for retry
      
      try {
        const retryResponse = await fetch(args[0], {
          ...args[1],
          signal: retryController.signal,
          headers: {
            ...args[1]?.headers,
            'Cache-Control': 'no-cache',
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });
        
        clearTimeout(retryTimeoutId);
        console.log('Retry successful');
        return retryResponse;
      } catch (retryError) {
        clearTimeout(retryTimeoutId);
        console.error('Retry also failed:', retryError);
        
        // Provide more specific error information
        if (retryError.name === 'AbortError') {
          throw new Error('Connection timeout - please check your internet connection and try again');
        } else if (retryError instanceof TypeError) {
          throw new Error('Network connection failed - please check if Supabase is accessible from your network');
        }
        
        throw retryError;
      }
    }
    
    throw error;
  }
};

// Create a single instance of the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'supabase.auth.token',
  },
  global: {
    fetch: enhancedFetch,
  },
  realtime: {
    params: {
      eventsPerSecond: 5,
    },
  },
});

// Enhanced connection test function with better error reporting
export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('Testing Supabase connection to:', supabaseUrl);
    
    // First, try a simple health check by accessing the REST API root
    const healthCheckUrl = `${supabaseUrl}/rest/v1/`;
    
    try {
      const healthResponse = await fetch(healthCheckUrl, {
        method: 'HEAD',
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
      });
      
      if (!healthResponse.ok) {
        console.error('Supabase health check failed:', healthResponse.status, healthResponse.statusText);
        return false;
      }
      
      console.log('Supabase health check passed');
    } catch (healthError) {
      console.error('Supabase health check error:', healthError);
      return false;
    }
    
    // Then try a simple query
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test error:', error);
    
    // Provide specific guidance based on error type
    if (error instanceof TypeError || error.message.includes('NetworkError')) {
      console.error('Network connectivity issue detected. Please check:');
      console.error('1. Your internet connection');
      console.error('2. Firewall or VPN settings');
      console.error('3. Whether Supabase URL is accessible:', supabaseUrl);
    }
    
    return false;
  }
};

// Helper function to handle Supabase errors consistently
export const handleSupabaseError = (error: any): string => {
  console.error('Supabase error:', error);
  
  // Handle refresh token errors by signing out the user
  if (error?.message?.includes('refresh_token_not_found') || 
      error?.body?.includes('refresh_token_not_found') ||
      error?.code === 'refresh_token_not_found') {
    console.warn('Invalid refresh token detected, signing out user');
    supabase.auth.signOut();
    return 'セッションが無効になりました。再度ログインしてください。';
  }
  
  // Handle network connectivity issues with more specific messages
  if (error?.message?.includes('NetworkError') || 
      error?.message?.includes('Failed to fetch') ||
      error?.name === 'TypeError' && error?.message?.includes('fetch')) {
    return 'ネットワーク接続に問題があります。以下をご確認ください：\n• インターネット接続\n• ファイアウォール設定\n• VPN設定\n• Supabaseサービスの状態';
  }
  
  if (error?.message?.includes('timed out') || 
      error?.name === 'AbortError' ||
      error?.message?.includes('timeout')) {
    return 'リクエストがタイムアウトしました。ネットワーク接続を確認してもう一度お試しください。';
  }
  
  // Handle CORS errors
  if (error?.message?.includes('CORS') || error?.message?.includes('cross-origin')) {
    return 'CORS設定に問題があります。Supabaseプロジェクトの設定を確認してください。';
  }
  
  // Handle authentication errors
  if (error?.code === 'PGRST301' || error?.message?.includes('JWT')) {
    return '認証に問題があります。再度ログインしてください。';
  }
  
  if (error?.code === '23505') {
    return '既に存在するデータです。';
  }
  
  if (error?.message) {
    return error.message;
  }
  
  return '予期せぬエラーが発生しました。もう一度お試しください。';
};

// Helper function to check if we're in development mode
export const isDevelopment = () => {
  return import.meta.env.DEV;
};

// Helper function to safely execute Supabase queries with fallback
export const safeSupabaseQuery = async <T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  fallbackData: T | null = null
): Promise<{ data: T | null; error: any; isOffline: boolean }> => {
  try {
    const result = await queryFn();
    return { ...result, isOffline: false };
  } catch (error) {
    console.error('Supabase query failed:', error);
    
    // Check if it's a network error
    if (error?.message?.includes('NetworkError') || 
        error?.message?.includes('Failed to fetch') ||
        error?.name === 'TypeError') {
      return { 
        data: fallbackData, 
        error: null, 
        isOffline: true 
      };
    }
    
    return { 
      data: fallbackData, 
      error, 
      isOffline: false 
    };
  }
};

// Function to check Supabase service status
export const checkSupabaseStatus = async (): Promise<{ isOnline: boolean; message: string }> => {
  try {
    // Try to access Supabase status page or a simple endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
    });
    
    if (response.ok) {
      return { isOnline: true, message: 'Supabase is accessible' };
    } else {
      return { 
        isOnline: false, 
        message: `Supabase returned status: ${response.status} ${response.statusText}` 
      };
    }
  } catch (error) {
    console.error('Supabase status check failed:', error);
    
    if (error instanceof TypeError || error.message.includes('NetworkError')) {
      return { 
        isOnline: false, 
        message: 'Network error - check your internet connection and firewall settings' 
      };
    }
    
    return { 
      isOnline: false, 
      message: `Connection failed: ${error.message}` 
    };
  }
};