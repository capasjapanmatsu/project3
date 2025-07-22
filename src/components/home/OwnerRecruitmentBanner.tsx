import { Building, Crown, Plus } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../context/AuthContext';
import Button from '../Button';

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
      <div className="bg-gradient-to-r from-green-600 via-blue-600 to-purple-600 text-white p-8 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
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
          <div className="text-right">
            <Link to={getRegistrationLink()}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 text-lg shadow-md border-blue-600">
                <Plus className="w-5 h-5 mr-2" />
                {getButtonText()}
              </Button>
            </Link>
            <p className="text-sm opacity-80 mt-2">初期費用無料・サポート充実</p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
      </div>
    </section>
  );
};

export default OwnerRecruitmentBanner; 
