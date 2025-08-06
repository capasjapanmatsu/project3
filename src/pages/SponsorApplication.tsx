import React, { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import Select from '../components/Select';
import useAuth from '../context/AuthContext';

// 広告プラン定義
interface AdPlan {
  id: string;
  name: string;
  size: string;
  dimensions: string;
  position: string;
  monthlyPrice: number;
  features: string[];
  popular?: boolean;
}

const adPlans: AdPlan[] = [
  {
    id: 'banner-top',
    name: 'トップバナー広告',
    size: 'レクタングル',
    dimensions: '800×200px',
    position: 'トップページメインエリア（最上部）',
    monthlyPrice: 50000,
    features: [
      '最も目立つ位置での表示',
      '自動スライド表示（4秒間隔）',
      'クリック統計レポート',
      '月間表示回数保証：10,000回以上'
    ],
    popular: true
  },
  {
    id: 'banner-sidebar',
    name: 'サイドバー広告',
    size: 'スクエア',
    dimensions: '300×300px',
    position: '各ページサイドバー',
    monthlyPrice: 25000,
    features: [
      '全ページ共通表示',
      '固定表示（スクロール追従）',
      'クリック統計レポート',
      '月間表示回数保証：5,000回以上'
    ]
  },
  {
    id: 'banner-footer',
    name: 'フッター広告',
    size: 'ワイドバナー',
    dimensions: '728×90px',
    position: 'ページ下部フッターエリア',
    monthlyPrice: 15000,
    features: [
      '全ページ共通表示',
      '控えめで目立ちすぎない配置',
      'クリック統計レポート',
      '月間表示回数保証：3,000回以上'
    ]
  }
];

interface SponsorFormData {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  website: string;
  adTitle: string;
  adDescription: string;
  targetUrl: string;
  imageFile: File | null;
  selectedPlan: string;
  duration: number; // 掲載期間（月）
  message: string;
}

const initialFormData: SponsorFormData = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  website: '',
  adTitle: '',
  adDescription: '',
  targetUrl: '',
  imageFile: null,
  selectedPlan: '',
  duration: 3,
  message: ''
};

export function SponsorApplication() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<SponsorFormData>(initialFormData);
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // アクセス制限を削除（公開ページとして誰でもアクセス可能）
  // const [accessDenied, setAccessDenied] = useState(false);

  // アクセス制限を削除 - 公開ページとして誰でもアクセス可能

  // フォームデータの更新
  const handleInputChange = (field: keyof SponsorFormData, value: string | number | File | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // ファイル選択ハンドラー
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({ ...prev, imageFile: file }));
  };

  // 選択されたプランの取得
  const selectedPlan = adPlans.find(plan => plan.id === formData.selectedPlan);

  // 合計金額の計算
  const totalAmount = selectedPlan ? selectedPlan.monthlyPrice * formData.duration : 0;

  // ステップ進行
  const nextStep = () => {
    if (currentStep < 3) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // フォーム送信
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // ここで実際の送信処理を行う
      console.log('申し込みデータ:', formData);
      
      // Stripe決済ページへリダイレクト（実装時）
      // ここでは仮の処理
      alert(`申し込みありがとうございます！\n合計金額: ¥${totalAmount.toLocaleString()}\n決済画面に進みます。`);
      
      // 実際の実装では Stripe Checkout Session を作成
      // const response = await fetch('/api/create-sponsor-checkout', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ ...formData, totalAmount })
      // });
      
    } catch (err) {
      console.error('申し込みエラー:', err);
      setError('申し込みの送信に失敗しました。');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, totalAmount]);

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            スポンサー広告申し込み
          </h1>
          <p className="text-gray-600">
            ドッグパークJPで効果的な広告を掲載しませんか？
          </p>
        </div>

        {/* ステップインジケーター */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep >= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-300 text-gray-600'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-16 h-1 mx-2 ${
                    currentStep > step ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ステップ1: プラン選択 */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">広告プランを選択</h2>
              <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
                {adPlans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`relative border-2 rounded-lg p-6 cursor-pointer transition-all ${
                      formData.selectedPlan === plan.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    } ${plan.popular ? 'ring-2 ring-yellow-400' : ''}`}
                    onClick={() => handleInputChange('selectedPlan', plan.id)}
                  >
                    {plan.popular && (
                      <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                        <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
                          人気
                        </span>
                      </div>
                    )}
                    
                    <div className="text-center">
                      <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                      <div className="text-2xl font-bold text-blue-600 mb-2">
                        ¥{plan.monthlyPrice.toLocaleString()}
                        <span className="text-sm text-gray-500">/月</span>
                      </div>
                      <div className="text-sm text-gray-600 mb-4">
                        <p>サイズ: {plan.size}</p>
                        <p>({plan.dimensions})</p>
                        <p className="mt-1">{plan.position}</p>
                      </div>
                      <ul className="text-sm text-left space-y-1">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center">
                            <svg className="w-4 h-4 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              {selectedPlan && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-semibold mb-2">掲載期間を選択</h4>
                  <Select
                    value={formData.duration.toString()}
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value))}
                    options={[
                      { value: '1', label: '1ヶ月' },
                      { value: '3', label: '3ヶ月（おすすめ）' },
                      { value: '6', label: '6ヶ月（10%割引）' },
                      { value: '12', label: '12ヶ月（20%割引）' }
                    ]}
                  />
                  <div className="mt-2 text-lg font-semibold">
                    合計金額: ¥{totalAmount.toLocaleString()}
                    {formData.duration >= 6 && (
                      <span className="text-sm text-green-600 ml-2">
                        ({formData.duration === 6 ? '10' : '20'}%割引適用済み)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </Card>

            <div className="flex justify-end">
              <Button
                onClick={nextStep}
                disabled={!formData.selectedPlan}
                className="bg-blue-600 hover:bg-blue-700"
              >
                次へ
              </Button>
            </div>
          </div>
        )}

        {/* ステップ2: 企業情報・広告内容 */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">企業情報</h2>
              <div className="grid gap-4 md:grid-cols-2">
                <Input
                  label="企業・団体名 *"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  required
                />
                <Input
                  label="担当者名 *"
                  value={formData.contactName}
                  onChange={(e) => handleInputChange('contactName', e.target.value)}
                  required
                />
                <Input
                  label="メールアドレス *"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
                <Input
                  label="電話番号"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
                <div className="md:col-span-2">
                  <Input
                    label="企業サイトURL"
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">広告内容</h2>
              <div className="space-y-4">
                <Input
                  label="広告タイトル *"
                  value={formData.adTitle}
                  onChange={(e) => handleInputChange('adTitle', e.target.value)}
                  placeholder="例：プレミアムドッグフード30%OFF"
                  required
                />
                <Input
                  label="広告説明文 *"
                  value={formData.adDescription}
                  onChange={(e) => handleInputChange('adDescription', e.target.value)}
                  placeholder="例：愛犬の健康を考えた厳選商品をお届け"
                  multiline
                  rows={3}
                  required
                />
                <Input
                  label="リンク先URL *"
                  type="url"
                  value={formData.targetUrl}
                  onChange={(e) => handleInputChange('targetUrl', e.target.value)}
                  placeholder="https://example.com"
                  required
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    広告画像 * ({selectedPlan?.dimensions})
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    JPG, PNG形式。最大5MB。推奨サイズ: {selectedPlan?.dimensions}
                  </p>
                </div>
                <Input
                  label="その他ご要望"
                  value={formData.message}
                  onChange={(e) => handleInputChange('message', e.target.value)}
                  multiline
                  rows={3}
                  placeholder="特別な要望やご質問がありましたらお書きください"
                />
              </div>
            </Card>

            <div className="flex justify-between">
              <Button onClick={prevStep} variant="outline">
                戻る
              </Button>
              <Button
                onClick={nextStep}
                disabled={!formData.companyName || !formData.contactName || !formData.email || !formData.adTitle || !formData.adDescription || !formData.targetUrl}
                className="bg-blue-600 hover:bg-blue-700"
              >
                次へ
              </Button>
            </div>
          </div>
        )}

        {/* ステップ3: 確認・決済 */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">申し込み内容確認</h2>
              
              {/* プラン情報 */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">選択プラン</h3>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="font-medium">{selectedPlan?.name}</p>
                  <p className="text-sm text-gray-600">サイズ: {selectedPlan?.dimensions}</p>
                  <p className="text-sm text-gray-600">掲載期間: {formData.duration}ヶ月</p>
                  <p className="text-lg font-semibold mt-2">合計金額: ¥{totalAmount.toLocaleString()}</p>
                </div>
              </div>

              {/* 企業情報 */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">企業情報</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-1">
                  <p><span className="font-medium">企業名:</span> {formData.companyName}</p>
                  <p><span className="font-medium">担当者:</span> {formData.contactName}</p>
                  <p><span className="font-medium">メール:</span> {formData.email}</p>
                  {formData.phone && <p><span className="font-medium">電話:</span> {formData.phone}</p>}
                  {formData.website && <p><span className="font-medium">サイト:</span> {formData.website}</p>}
                </div>
              </div>

              {/* 広告内容 */}
              <div className="mb-6">
                <h3 className="font-semibold mb-2">広告内容</h3>
                <div className="bg-gray-50 p-4 rounded-lg space-y-1">
                  <p><span className="font-medium">タイトル:</span> {formData.adTitle}</p>
                  <p><span className="font-medium">説明:</span> {formData.adDescription}</p>
                  <p><span className="font-medium">リンク先:</span> {formData.targetUrl}</p>
                  {formData.imageFile && <p><span className="font-medium">画像:</span> {formData.imageFile.name}</p>}
                </div>
              </div>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                  {error}
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg mb-4">
                <h4 className="font-semibold mb-2">お支払いについて</h4>
                <ul className="text-sm space-y-1">
                  <li>• お支払いはクレジットカード（Stripe決済）で行います</li>
                  <li>• 決済完了後、3営業日以内に広告掲載を開始いたします</li>
                  <li>• 広告内容は事前審査を行います</li>
                  <li>• 審査で不適切と判断された場合は全額返金いたします</li>
                </ul>
              </div>
            </Card>

            <div className="flex justify-between">
              <Button onClick={prevStep} variant="outline">
                戻る
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSubmitting ? '処理中...' : `¥${totalAmount.toLocaleString()}で決済に進む`}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SponsorApplication; 