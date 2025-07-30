import { ArrowLeft, CheckCircle, Shield, XCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface Dog {
  id: string;
  name: string;
  breed: string;
  image_url?: string;
}

interface VaccineCertification {
  id: string;
  dog_id: string;
  rabies_vaccine_image?: string;
  combo_vaccine_image?: string;
  rabies_expiry_date?: string;
  combo_expiry_date?: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

interface DogWithVaccines extends Dog {
  vaccine_certifications: VaccineCertification[];
}

export function JPPassport() {
  const { user } = useAuth();
  const [dogs, setDogs] = useState<DogWithVaccines[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      void fetchDogsData();
    }
  }, [user]);

  const fetchDogsData = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      console.log('🔍 [JP Passport] Fetching dogs and vaccine data...');
      
      const { data, error } = await supabase
        .from('dogs')
        .select(`
          id,
          name,
          breed,
          image_url,
          vaccine_certifications (
            id,
            dog_id,
            rabies_vaccine_image,
            combo_vaccine_image,
            rabies_expiry_date,
            combo_expiry_date,
            status,
            created_at
          )
        `)
        .eq('owner_id', user.id)
        .order('name');

      if (error) {
        console.error('❌ [JP Passport] Error fetching dogs:', error);
      } else {
        console.log('✅ [JP Passport] Dogs fetched:', data);
        setDogs(data || []);
      }
    } catch (error) {
      console.error('❌ [JP Passport] Error in fetchDogsData:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ワクチンの有効性をチェック
  const isVaccineValid = (expiryDate?: string): boolean => {
    if (!expiryDate) return false;
    return new Date(expiryDate) > new Date();
  };

  // 有効期限までの日数を計算
  const getDaysUntilExpiry = (expiryDate?: string): number => {
    if (!expiryDate) return -1;
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // 有効期限の表示色を決定
  const getExpiryColor = (expiryDate?: string): string => {
    const days = getDaysUntilExpiry(expiryDate);
    if (days < 0) return 'text-red-600';
    if (days <= 30) return 'text-yellow-600';
    return 'text-green-600';
  };

  // 最新の承認済みワクチン情報を取得
  const getLatestApprovedVaccine = (vaccinations: VaccineCertification[], type: 'rabies' | 'combo') => {
    const approved = vaccinations
      .filter(v => v.status === 'approved')
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return approved.find(v => {
      if (type === 'rabies') {
        return v.rabies_expiry_date;
      } else {
        return v.combo_expiry_date;
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* ヘッダー */}
        <div className="flex items-center mb-6">
          <Link 
            to="/dashboard" 
            className="flex items-center text-blue-600 hover:text-blue-800 mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            マイページに戻る
          </Link>
          <div className="flex items-center">
            <Shield className="w-8 h-8 text-emerald-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">JPパスポート</h1>
          </div>
        </div>

        {/* 説明 */}
        <Card className="mb-6">
          <div className="p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-lg">
            <h3 className="text-lg font-semibold text-emerald-800 mb-2">
              🆔 ドッグパークJP公式パスポート
            </h3>
            <p className="text-emerald-700 text-sm">
              ワンちゃんの健康状態を証明する公式デジタルパスポートです。
              <br />
              施設利用時にこの画面を提示してください。
            </p>
          </div>
        </Card>

        {/* 犬の一覧 */}
        {dogs.length === 0 ? (
          <Card className="text-center py-12">
            <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">登録されたワンちゃんがいません</p>
            <Link 
              to="/dog-registration" 
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              ワンちゃんを登録する
            </Link>
          </Card>
        ) : (
          <div className="space-y-6">
            {dogs.map((dog) => {
              const latestRabies = getLatestApprovedVaccine(dog.vaccine_certifications, 'rabies');
              const latestCombo = getLatestApprovedVaccine(dog.vaccine_certifications, 'combo');
              
              return (
                <Card key={dog.id} className="overflow-hidden">
                  <div className="p-6">
                    {/* 犬の基本情報 */}
                    <div className="flex items-start mb-6">
                      <div className="flex-shrink-0 mr-4">
                        {dog.image_url ? (
                          <img
                            src={dog.image_url}
                            alt={dog.name}
                            className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center">
                            <span className="text-gray-400 text-xs">画像なし</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-1">{dog.name}</h3>
                        <p className="text-gray-600 mb-2">{dog.breed}</p>
                        <div className="flex items-center">
                          <Shield className="w-4 h-4 text-emerald-600 mr-1" />
                          <span className="text-sm text-emerald-600 font-medium">
                            公式認証済み
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* ワクチン情報 */}
                    <div className="space-y-4">
                      {/* 狂犬病ワクチン */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 flex items-center">
                            💉 狂犬病ワクチン
                          </h4>
                          {isVaccineValid(latestRabies?.rabies_expiry_date) ? (
                            <CheckCircle className="w-6 h-6 text-green-500" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-500" />
                          )}
                        </div>
                        {latestRabies && latestRabies.rabies_expiry_date ? (
                          <div className="space-y-1 text-sm">
                            <p className={`font-medium ${getExpiryColor(latestRabies.rabies_expiry_date)}`}>
                              有効期限: {new Date(latestRabies.rabies_expiry_date).toLocaleDateString()}
                              {isVaccineValid(latestRabies.rabies_expiry_date) && (
                                <span className="ml-2 text-green-600">✓ 有効</span>
                              )}
                              {!isVaccineValid(latestRabies.rabies_expiry_date) && (
                                <span className="ml-2 text-red-600">✗ 期限切れ</span>
                              )}
                            </p>
                            <p className="text-gray-600 text-xs">
                              承認日: {new Date(latestRabies.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        ) : (
                          <p className="text-red-500 text-sm">ワクチン情報が未登録または未承認です</p>
                        )}
                      </div>

                      {/* 混合ワクチン */}
                      <div className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900 flex items-center">
                            💊 混合ワクチン
                          </h4>
                          {isVaccineValid(latestCombo?.combo_expiry_date) ? (
                            <CheckCircle className="w-6 h-6 text-green-500" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-500" />
                          )}
                        </div>
                        {latestCombo && latestCombo.combo_expiry_date ? (
                          <div className="space-y-1 text-sm">
                            <p className={`font-medium ${getExpiryColor(latestCombo.combo_expiry_date)}`}>
                              有効期限: {new Date(latestCombo.combo_expiry_date).toLocaleDateString()}
                              {isVaccineValid(latestCombo.combo_expiry_date) && (
                                <span className="ml-2 text-green-600">✓ 有効</span>
                              )}
                              {!isVaccineValid(latestCombo.combo_expiry_date) && (
                                <span className="ml-2 text-red-600">✗ 期限切れ</span>
                              )}
                            </p>
                            <p className="text-gray-600 text-xs">
                              承認日: {new Date(latestCombo.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        ) : (
                          <p className="text-red-500 text-sm">ワクチン情報が未登録または未承認です</p>
                        )}
                      </div>
                    </div>

                    {/* パスポート認証情報 */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>ドッグパークJP公式認証</span>
                        <span>ID: {dog.id.substring(0, 8).toUpperCase()}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* フッター */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>📱 この画面を施設スタッフに提示してください</p>
          <p className="mt-1">ドッグパークJP公式認証済みパスポート</p>
        </div>
      </div>
    </div>
  );
}

export default JPPassport; 