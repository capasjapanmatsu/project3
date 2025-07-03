import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import { supabase } from '../utils/supabase';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';

export function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  useEffect(() => {
    // URLからアクセストークンを取得（複数の方法を試す）
    let accessToken = null;
    let refreshToken = null;

    // 方法1: URLハッシュから取得
    if (window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      accessToken = hashParams.get('access_token');
      refreshToken = hashParams.get('refresh_token');
    }

    // 方法2: URLパラメータから取得
    if (!accessToken && window.location.search) {
      const searchParams = new URLSearchParams(window.location.search);
      accessToken = searchParams.get('access_token');
      refreshToken = searchParams.get('refresh_token');
    }

    // 方法3: 現在のセッションを確認
    if (!accessToken) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session) {
          // セッションが存在する場合はそのまま続行
          return;
        } else {
          setError('セッションが見つかりません。再度パスワードリセットを行ってください。');
        }
      });
      return;
    }

    if (accessToken && refreshToken) {
      // セッションを設定
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      }).then(({ error }) => {
        if (error) {
          console.error('Session setting error:', error);
          setError('セッションの設定に失敗しました。再度パスワードリセットを行ってください。');
        }
      });
    } else {
      setError('無効なリセットリンクです。再度パスワードリセットを行ってください。');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('パスワードが一致しません');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('パスワードは6文字以上で入力してください');
      setIsLoading(false);
      return;
    }

    try {
      // 現在のセッションを確認
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error('セッションが見つかりません。再度ログインしてください。');
      }

      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      });

      if (error) throw error;

      setSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      console.error('Password reset error:', err);
      setError((err as Error).message || 'パスワードリセットに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="max-w-md mx-auto">
        <Card className="text-center p-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            パスワードが更新されました
          </h2>
          <p className="text-gray-600 mb-4">
            新しいパスワードでログインできます。3秒後にログインページに移動します。
          </p>
          <Button onClick={() => navigate('/login')}>
            ログインページへ
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-8">パスワードリセット</h1>
      <Card>
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
              {error}
            </div>
          )}
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              新しいパスワード *
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="6文字以上"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-500" />
              </div>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              新しいパスワード（確認） *
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                minLength={6}
                className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="パスワードを再入力"
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-4 w-4 text-gray-500" />
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-700"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              <span className="font-medium">パスワードの要件：</span><br />
              • 6文字以上<br />
              • 英数字を含むことを推奨<br />
              • 特殊文字を含むことを推奨
            </p>
          </div>

          <Button type="submit" isLoading={isLoading} className="w-full">
            <Lock className="w-4 h-4 mr-2" />
            パスワードを更新
          </Button>
        </form>
      </Card>
    </div>
  );
}