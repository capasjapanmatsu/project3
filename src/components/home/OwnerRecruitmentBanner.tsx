import { Building, Crown, Plus } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../context/AuthContext';

export const OwnerRecruitmentBanner: React.FC = () => {
  const { user } = useAuth();

  // ログイン状態に応じてリンク先を決定
  const getRegistrationLink = () => {
    return user ? '/park-registration-agreement' : '/register';
  };

  // ボタンテキストをログイン状態に応じて変更
  const getButtonText = () => {
    return user ? 'オーナー契約に進む' : 'オーナー登録';
  };

  return (
    <section className="relative overflow-hidden">
      <div 
        className="relative text-white p-8 pb-20 rounded-xl shadow-2xl"
        style={{
          backgroundImage: 'url(/images/owner-recruitment-bg.webp)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* 背景画像の上に半透明オーバーレイを追加してテキストを読みやすくする */}
        <div className="absolute inset-0 bg-black bg-opacity-40 rounded-xl"></div>
        <div className="relative z-10">
          <div className="flex items-center space-x-4 mb-4">
            <div className="bg-white/20 p-3 rounded-full">
              <Building className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center">
                <Crown className="w-6 h-6 mr-2" />
                ドッグランオーナー募集中！
              </h2>
              <p className="text-lg opacity-90">
                あなたの土地をドッグランとして活用しませんか？収益化のチャンスです
              </p>
            </div>
          </div>
        </div>
        
        {/* 下部に配置する横長ボタン */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20">
          <Link to={getRegistrationLink()} className="block">
            <button className="w-full bg-white/80 hover:bg-white/90 text-gray-800 font-bold py-3 px-6 rounded-lg shadow-lg transition-all duration-200 flex items-center justify-center">
              <Plus className="w-5 h-5 mr-2" />
              {getButtonText()}
              <span className="ml-3 text-sm font-normal">初期費用無料・サポート充実</span>
            </button>
          </Link>
        </div>
        
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
      </div>
    </section>
  );
};

export default OwnerRecruitmentBanner; 
