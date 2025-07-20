import React from 'react';
import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import Button from '../Button';

export const UsageRulesSection: React.FC = () => {
  return (
    <>
      {/* 利用ルールへのリンク */}
      <section className="bg-blue-50 p-6 rounded-lg">
        <div className="text-center">
          <h2 className="text-xl font-bold text-blue-900 mb-4">ご利用前に必ずお読みください</h2>
          <p className="text-blue-800 mb-4">
            安全で楽しいドッグラン利用のため、利用ルールをご確認ください
          </p>
          <Link to="/parks/rules">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <FileText className="w-4 h-4 mr-2" />
              ドッグラン利用ルールを確認
            </Button>
          </Link>
        </div>
      </section>

      {/* 料金体系の説明 */}
      <section className="bg-blue-50 p-6 rounded-lg">
        <h2 className="text-2xl font-bold text-center text-blue-900 mb-6">料金体系</h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">単発利用</h3>
            <div className="text-3xl font-bold text-blue-600 mb-2">¥800</div>
            <p className="text-gray-600 mb-4">1回の利用料金</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 最大3時間まで</li>
              <li>• 愛犬3頭まで</li>
              <li>• 全国の提携施設で利用可能</li>
            </ul>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-blue-600 text-white p-6 rounded-lg shadow-lg transform scale-105">
            <h3 className="text-xl font-semibold mb-3">サブスクリプション</h3>
            <div className="text-3xl font-bold mb-2">¥3,800<span className="text-lg">/月</span></div>
            <p className="mb-4 opacity-90">使い放題プラン</p>
            <ul className="text-sm space-y-1 opacity-90">
              <li>• 全国のドッグラン使い放題</li>
              <li>• ペットショップ10%OFF</li>
              <li>• 優先予約権</li>
              <li>• 専用サポート</li>
            </ul>
            <div className="mt-4">
              <span className="bg-white text-purple-600 px-3 py-1 rounded-full text-xs font-medium">
                おすすめ
              </span>
            </div>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">施設貸し切り</h3>
            <div className="text-3xl font-bold text-green-600 mb-2">¥4,400</div>
            <p className="text-gray-600 mb-4">1時間の貸し切り料金</p>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• 完全プライベート空間</li>
              <li>• 愛犬制限なし</li>
              <li>• イベント・パーティーに最適</li>
            </ul>
          </div>
        </div>
        
        <div className="text-center mt-8">
          <Link to="/register">
            <Button className="bg-blue-600 hover:bg-blue-700 text-lg px-8 py-3">
              今すぐ始める
            </Button>
          </Link>
        </div>
      </section>
    </>
  );
};

export default UsageRulesSection; 
