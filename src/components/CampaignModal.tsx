import { Gift, Sparkles, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from './Button';

interface CampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CampaignModal: React.FC<CampaignModalProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldShow(true);
      // 少し遅延してアニメーション開始
      setTimeout(() => setIsAnimating(true), 100);
    } else {
      setIsAnimating(false);
      // アニメーション完了後に非表示
      setTimeout(() => setShouldShow(false), 1000);
    }
  }, [isOpen]);

  if (!shouldShow) return null;

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => onClose(), 1000);
  };

  const handleSubscribeClick = () => {
    handleClose();
    setTimeout(() => navigate('/subscription-intro'), 1000);
  };

  const handleLaterClick = () => {
    handleClose();
  };

  return (
    <>
      {/* バックドロップ */}
      <div 
        className={`fixed inset-0 bg-black z-50 flex items-end sm:items-center justify-center p-4 transition-opacity duration-1000 ease-in-out ${
          isAnimating ? 'bg-opacity-50' : 'bg-opacity-0'
        }`}
        onClick={handleClose}
      >
        {/* モーダル本体 */}
        <div 
          className={`bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden transition-all duration-1000 ease-out ${
            isAnimating 
              ? 'translate-y-0 opacity-100 scale-100' 
              : 'translate-y-full sm:translate-y-12 opacity-0 scale-95'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ヘッダー - グラデーション背景（縦幅を縮小） */}
          <div className="bg-gradient-to-br from-sky-100 via-sky-200 to-blue-200 px-6 py-4 text-slate-700 relative" style={{
            backgroundImage: `
              radial-gradient(ellipse 200px 100px at 20% 30%, rgba(255, 255, 255, 0.4) 0%, transparent 50%),
              radial-gradient(ellipse 150px 80px at 80% 20%, rgba(255, 255, 255, 0.3) 0%, transparent 50%),
              radial-gradient(ellipse 180px 90px at 60% 70%, rgba(255, 255, 255, 0.2) 0%, transparent 50%),
              radial-gradient(ellipse 120px 60px at 30% 80%, rgba(255, 255, 255, 0.3) 0%, transparent 50%)
            `
          }}>
            <button
              onClick={handleClose}
              className="absolute top-3 right-4 text-slate-700 hover:text-slate-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="text-center">
              <div className="flex justify-center mb-2">
                <div className="bg-white bg-opacity-30 rounded-full p-2">
                  <Sparkles className="w-6 h-6 text-yellow-500" />
                </div>
              </div>
              <h2 className="text-xl font-bold mb-1">
                🎉 特別キャンペーン実施中！
              </h2>
              <p className="text-sm opacity-90">
                今だけ限定オファー
              </p>
            </div>
          </div>

          {/* コンテンツ（縦幅を縮小） */}
          <div className="px-6 py-4">
            <div className="text-center mb-4">
              <div className="inline-flex items-center bg-red-100 text-red-800 px-3 py-1 rounded-full mb-3">
                <Gift className="w-4 h-4 mr-1" />
                <span className="font-semibold text-sm">初回限定特典</span>
              </div>
              
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                初月<span className="text-red-500">完全無料</span>
              </h3>
              
              <p className="text-gray-600 text-sm mb-3">
                サブスクリプション初回登録の方限定で<br />
                <span className="font-semibold text-purple-600">初月無料</span>でご利用いただけます！
              </p>
            </div>

            {/* 特典一覧（縦幅を縮小） */}
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
              <h4 className="font-semibold text-gray-900 mb-2 text-center text-sm">
                🎁 サブスク特典
              </h4>
              <ul className="space-y-1 text-xs">
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

            {/* 注意事項（縦幅を縮小） */}
            <div className="text-xs text-gray-500 text-center mb-4">
              ※ 初月無料は月末まで適用されます<br />
              ※ いつでもマイページから解約可能です
            </div>

            {/* アクションボタン（縦幅を縮小） */}
            <div className="space-y-2">
              <Button
                onClick={handleSubscribeClick}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 text-base shadow-lg"
              >
                🚀 今すぐ無料で始める
              </Button>
              
              <Button
                onClick={handleLaterClick}
                variant="secondary"
                className="w-full text-gray-600 border-gray-300 hover:bg-gray-50 py-2"
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