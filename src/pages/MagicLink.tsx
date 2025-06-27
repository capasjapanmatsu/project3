import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import { Mail, CheckCircle, AlertTriangle, Loader } from 'lucide-react';
import { supabase } from '../utils/supabase';
import { safeSetItem } from '../utils/safeStorage';

export function MagicLink() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const handleMagicLinkAuth = async () => {
      try {
        setIsLoading(true);
        
        // Check for hash parameters (Magic Link callback)
        const hash = window.location.hash;
        if (!hash || !hash.includes('access_token')) {
          setError('無効なMagic Linkです。もう一度ログインしてください。');
          return;
        }
        
        // Parse the hash to get the tokens
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        
        if (!accessToken || !refreshToken) {
          setError('認証トークンが見つかりません。もう一度ログインしてください。');
          return;
        }
        
        // Set the session with the tokens
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });
        
        if (sessionError) {
          throw sessionError;
        }
        
        // Get the user data to confirm authentication
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          throw userError || new Error('ユーザー情報の取得に失敗しました');
        }
        
        // Check if profile exists, create if not
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', user.id)
          .maybeSingle();
          
        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Profile check error:', profileError);
        }
        
        if (!profile) {
          // Create profile from user metadata
          const userData = user.user_metadata || {};
          
          const { error: createProfileError } = await supabase
            .from('profiles')
            .upsert([{
              id: user.id,
              user_type: userData.user_type || 'user',
              name: userData.name || user.email?.split('@')[0] || 'ユーザー',
              postal_code: userData.postal_code || '',
              address: userData.address || '',
              phone_number: userData.phone_number || '',
            }], { onConflict: 'id' });
            
          if (createProfileError) {
            console.error('Profile creation error:', createProfileError);
            // Continue even if profile creation fails
          }
        }
        
        // Set trusted device if needed
        if (user) {
          safeSetItem(`trusted_device_${user.id}`, 'true');
        }
        
        setSuccess(true);
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      } catch (err: any) {
        console.error('Magic Link authentication error:', err);
        setError(err.message || '認証に失敗しました。もう一度ログインしてください。');
      } finally {
        setIsLoading(false);
      }
    };
    
    handleMagicLinkAuth();
  }, [navigate, location]);

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="text-center p-8">
          <Loader className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            ログイン処理中...
          </h2>
          <p className="text-gray-600">
            Magic Linkを処理しています。しばらくお待ちください。
          </p>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="text-center p-8">
          <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            エラーが発生しました
          </h2>
          <p className="text-gray-600 mb-6">
            {error}
          </p>
          <Button onClick={() => navigate('/login')}>
            ログインページに戻る
          </Button>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="text-center p-8">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            ログイン成功！
          </h2>
          <p className="text-gray-600 mb-4">
            Magic Linkでのログインに成功しました。ダッシュボードにリダイレクトします...
          </p>
          <Button onClick={() => navigate('/dashboard')}>
            ダッシュボードへ
          </Button>
        </Card>
      </div>
    );
  }

  return null;
}