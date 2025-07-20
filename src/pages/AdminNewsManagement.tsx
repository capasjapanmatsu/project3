import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Bell
} from 'lucide-react';
import { NewsManagement } from '../components/admin/NewsManagement';
import useAuth from '../context/AuthContext';

export function AdminNewsManagement() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // 管理者権限チェック
    if (!isAdmin) {
      navigate('/');
      return;
    }
  }, [isAdmin, navigate]);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/admin">
            <button className="p-2 text-gray-600 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              <Bell className="w-8 h-8 text-yellow-600 mr-3" />
              新着情報管理
            </h1>
            <p className="text-gray-600">サイトの新着情報を管理します</p>
          </div>
        </div>
        <div className="text-sm text-gray-500">
          最終更新: {new Date().toLocaleString('ja-JP')}
        </div>
      </div>

      {/* 新着情報管理コンポーネント */}
      <NewsManagement />
    </div>
  );
} 
