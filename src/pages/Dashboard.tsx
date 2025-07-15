import { useEffect, useState } from 'react';
import { supabase } from '../utils/supabase';
import { User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router-dom';
import { PawPrint, LogOut } from 'lucide-react';

function Dashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
      
      if (!user) {
        navigate('/login');
      }
    };

    getUser();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <PawPrint className="w-8 h-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>ログアウト</span>
          </button>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold text-green-800 mb-2">ログイン成功！</h2>
          <p className="text-green-700">
            ようこそ、{user.email}さん！
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-800 mb-2">プロフィール</h3>
            <p className="text-blue-700 text-sm">
              メールアドレス: {user.email}
            </p>
            <p className="text-blue-700 text-sm">
              ユーザーID: {user.id}
            </p>
          </div>
          
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h3 className="font-semibold text-purple-800 mb-2">ドッグラン</h3>
            <p className="text-purple-700 text-sm">
              お近くのドッグランを検索・予約できます
            </p>
          </div>
          
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-orange-800 mb-2">ペット情報</h3>
            <p className="text-orange-700 text-sm">
              愛犬の情報を登録・管理できます
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard; 