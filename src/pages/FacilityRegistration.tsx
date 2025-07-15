import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Building, 
  MapPin, 
  Phone, 
  Globe, 
  Clock, 
  Upload,
  CreditCard,
  Banknote,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import Button from '../components/Button';
import Input from '../components/Input';
import Select from '../components/Select';
import Card from '../components/Card';
import { supabase } from '../utils/supabase';
import useAuth from '../context/AuthContext';
import { 
  FacilityCategory, 
  FacilityRegistrationForm, 
  FACILITY_CATEGORY_LABELS,
  PAYMENT_METHODS,
  PAYMENT_METHOD_LABELS,
  DAYS_OF_WEEK 
} from '../types/facilities';

export function FacilityRegistration() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [categories, setCategories] = useState<FacilityCategory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState<FacilityRegistrationForm>({
    name: '',
    category_id: '',
    address: '',
    phone: '',
    website: '',
    description: '',
    payment_method: PAYMENT_METHODS.CREDIT_CARD,
    hours: {
      0: { is_closed: true },
      1: { is_closed: false, open_time: '09:00', close_time: '18:00' },
      2: { is_closed: false, open_time: '09:00', close_time: '18:00' },
      3: { is_closed: false, open_time: '09:00', close_time: '18:00' },
      4: { is_closed: false, open_time: '09:00', close_time: '18:00' },
      5: { is_closed: false, open_time: '09:00', close_time: '18:00' },
      6: { is_closed: false, open_time: '09:00', close_time: '18:00' },
    },
    images: [],
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    fetchCategories();
  }, [isAuthenticated, navigate]);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('facility_categories')
        .select('*')
        .neq('name', 'dog_park')
        .order('name');

      if (error) throw error;
      setCategories(data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      setError('カテゴリの取得に失敗しました');
    }
  };

  const handleInputChange = (field: keyof FacilityRegistrationForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleHourChange = (dayIndex: number, field: 'open_time' | 'close_time', value: string) => {
    setFormData(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        [dayIndex]: {
          ...prev.hours[dayIndex],
          [field]: value
        }
      }
    }));
  };

  const handleDayToggle = (dayIndex: number, isClosed: boolean) => {
    setFormData(prev => ({
      ...prev,
      hours: {
        ...prev.hours,
        [dayIndex]: {
          ...prev.hours[dayIndex],
          is_closed: isClosed
        }
      }
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setFormData(prev => ({
      ...prev,
      images: [...prev.images, ...files]
    }));
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        return !!(formData.name && formData.category_id && formData.address);
      case 2:
        return true; // 営業時間は任意
      case 3:
        return !!formData.payment_method;
      default:
        return true;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      setError('ログインが必要です');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // 1. 施設情報を保存
      const { data: facility, error: facilityError } = await supabase
        .from('pet_facilities')
        .insert({
          owner_id: user.id,
          category_id: formData.category_id,
          name: formData.name,
          address: formData.address,
          phone: formData.phone,
          website: formData.website,
          description: formData.description,
          status: 'pending',
          payment_status: 'unpaid',
          next_payment_due: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30日後
        })
        .select()
        .single();

      if (facilityError) throw facilityError;

      // 2. 営業時間を保存
      for (const [dayIndex, hourData] of Object.entries(formData.hours)) {
        if (!hourData.is_closed) {
          await supabase
            .from('facility_hours')
            .insert({
              facility_id: facility.id,
              day_of_week: parseInt(dayIndex),
              open_time: hourData.open_time,
              close_time: hourData.close_time,
              is_closed: false
            });
        } else {
          await supabase
            .from('facility_hours')
            .insert({
              facility_id: facility.id,
              day_of_week: parseInt(dayIndex),
              is_closed: true
            });
        }
      }

      // 3. サブスクリプション情報を保存
      const selectedCategory = categories.find(cat => cat.id === formData.category_id);
      if (selectedCategory && !selectedCategory.is_free) {
        await supabase
          .from('facility_subscriptions')
          .insert({
            facility_id: facility.id,
            payment_method: formData.payment_method,
            amount: selectedCategory.monthly_fee,
            status: 'active',
            current_period_start: new Date().toISOString().split('T')[0],
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          });
      }

      // 4. 画像をアップロード（簡略化版）
      if (formData.images.length > 0) {
        for (const image of formData.images) {
          const fileName = `facility_${facility.id}_${Date.now()}_${image.name}`;
          const { error: uploadError } = await supabase.storage
            .from('facility-images')
            .upload(fileName, image);

          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('facility-images')
              .getPublicUrl(fileName);

            await supabase
              .from('facility_images')
              .insert({
                facility_id: facility.id,
                image_url: urlData.publicUrl,
                is_primary: formData.images.indexOf(image) === 0
              });
          }
        }
      }

      setSuccessMessage('施設の掲載申し込みが完了しました！審査完了後、掲載を開始いたします。');
      
      // 支払い方法に応じてリダイレクト
      if (formData.payment_method === PAYMENT_METHODS.CREDIT_CARD && selectedCategory && !selectedCategory.is_free) {
        // Stripe決済ページにリダイレクト
        navigate(`/facility-payment/${facility.id}`);
      } else {
        // 完了ページにリダイレクト
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (error) {
      console.error('Error submitting facility:', error);
      setError('申し込みの送信に失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedCategory = categories.find(cat => cat.id === formData.category_id);

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">施設掲載申し込み</h1>
        <p className="text-gray-600">
          ペット関連施設の掲載申し込みを行います。審査完了後、地図に表示されます。
        </p>
      </div>

      {/* ステップインジケーター */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step <= currentStep ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {step}
              </div>
              {step < 3 && (
                <div className={`w-20 h-1 mx-2 ${
                  step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                }`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>基本情報</span>
          <span>営業時間</span>
          <span>支払い方法</span>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-green-700">{successMessage}</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Step 1: 基本情報 */}
        {currentStep === 1 && (
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Building className="w-6 h-6 mr-2" />
                基本情報
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    施設名（屋号） *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="例：ペットカフェ わんわん"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    施設カテゴリ *
                  </label>
                  <Select
                    value={formData.category_id}
                    onChange={(e) => handleInputChange('category_id', e.target.value)}
                    required
                  >
                    <option value="">選択してください</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name_ja}
                        {!category.is_free && ` (月額 ¥${category.monthly_fee.toLocaleString()})`}
                      </option>
                    ))}
                  </Select>
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    住所 *
                  </label>
                  <Input
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="例：東京都渋谷区〇〇1-2-3"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    電話番号
                  </label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="例：03-1234-5678"
                    type="tel"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ホームページ
                  </label>
                  <Input
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    placeholder="例：https://example.com"
                    type="url"
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    店舗・サービス紹介
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    rows={4}
                    placeholder="お店やサービスの特徴、ペット同伴時の注意事項などを記載してください"
                  />
                </div>
              </div>
            </div>
          </Card>
        )}

        {/* Step 2: 営業時間 */}
        {currentStep === 2 && (
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Clock className="w-6 h-6 mr-2" />
                営業時間
              </h2>
              
              <div className="space-y-4">
                {DAYS_OF_WEEK.map((day, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-16 text-sm font-medium text-gray-700">
                      {day}
                    </div>
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.hours[index].is_closed}
                          onChange={(e) => handleDayToggle(index, e.target.checked)}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-600">定休日</span>
                      </label>
                    </div>
                    {!formData.hours[index].is_closed && (
                      <div className="flex items-center space-x-2">
                        <Input
                          type="time"
                          value={formData.hours[index].open_time || '09:00'}
                          onChange={(e) => handleHourChange(index, 'open_time', e.target.value)}
                          className="w-24"
                        />
                        <span className="text-gray-500">〜</span>
                        <Input
                          type="time"
                          value={formData.hours[index].close_time || '18:00'}
                          onChange={(e) => handleHourChange(index, 'close_time', e.target.value)}
                          className="w-24"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}

        {/* Step 3: 支払い方法 */}
        {currentStep === 3 && (
          <Card className="mb-6">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <CreditCard className="w-6 h-6 mr-2" />
                支払い方法
              </h2>
              
              {selectedCategory && !selectedCategory.is_free && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <Info className="w-5 h-5 text-blue-500 mr-2" />
                    <span className="font-medium text-blue-800">掲載料金</span>
                  </div>
                  <p className="text-blue-700">
                    {selectedCategory.name_ja}の掲載料金は月額 
                    <strong className="text-lg"> ¥{selectedCategory.monthly_fee.toLocaleString()}</strong>（税込）です。
                  </p>
                </div>
              )}

              {selectedCategory && selectedCategory.is_free && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center mb-2">
                    <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                    <span className="font-medium text-green-800">無料掲載</span>
                  </div>
                  <p className="text-green-700">
                    {selectedCategory.name_ja}は無料で掲載できます。
                  </p>
                </div>
              )}

              {selectedCategory && !selectedCategory.is_free && (
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="payment_method"
                        value={PAYMENT_METHODS.CREDIT_CARD}
                        checked={formData.payment_method === PAYMENT_METHODS.CREDIT_CARD}
                        onChange={(e) => handleInputChange('payment_method', e.target.value)}
                        className="mr-3"
                      />
                      <CreditCard className="w-5 h-5 text-blue-500 mr-3" />
                      <div>
                        <div className="font-medium">クレジットカード決済</div>
                        <div className="text-sm text-gray-600">
                          毎月自動で決済されます（推奨）
                        </div>
                      </div>
                    </label>
                  </div>
                  
                  <div>
                    <label className="flex items-center p-4 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                      <input
                        type="radio"
                        name="payment_method"
                        value={PAYMENT_METHODS.BANK_TRANSFER}
                        checked={formData.payment_method === PAYMENT_METHODS.BANK_TRANSFER}
                        onChange={(e) => handleInputChange('payment_method', e.target.value)}
                        className="mr-3"
                      />
                      <Banknote className="w-5 h-5 text-green-500 mr-3" />
                      <div>
                        <div className="font-medium">銀行振込</div>
                        <div className="text-sm text-gray-600">
                          毎月請求書をお送りします（月末までにお支払い）
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ナビゲーションボタン */}
        <div className="flex justify-between">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
          >
            前へ
          </Button>
          
          {currentStep < 3 ? (
            <Button
              type="button"
              onClick={() => setCurrentStep(currentStep + 1)}
              disabled={!validateStep(currentStep)}
            >
              次へ
            </Button>
          ) : (
            <Button
              type="submit"
              disabled={isLoading || !validateStep(currentStep)}
            >
              {isLoading ? '申し込み中...' : '申し込みを完了する'}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
} 