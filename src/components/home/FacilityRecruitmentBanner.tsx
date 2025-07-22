import { Building2, Heart, Plus } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';
import useAuth from '../../context/AuthContext';
import Button from '../Button';

export const FacilityRecruitmentBanner: React.FC = () => {
  const { user } = useAuth();

  // ログイン状態に応じてリンク先を決定
  const getRegistrationLink = () => {
    return user ? '/facility-registration' : '/register';
  };

  // ボタンテキストをログイン状態に応じて変更
  const getButtonText = () => {
    return user ? '施設掲載に進む' : '施設登録';
  };

  return (
    <section className="relative overflow-hidden">
      <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 text-white p-8 rounded-xl shadow-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 p-3 rounded-full">
              <Building2 className="w-8 h-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2 flex items-center">
                <Heart className="w-6 h-6 mr-2" />
                ワンちゃんと行ける施設掲載募集中！
              </h2>
              <p className="text-lg opacity-90">
                ペットショップ、動物病院、カフェなど、ワンちゃんと一緒に行ける施設を掲載しませんか？
              </p>
            </div>
          </div>
          <div className="text-right">
            <Link to={getRegistrationLink()}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 text-lg shadow-md">
                <Plus className="w-5 h-5 mr-2" />
                {getButtonText()}
              </Button>
            </Link>
            <p className="text-sm opacity-80 mt-2">掲載料無料・サポート充実</p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
      </div>
    </section>
  );
};

export default FacilityRecruitmentBanner; 