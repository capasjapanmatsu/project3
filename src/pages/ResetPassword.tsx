import { createClient } from '@supabase/supabase-js';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// パスワードリセット専用の独立したクライアント
const resetClient = createClient(
  import.meta.env.VITE_SUPABASE_URL as string,
  import.meta.env.VITE_SUPABASE_ANON_KEY as string,
  {
    auth: {
      persistSession: false, // セッションを永続化しない
      autoRefreshToken: false, // トークンの自動更新を無効
      detectSessionInUrl: false // URLからのセッション検出を無効
    }
  }
);

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [resetToken, setResetToken] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthStateChange = () => {
      const processAuth = (): void => {
        try {
          setIsLoading(true);
          
          // URL fragmentから認証情報を取得
          const hashParams = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');
          const type = hashParams.get('type');
          
          console.log('Auth params:', { 
            hasAccessToken: !!accessToken, 
            hasRefreshToken: !!refreshToken, 
            type 
          });

          if (type === 'recovery' && accessToken && refreshToken) {
            // トークンを保存（後でパスワード更新に使用）
            setResetToken(accessToken);
            setIsValidSession(true);
            setMessage('✅ 認証が完了しました。新しいパスワードを設定してください。');
            
            // URLをクリーンアップ（トークン情報を削除）
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            // URLパラメータから確認（フォールバック）
            const urlParams = new URLSearchParams(window.location.search);
            const token = urlParams.get('token');
            const urlType = urlParams.get('type');
            
            if (urlType === 'recovery' && token) {
              setResetToken(token);
              setIsValidSession(true);
              setMessage('✅ 新しいパスワードを設定してください。');
            } else {
              setMessage('❌ 無効なパスワードリセットリンクです。再度パスワードリセットを行ってください。');
              setIsValidSession(false);
            }
          }
        } catch (error) {
          console.error('Auth error:', error);
          setMessage('❌ 認証処理中にエラーが発生しました。再度お試しください。');
          setIsValidSession(false);
        } finally {
          setIsLoading(false);
        }
      };
      
      processAuth();
    };

    handleAuthStateChange();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setMessage('❌ パスワードが一致しません。');
      return;
    }
    
    if (password.length < 6) {
      setMessage('❌ パスワードは6文字以上で入力してください。');
      return;
    }
    
    if (!resetToken) {
      setMessage('❌ リセットトークンが見つかりません。再度パスワードリセットを行ってください。');
      return;
    }
    
    setSubmitting(true);
    setMessage('🔄 パスワードを更新中...');
    
    try {
      // 専用クライアントでセッションを一時的に設定
      const { error: sessionError } = await resetClient.auth.setSession({
        access_token: resetToken,
        refresh_token: resetToken // 簡易的にアクセストークンを使用
      });
      
      if (sessionError) {
        throw sessionError;
      }
      
      // パスワードを更新
      const { error: updateError } = await resetClient.auth.updateUser({ 
        password: password 
      });
      
      if (updateError) {
        throw updateError;
      }
      
      // 専用クライアントのセッションをクリア
      await resetClient.auth.signOut();
      
      setMessage('✅ パスワードが正常に変更されました！ログイン画面に移動します...');
      
      // 成功通知
      if ('Notification' in window && Notification.permission === 'granted') {
        void new Notification('パスワード変更完了', {
          body: 'パスワードが正常に変更されました。新しいパスワードでログインしてください。',
          icon: '/favicon.svg'
        });
      }
      
      // 3秒後にログイン画面に遷移
      setTimeout(() => {
        void navigate('/login');
      }, 3000);
      
    } catch (error: unknown) {
      console.error('Password update error:', error);
      const errorMessage = error instanceof Error ? error.message : '不明なエラー';
      
      if (errorMessage.includes('session_not_found')) {
        setMessage('❌ セッションが見つかりません。パスワードリセットを最初からやり直してください。');
      } else if (errorMessage.includes('invalid_token')) {
        setMessage('❌ 無効なトークンです。パスワードリセットを最初からやり直してください。');
      } else if (errorMessage.includes('Token has expired')) {
        setMessage('❌ リセットリンクの有効期限が切れています。新しいパスワードリセットを行ってください。');
      } else {
        setMessage(`❌ パスワードの更新に失敗しました: ${errorMessage}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">認証情報を確認中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4 text-center">パスワード再設定</h2>
      
      {message && (
        <div className={`mb-4 p-4 rounded-lg border ${
          message.includes('✅') || message.includes('設定してください') 
            ? 'text-green-700 bg-green-100 border-green-300' 
            : message.includes('❌')
            ? 'text-red-700 bg-red-100 border-red-300'
            : message.includes('🔄')
            ? 'text-blue-700 bg-blue-100 border-blue-300'
            : 'text-gray-700 bg-gray-100 border-gray-300'
        }`}>
          <p className="text-sm">{message}</p>
        </div>
      )}
      
      {isValidSession ? (
        <form onSubmit={(e) => void handleSubmit(e)}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              新しいパスワード *
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="6文字以上で入力してください"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              パスワード確認 *
            </label>
            <input
              type="password"
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="パスワードを再入力してください"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={submitting}
          >
            {submitting ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                更新中...
              </span>
            ) : (
              'パスワードを変更'
            )}
          </button>
        </form>
      ) : (
        <div className="text-center">
          <div className="mb-6">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <p className="text-gray-600 mb-4">
              パスワードリセットリンクが無効または期限切れです。
            </p>
          </div>
          
          <button
            onClick={() => navigate('/forgot-password')}
            className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
          >
            パスワードリセットを再実行
          </button>
        </div>
      )}
    </div>
  );
};

export default ResetPassword;
