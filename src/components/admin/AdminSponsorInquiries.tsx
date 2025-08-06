import { Copy, ExternalLink, Mail } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { supabase } from '../../utils/supabase';
import Button from '../Button';
import Card from '../Card';

interface SponsorInquiry {
  id: string;
  company_name: string;
  contact_person: string;
  email: string;
  status: 'pending' | 'contacted' | 'completed' | 'declined';
  created_at: string;
  access_token: string;
  sponsor_url: string;
  notes?: string;
}

const AdminSponsorInquiries: React.FC = () => {
  const [inquiries, setInquiries] = useState<SponsorInquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchInquiries();
  }, []);

  const fetchInquiries = async () => {
    try {
      const { data, error } = await supabase
        .from('sponsor_inquiries')
        .select('*')
        .order('created_at', { ascending: false });

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
      alert('ステータスの更新に失敗しました');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('クリップボードにコピーしました');
  };

  const openEmailClient = (inquiry: SponsorInquiry) => {
    const subject = encodeURIComponent('【ドッグパークJP】スポンサー広告資料のご案内');
    const body = encodeURIComponent(`${inquiry.company_name}
${inquiry.contact_person} 様

この度は、ドッグパークJPのスポンサー広告にご興味をお持ちいただき、誠にありがとうございます。

詳細な広告プランと料金につきましては、以下のURLよりご確認いただけます：
${inquiry.sponsor_url}

ドッグパークJPの実績：
• 月間アクティブユーザー：10,000人以上
• 登録施設数：500施設以上
• 主要ユーザー層：30-50代の犬の飼い主
• 平均滞在時間：5分以上

ご不明な点がございましたら、お気軽にお問い合わせください。
担当者より詳しくご説明させていただきます。

ドッグパークJP運営チーム
お問い合わせ：info@dogparkjp.com

※このメールは送信専用です。返信はできませんのでご了承ください。`);

    const mailtoUrl = `mailto:${inquiry.email}?subject=${subject}&body=${body}`;
    window.open(mailtoUrl, '_blank');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">スポンサー広告お問い合わせ管理</h2>
        <Button onClick={fetchInquiries} variant="outline">
          更新
        </Button>
      </div>
      
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <Mail className="h-5 w-5 text-yellow-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              メール送信手順
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>1. 「メール送信」ボタンをクリックしてメールクライアントを開く</p>
              <p>2. 事前に作成された文面を確認して送信</p>
              <p>3. 送信後、ステータスを「連絡済み」に更新</p>
            </div>
          </div>
        </div>
      </div>

      {inquiries.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">お問い合わせはありません</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {inquiries.map((inquiry) => (
            <Card key={inquiry.id} className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {inquiry.company_name}
                  </h3>
                  <p className="text-gray-600">
                    担当者: {inquiry.contact_person}
                  </p>
                  <p className="text-gray-600">
                    メール: {inquiry.email}
                  </p>
                  <p className="text-sm text-gray-500">
                    申込日: {new Date(inquiry.created_at).toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    inquiry.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    inquiry.status === 'contacted' ? 'bg-blue-100 text-blue-800' :
                    inquiry.status === 'completed' ? 'bg-green-100 text-green-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {inquiry.status === 'pending' ? '未対応' :
                     inquiry.status === 'contacted' ? '連絡済み' :
                     inquiry.status === 'completed' ? '成約' : '辞退'}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 className="font-medium text-gray-900 mb-2">スポンサー申し込みURL</h4>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 bg-white p-2 rounded border text-sm">
                    {inquiry.sponsor_url}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(inquiry.sponsor_url)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.open(inquiry.sponsor_url, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => openEmailClient(inquiry)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  メール送信
                </Button>

                {inquiry.status === 'pending' && (
                  <Button
                    onClick={() => updateStatus(inquiry.id, 'contacted')}
                    variant="outline"
                  >
                    連絡済みにする
                  </Button>
                )}

                {inquiry.status === 'contacted' && (
                  <>
                    <Button
                      onClick={() => updateStatus(inquiry.id, 'completed')}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      成約
                    </Button>
                    <Button
                      onClick={() => updateStatus(inquiry.id, 'declined')}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      辞退
                    </Button>
                  </>
                )}

                {(inquiry.status === 'completed' || inquiry.status === 'declined') && (
                  <Button
                    onClick={() => updateStatus(inquiry.id, 'pending')}
                    variant="outline"
                  >
                    未対応に戻す
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminSponsorInquiries;