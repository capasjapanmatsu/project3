import { Gift, Sparkles, X } from 'lucide-react';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CampaignModal: React.FC<CampaignModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleSubscribeClick = () => {
    onClose();
    navigate('/subscription-intro');
  };

  const handleLaterClick = () => {
    onClose();
  };

  return (
    <>
      {/* バックドロップ */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        {/* モーダル本体 */}
        <div 
          className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transform transition-all duration-300 scale-100"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー - グラデーション背景 */}
          <div className="bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 px-6 py-8 text-white relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            
            <div className="text-center">
              <div className="flex justify-center mb-3">
                <div className="bg-white bg-opacity-20 rounded-full p-3">
                  <Sparkles className="w-8 h-8 text-yellow-300" />
                </div>
              </div>
              <h2 className="text-2xl font-bold mb-2">
                🎉 特別キャンペーン実施中！
              </h2>
              <p className="text-lg opacity-90">
                今だけ限定オファー
              </p>
            </div>
          </div>

          {/* コンテンツ */}
          <div className="px-6 py-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center bg-red-100 text-red-800 px-4 py-2 rounded-full mb-4">
                <Gift className="w-5 h-5 mr-2" />
                <span className="font-semibold">初回限定特典</span>
              </div>
              
              <h3 className="text-3xl font-bold text-gray-900 mb-2">
                初月<span className="text-red-500">完全無料</span>
              </h3>
              
              <p className="text-gray-600 mb-4">
                サブスクリプション初回登録の方限定で<br />
                <span className="font-semibold text-purple-600">初月無料</span>でご利用いただけます！
              </p>
            </div>

            {/* 特典一覧 */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-semibold text-gray-900 mb-3 text-center">
                🎁 サブスク特典
              </h4>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>全国どこのドッグランでも使い放題</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>ペットショップでの購入が10%OFF</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>全商品送料無料</span>
                </li>
                <li className="flex items-center">
                  <span className="text-green-500 mr-2">✓</span>
                  <span>ドッグラン施設レンタル20%OFF</span>
                </li>
              </ul>
            </div>

            {/* 注意事項 */}
            <div className="text-xs text-gray-500 text-center mb-6">
              ※ 初月無料は月末まで適用されます<br />
              ※ いつでもマイページから解約可能です
            </div>

            {/* アクションボタン */}
            <div className="space-y-3">
              <Button
                onClick={handleSubscribeClick}
                className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold py-3 text-lg shadow-lg"
              >
                🚀 今すぐ無料で始める
              </Button>
              
              <Button
                onClick={handleLaterClick}
                variant="secondary"
                className="w-full text-gray-600 border-gray-300 hover:bg-gray-50"
              >
                後で確認する
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CampaignModal; 