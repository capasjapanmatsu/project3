import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Shield, 
  Building, 
  DollarSign, 
  Percent, 
  Clock, 
  Lock, 
  Loader
} from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { supabase } from '../utils/supabase';
import { useAuth } from '../context/AuthContext';

export function ParkRegistrationAgreement() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isAgreementChecked, setIsAgreementChecked] = useState(false);

  const handleAgreementSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isAgreementChecked) {
      setError('契約内容に同意してください。');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // 同意情報をデータベースに保存
      const { error: agreementError } = await supabase
        .from('owner_agreements')
        .upsert([
          {
            user_id: user?.id,
            agreed_at: new Date().toISOString(),
            agreement_version: '1.0',
            agreement_type: 'park_owner'
          }
        ]);

      if (agreementError) throw agreementError;

      // 次のステップへ
      navigate('/register-park');
    } catch (err) {
      console.error('Error submitting agreement:', err);
      setError((err as Error).message || '契約同意の処理に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center space-x-4 mb-6">
        <Link
          to="/dashboard"
          className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          ダッシュボードに戻る
        </Link>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4 flex items-center justify-center">
          <Building className="w-8 h-8 text-blue-600 mr-3" />
          ドッグランオーナー契約
        </h1>
        <p className="text-lg text-gray-600">
          ドッグランオーナーとして登録する前に、契約内容をご確認ください
        </p>
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="bg-red-100 border border-red-300 text-red-800 rounded-lg p-4 flex items-start">
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* 契約内容 */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center">
          <FileText className="w-6 h-6 text-blue-600 mr-2" />
          ドッグランオーナー契約内容
        </h2>
        
        <div className="space-y-6">
          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
              <Building className="w-5 h-5 text-blue-600 mr-2" />
              施設運営について
            </h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>1. オーナーは、ドッグラン施設の安全性と清潔さを維持する責任があります。</p>
              <p>2. 施設は24時間営業を基本とし、無人運営システムを導入します。</p>
              <p>3. 週に1回以上の定期的な施設点検・清掃が必要です。</p>
              <p>4. 緊急時には1時間以内に施設に到着できる体制を整えてください。</p>
              <p>5. 施設内でのトラブルや事故に関しては、当社は一切の責任を負いません。</p>
            </div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2 flex items-center">
              <DollarSign className="w-5 h-5 text-green-600 mr-2" />
              料金と収益配分
            </h3>
            <div className="text-sm text-green-800 space-y-2">
              <p>1. 利用料金は全国統一で以下の通りです：</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>通常利用：800円/日（時間制限なし）</li>
                <li>サブスクリプション：3,800円/月（全国共通）</li>
                <li>施設貸し切り：4,400円/時間</li>
              </ul>
              <p>2. 売上の<span className="font-bold">80%</span>がオーナーに支払われます。</p>
              <p>3. 残りの<span className="font-bold">20%</span>は当社の手数料となります。</p>
              <p>4. 振込は毎月15日に前月分を一括で行います。</p>
              <p>5. 振込手数料は当社が負担します。</p>
            </div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <h3 className="font-semibold text-yellow-900 mb-2 flex items-center">
              <Percent className="w-5 h-5 text-yellow-600 mr-2" />
              税金と法的責任
            </h3>
            <div className="text-sm text-yellow-800 space-y-2">
              <p>1. オーナーは収益に対する税金の申告・納税義務があります。</p>
              <p>2. 施設運営に必要な許認可の取得はオーナーの責任で行ってください。</p>
              <p>3. 施設内での事故・トラブルに関する法的責任はオーナーが負うものとします。</p>
              <p>4. 施設賠償責任保険への加入を強く推奨します。</p>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h3 className="font-semibold text-purple-900 mb-2 flex items-center">
              <Clock className="w-5 h-5 text-purple-600 mr-2" />
              契約期間と解約
            </h3>
            <div className="text-sm text-purple-800 space-y-2">
              <p>1. 契約期間は1年間とし、自動更新されます。</p>
              <p>2. 解約を希望する場合は、30日前までに書面で通知が必要です。</p>
              <p>3. 以下の場合、当社は即時契約解除できるものとします：</p>
              <ul className="list-disc pl-5 space-y-1">
                <li>本契約に違反した場合</li>
                <li>施設の安全性が確保できない場合</li>
                <li>利用者からの苦情が著しく多い場合</li>
                <li>当社の信用を著しく毀損する行為があった場合</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <h3 className="font-semibold text-red-900 mb-2 flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              禁止事項
            </h3>
            <div className="text-sm text-red-800 space-y-2">
              <p>1. 当社の許可なく料金体系を変更すること</p>
              <p>2. 当社のシステムを迂回して予約・決済を受けること</p>
              <p>3. 利用者の個人情報を不正に収集・利用すること</p>
              <p>4. 当社や他のオーナーの信用を毀損する行為</p>
              <p>5. 反社会的勢力との関係を持つこと</p>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
              <Lock className="w-5 h-5 text-gray-600 mr-2" />
              個人情報と機密保持
            </h3>
            <div className="text-sm text-gray-800 space-y-2">
              <p>1. オーナーは利用者の個人情報を適切に管理し、漏洩防止に努めること</p>
              <p>2. 契約期間中および終了後も、当社の機密情報を第三者に開示しないこと</p>
              <p>3. 当社は法令に基づき、オーナーの個人情報を適切に管理します</p>
            </div>
          </div>
          
          <form onSubmit={handleAgreementSubmit}>
            <div className="border-t pt-6 mt-6">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isAgreementChecked}
                  onChange={(e) => setIsAgreementChecked(e.target.checked)}
                  className="mt-1 rounded text-blue-600"
                />
                <span className="text-gray-700">
                  上記の契約内容をすべて読み、理解し、同意します。この契約は法的拘束力を持ちます。
                </span>
              </label>
            </div>
            
            <div className="mt-6 flex justify-end">
              <Button
                type="submit"
                isLoading={isLoading}
                disabled={!isAgreementChecked}
              >
                同意して本人確認に進む
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {/* 審査プロセスの説明 */}
      <Card className="bg-gray-50">
        <div className="flex items-start space-x-3">
          <FileText className="w-6 h-6 text-gray-600 mt-1" />
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">審査プロセスについて</h3>
            <div className="text-sm text-gray-700 space-y-1">
              <p><strong>契約同意:</strong> ドッグランオーナー契約への同意</p>
              <p><strong>本人確認:</strong> 安全なプラットフォーム運営のための本人確認</p>
              <p><strong>第一審査:</strong> 基本的な条件の確認</p>
              <p><strong>第二審査:</strong> 詳細な施設情報と書類審査</p>
              <p><strong>QRコード実証検査:</strong> 実際の施設での動作確認</p>
              <p><strong>掲載・運営開始:</strong> 一般公開と予約受付開始</p>
            </div>
            <div className="mt-3 flex items-center">
              <Link to="/owner-payment-system" className="text-blue-600 hover:text-blue-800 flex items-center">
                <DollarSign className="w-4 h-4 mr-1" />
                <span className="text-sm font-medium">料金体系と収益システムについて詳しく見る</span>
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}