import { ArrowLeft, Building, Calendar, ExternalLink, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import useAuth from '../context/AuthContext';
import { supabase } from '../utils/supabase';

interface SponsorInquiry {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  status: 'pending' | 'contacted' | 'completed' | 'declined';
  created_at: string;
  notes?: string;
}

export function AdminSponsors() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState<SponsorInquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchInquiries();
  }, [isAdmin, navigate]);

  const fetchInquiries = async () => {
    try {
      let query = supabase
        .from('sponsor_inquiries')
        .select('*')
        .order('created_at', { ascending: false });

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setInquiries(data || []);
    } catch (error) {
      console.error('Error fetching inquiries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('sponsor_inquiries')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await fetchInquiries();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const updateNotes = async (id: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('sponsor_inquiries')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
      await fetchInquiries();
    } catch (error) {
      console.error('Error updating notes:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'contacted':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'declined':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return '未対応';
      case 'contacted':
        return '連絡済み';
      case 'completed':
        return '成約';
      case 'declined':
        return '辞退';
      default:
        return status;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="mb-8">
          <Link to="/admin" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            管理画面に戻る
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">スポンサー広告お問い合わせ管理</h1>
          <p className="text-gray-600 mt-2">スポンサー広告に関するお問い合わせを管理できます。</p>
        </div>

        {/* フィルター */}
        <Card className="p-4 mb-6">
          <div className="flex items-center space-x-4">
            <label className="text-sm font-medium text-gray-700">ステータスで絞り込み：</label>
            <select
              value={selectedStatus}
              onChange={(e) => {
                setSelectedStatus(e.target.value);
                fetchInquiries();
              }}
              className="border rounded-lg px-3 py-1 text-sm"
            >
              <option value="all">すべて</option>
              <option value="pending">未対応</option>
              <option value="contacted">連絡済み</option>
              <option value="completed">成約</option>
              <option value="declined">辞退</option>
            </select>
          </div>
        </Card>

        {/* 問い合わせリスト */}
        {inquiries.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">お問い合わせはまだありません。</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {inquiries.map((inquiry) => (
              <Card key={inquiry.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      <Building className="inline w-5 h-5 mr-2 text-gray-500" />
                      {inquiry.company_name}
                    </h3>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p>
                        <span className="font-medium">担当者：</span> {inquiry.contact_person}様
                      </p>
                      <p>
                        <Mail className="inline w-4 h-4 mr-1" />
                        <a href={`mailto:${inquiry.email}`} className="text-blue-600 hover:text-blue-800">
                          {inquiry.email}
                        </a>
                      </p>
                      <p>
                        <Calendar className="inline w-4 h-4 mr-1" />
                        {new Date(inquiry.created_at).toLocaleDateString('ja-JP', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(inquiry.status)}`}>
                      {getStatusLabel(inquiry.status)}
                    </span>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* ステータス変更 */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        ステータス変更
                      </label>
                      <select
                        value={inquiry.status}
                        onChange={(e) => updateStatus(inquiry.id, e.target.value)}
                        className="w-full border rounded-lg px-3 py-2 text-sm"
                      >
                        <option value="pending">未対応</option>
                        <option value="contacted">連絡済み</option>
                        <option value="completed">成約</option>
                        <option value="declined">辞退</option>
                      </select>
                    </div>

                    {/* アクション */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        アクション
                      </label>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => {
                            const subject = encodeURIComponent(`【ドッグパークJP】スポンサー広告のご案内`);
                            const body = encodeURIComponent(
`${inquiry.contact_person}様

お世話になっております。
ドッグパークJP運営事務局です。

この度は、スポンサー広告にご興味をお持ちいただき、
誠にありがとうございます。

詳細なご案内をさせていただきたく、
ご連絡させていただきました。

【スポンサー広告プランのご案内】
・プラン内容の詳細説明
・料金体系
・掲載までの流れ
・その他ご質問への回答

ご都合の良い日時をお知らせいただければ、
詳しくご説明させていただきます。

何かご不明な点がございましたら、
お気軽にお問い合わせください。

よろしくお願いいたします。

--
ドッグパークJP運営事務局
メール: info@dogparkjp.com
ウェブサイト: https://dogparkjp.com

※このメールは手動で送信しています。
※送信元アドレスをinfo@dogparkjp.comに設定してください。`
                            );
                            window.open(`mailto:${inquiry.email}?subject=${subject}&body=${body}`, '_blank');
                          }}
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                        >
                          <Mail className="w-4 h-4 mr-1" />
                          メール送信
                        </Button>
                        <Button
                          onClick={() => navigate(`/sponsor-application?inquiry_id=${inquiry.id}`)}
                          variant="secondary"
                          size="sm"
                          className="flex-1"
                        >
                          <ExternalLink className="w-4 h-4 mr-1" />
                          申込ページ
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* メモ */}
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      メモ
                    </label>
                    <textarea
                      value={inquiry.notes || ''}
                      onChange={(e) => updateNotes(inquiry.id, e.target.value)}
                      placeholder="対応内容などをメモできます..."
                      className="w-full border rounded-lg px-3 py-2 text-sm"
                      rows={2}
                    />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}