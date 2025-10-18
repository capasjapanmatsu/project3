import {
    AlertTriangle,
    ArrowLeft,
    Building,
    CheckCircle,
    Clock,
    Crown,
    Edit,
    Eye,
    Globe,
    MapPin,
    Phone,
    Plus
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import { SEO } from '../components/SEO';
import useAuth from '../context/AuthContext';
import { FACILITY_CATEGORY_LABELS, PetFacility } from '../types/facilities';
import { supabase } from '../utils/supabase';

interface PetFacilityFromDB {
  id: string;
  name: string;
  description?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  phone?: string;
  website?: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  category_id: string;
  created_at: string;
  updated_at?: string;
}

export function MyFacilitiesManagement() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [facilities, setFacilities] = useState<PetFacility[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInquiry, setShowInquiry] = useState(false);
  const [inquiryText, setInquiryText] = useState('');
  const [sending, setSending] = useState(false);
  const [premiumByFacility, setPremiumByFacility] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const fetchFacilities = async () => {
      if (!user) return;

      try {
        // 正しいテーブル名とカラム名でクエリ
        const { data: facilitiesData, error } = await supabase
          .from('pet_facilities')
          .select(`
            id,
            name,
            description,
            address,
            latitude,
            longitude,
            phone,
            website,
            status,
            category_id,
            created_at,
            updated_at
          `)
          .eq('owner_id', user?.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching facilities:', error);
          return;
        }

        const processedFacilities: PetFacility[] = (facilitiesData as PetFacilityFromDB[])?.map((facility) => ({
          ...facility,
          category: facility.category_id,
          category_name: FACILITY_CATEGORY_LABELS[facility.category_id as keyof typeof FACILITY_CATEGORY_LABELS] || 'その他施設'
        })) || [];

        console.log('✅ Facilities data:', processedFacilities);
        setFacilities(processedFacilities);

        // ---- プレミアム判定（施設単位） ----
        try {
          const ids = processedFacilities.map(f => f.id);
          const map: Record<string, boolean> = {};
          if (ids.length > 0) {
            // 1) facility_premium_memberships があれば優先
            try {
              const { data: rows, error: pmErr } = await supabase
                .from('facility_premium_memberships')
                .select('facility_id,status')
                .in('facility_id', ids)
                .eq('owner_id', user.id);
              if (!pmErr && rows) {
                rows.forEach((r: any) => { map[r.facility_id] = ['active','trialing','paused'].includes(String(r.status)); });
              }
            } catch {}
            // 2) フォールバック: 予約設定が有効な施設はプレミアム（機能開放の代理指標）
            try {
              const { data: rs } = await supabase
                .from('facility_reservation_settings')
                .select('facility_id, enabled')
                .in('facility_id', ids);
              (rs || []).forEach((r: any) => { if (r.enabled) map[r.facility_id] = true; });
            } catch {}
            // 3) フォールバック: pet_facilities に is_premium/premium_status があれば参照
            try {
              const { data: pf } = await supabase
                .from('pet_facilities')
                .select('id, is_premium, premium_status')
                .in('id', ids);
              (pf || []).forEach((r: any) => {
                if (r.is_premium || ['active','trialing','paused'].includes(String(r.premium_status))) map[r.id] = true;
              });
            } catch {}
          }
          // 4) 追加フォールバック: オーナーのプレミアム購読がアカウント単位で有効で、
          //    かつ施設が1件のみの場合はその施設をプレミアムとみなす（暫定運用）
          try {
            const premiumPriceId = import.meta.env.VITE_PREMIUM_OWNER_PRICE_ID as string | undefined;
            if (processedFacilities.length === 1 && premiumPriceId && !map[processedFacilities[0].id]) {
              let active = false;
              const { data: sub1 } = await supabase
                .from('stripe_user_subscriptions')
                .select('status, price_id')
                .maybeSingle();
              if (sub1 && (sub1 as any).price_id === premiumPriceId && ['active','trialing','paused'].includes(String((sub1 as any).status))) {
                active = true;
              }
              if (!active) {
                const { data: sub2 } = await supabase
                  .from('user_subscriptions')
                  .select('status, product_key, price_id')
                  .eq('user_id', user.id)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                if (sub2 && ((sub2 as any).price_id === premiumPriceId || /premium_owner/i.test(String((sub2 as any).product_key)))) {
                  const status = String((sub2 as any).status);
                  active = ['active','trialing','paused'].includes(status);
                }
              }
              if (active) {
                map[processedFacilities[0].id] = true;
              }
            }
          } catch {}
          setPremiumByFacility(map);
        } catch (e) {
          console.warn('premium map load failed', e);
          setPremiumByFacility({});
        }
      } catch (error) {
        console.error('Error in fetchFacilities:', error);
      } finally {
        setLoading(false);
      }
    };

    void fetchFacilities();
  }, [user]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      approved: { 
        bg: 'bg-green-100', 
        text: 'text-green-800', 
        label: '公開中',
        icon: CheckCircle 
      },
      pending: { 
        bg: 'bg-yellow-100', 
        text: 'text-yellow-800', 
        label: '審査中',
        icon: Clock 
      },
      rejected: { 
        bg: 'bg-red-100', 
        text: 'text-red-800', 
        label: '却下',
        icon: AlertTriangle 
      },
      suspended: { 
        bg: 'bg-gray-100', 
        text: 'text-gray-800', 
        label: '停止中',
        icon: AlertTriangle 
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const IconComponent = config.icon;

    return (
      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${config.bg} ${config.text}`}>
        <IconComponent className="w-4 h-4" />
        <span>{config.label}</span>
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="管理中ペット関連施設一覧"
        description="あなたが管理するペット関連施設の一覧と詳細管理ページです。"
      />
      
      <div className="max-w-7xl mx-auto px-4 pt-10 md:pt-12 pb-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="mr-4"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              マイページに戻る
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center">
                <Building className="w-8 h-8 text-teal-600 mr-3" />
                管理中ペット関連施設一覧
              </h1>
              <p className="text-gray-600 mt-2">
                あなたが管理するペット関連施設 ({facilities.length}施設) の詳細管理
              </p>
              
            </div>
            
          </div>
        </div>

        {/* 施設一覧 */}
        {facilities.length === 0 ? (
          <Card className="p-12 text-center">
            <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              管理中のペット関連施設がありません
            </h3>
            <p className="text-gray-600 mb-6">
              ペットショップ、動物病院、トリミングサロンなどの施設を登録しましょう。
            </p>
            <Link to="/facility-registration">
              <Button className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 mr-2" />
                施設登録を始める
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {facilities.map((facility) => (
              <Card key={facility.id} className="hover:shadow-lg transition-all duration-200">
                <div className="p-6">
                  {/* ヘッダー部分 */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 flex items-center gap-2">
                        <span>{facility.name}</span>
                        {premiumByFacility[facility.id] && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700" title="プレミアム会員（施設）">
                            <Crown className="w-3.5 h-3.5 mr-1" /> プレミアム
                          </span>
                        )}
                      </h3>
                      <div className="flex items-center text-gray-600 mb-2">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span className="text-sm">{facility.address}</span>
                      </div>
                      <div className="text-sm text-teal-600 font-medium mb-3">
                        {facility.category_name}
                      </div>
                    </div>
                    <div className="ml-4">
                      {getStatusBadge(facility.status)}
                    </div>
                  </div>

                  {/* 説明文 */}
                  {facility.description && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-700 line-clamp-3">
                        {facility.description}
                      </p>
                    </div>
                  )}

                  {/* 連絡先情報 */}
                  <div className="space-y-2 mb-6">
                    {facility.phone && (
                      <div className="flex items-center text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />
                        <span className="text-sm">{facility.phone}</span>
                      </div>
                    )}
                    {facility.website && (
                      <div className="flex items-center text-gray-600">
                        <Globe className="w-4 h-4 mr-2" />
                        <a 
                          href={facility.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm text-teal-600 hover:text-teal-800 underline"
                        >
                          公式サイト
                        </a>
                      </div>
                    )}
                  </div>

                  {/* 統計情報 */}
                  <div className="grid grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="text-sm text-gray-600">登録日</div>
                      <div className="font-semibold">
                        {facility.created_at ? new Date(facility.created_at).toLocaleDateString() : '不明'}
                      </div>
                      {premiumByFacility[facility.id] && (
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700" title="プレミアム会員（施設）">
                            <Crown className="w-3.5 h-3.5 mr-1" /> プレミアム会員
                          </span>
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="text-sm text-gray-600">ステータス</div>
                      <div className="mt-1">
                        {getStatusBadge(facility.status)}
                      </div>
                    </div>
                  </div>

                  {/* アクションボタン */}
                  <div className="flex space-x-3">
                    <Button 
                      className="flex-1 bg-teal-600 hover:bg-teal-700"
                      onClick={() => navigate(`/facilities/${facility.id}/edit`)}
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      管理・修正
                    </Button>
                    
                    {facility.status === 'approved' && (
                      <Button 
                        variant="secondary" 
                        className="px-4"
                        onClick={() => navigate(`/parks?view=facilities&facility=${facility.id}`)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        公開ページ
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* 下部に横長ボタン群 */}
        <div className="mt-8 space-y-6">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">不明な点がありましたらお気軽にお問合せください。</p>
            <Button 
              className="mt-3 w-full bg-blue-600 hover:bg-blue-700"
              onClick={() => setShowInquiry(true)}
            >
              管理者に問い合わせ
            </Button>
          </div>
          <Link to="/facility-registration" className="block">
            <Button className="w-full bg-teal-600 hover:bg-teal-700">
              <Plus className="w-4 h-4 mr-2" />
              新規施設登録
            </Button>
          </Link>
        </div>
      </div>
      {showInquiry && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold mb-3">管理者に問い合わせ</h2>
            <p className="text-sm text-gray-600 mb-3">お問い合わせ内容をご記入ください。送信すると同時にメッセージスレッドが作成されます。</p>
            <textarea
              className="w-full border rounded-md p-3 h-32 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="お問い合わせ内容"
              value={inquiryText}
              onChange={(e) => setInquiryText(e.target.value)}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowInquiry(false)}>キャンセル</Button>
              <Button
                className="bg-blue-600 hover:bg-blue-700"
                disabled={sending || !inquiryText.trim()}
                onClick={async () => {
                  if (!user) { navigate('/login'); return; }
                  setSending(true);
                  try {
                    const { data: admin } = await supabase
                      .from('profiles')
                      .select('id')
                      .eq('user_type', 'admin')
                      .limit(1)
                      .single();
                    const adminId = admin?.id;
                    if (!adminId) { alert('管理者に送信できませんでした'); setSending(false); return; }
                    await supabase.from('messages').insert({
                      sender_id: user.id,
                      receiver_id: adminId,
                      content: `（管理中施設一覧からの問い合わせ）\n${inquiryText.trim()}`
                    });
                    sessionStorage.setItem('communityActiveTab', 'messages');
                    sessionStorage.setItem('communityOpenPartnerId', adminId);
                    navigate('/community');
                  } catch (e) {
                    console.error(e);
                    alert('送信に失敗しました');
                  } finally {
                    setSending(false);
                    setShowInquiry(false);
                    setInquiryText('');
                  }
                }}
              >
                {sending ? '送信中...' : '送信してメッセージを開く'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 