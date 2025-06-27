import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Card from '../components/Card';
import Button from '../components/Button';
import Input from '../components/Input';
import { Mail, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { safeGetItem, safeSetItem } from '../utils/safeStorage';

export function Login() {
  const navigate = useNavigate();
  const { signInWithMagicLink } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState('');

  // ローカルストレージからメールアドレスを取得して自動入力
  useEffect(() => {
    const savedEmail = safeGetItem('lastUsedEmail');
    if (savedEmail) {
      setEmail(savedEmail);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // メールアドレスをローカルストレージに保存
      safeSetItem('lastUsedEmail', email);
      
      const { success, error } = await signInWithMagicLink(email);
      
      if (error) throw new Error(error);
      
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'ログインリンクの送信に失敗しました。メールアドレスを確認してください。');
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
            メールを送信しました
          </h2>
          <p className="text-gray-600 mb-6">
            {email} 宛にドッグパークJPのログイン用リンクを送信しました。メールをご確認いただき、リンクをクリックしてログインしてください。
          </p>
          <p className="text-sm text-gray-500 mb-4">
            メールが届かない場合は、迷惑メールフォルダをご確認いただくか、別のメールアドレスでお試しください。
          </p>
          <Button onClick={() => {
            setSuccess(false);
            setEmail('');
          }}>
            別のメールアドレスを使用
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center mb-8">ログイン</h1>
      <Card>
        <form onSubmit={handleSubmit} className="p-6">
          <div className="text-center mb-6">
            <Mail className="w-12 h-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Magic Linkでログイン</h2>
            <p className="text-gray-600">
              メールアドレスを入力するだけで、ドッグパークJPにログインできます。
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg flex items-start">
              <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          
          <Input
            label="メールアドレス"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            icon={<Mail className="w-4 h-4 text-gray-500" />}
            placeholder="example@email.com"
          />
          
          <Button type="submit" isLoading={isLoading} className="w-full mt-4 bg-blue-600 hover:bg-blue-700">
            <Mail className="w-4 h-4 mr-2" />
            ログインリンクを送信
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-start space-x-3">
              <Mail className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Magic Linkとは？</p>
                <p>パスワードを覚える必要がなく、メールに送信されたリンクをクリックするだけで安全にログインできる便利な認証方法です。</p>
                <ul className="mt-2 space-y-1">
                  <li>• パスワードを忘れる心配なし</li>
                  <li>• より安全なログイン体験</li>
                  <li>• ワンクリックでログイン完了</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              アカウントをお持ちでない方は{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
                こちらから新規登録
              </Link>
            </p>
          </div>
        </form>
      </Card>
    </div>
  );
}