import { ArrowLeft, Building, Mail, Send, User } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/Button';
import Card from '../components/Card';
import Input from '../components/Input';
import { SEO } from '../components/SEO';
import { supabase } from '../utils/supabase';

interface InquiryForm {
  company_name: string;
  contact_person: string;
  email: string;
}

const SponsorInquiry: React.FC = () => {
  const [form, setForm] = useState<InquiryForm>({
    company_name: '',
    contact_person: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleInputChange = (field: keyof InquiryForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.company_name || !form.contact_person || !form.email) {
      alert('すべての項目を入力してください。');
      return;
    }

    // メールアドレスの簡易バリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      alert('正しいメールアドレスを入力してください。');
      return;
    }

    setIsSubmitting(true);

    try {
      // まずデータベースに保存
      console.log('問い合わせ情報を保存中...', {
        email: form.email,
        company_name: form.company_name,
        contact_person: form.contact_person
      });

      const { data: inquiryData, error: inquiryError } = await supabase
        .from('sponsor_inquiries')
        .insert([{
          company_name: form.company_name,
          contact_person: form.contact_person,
          email: form.email,
          status: 'pending'
        }])
        .select()
        .single();

      if (inquiryError) {
        console.error('データベース保存エラー:', inquiryError);
        alert('送信に失敗しました。しばらく経ってから再度お試しください。');
        return;
      }

      console.log('問い合わせ情報保存成功:', inquiryData);

      // 管理者への通知を作成
      const { error: notificationError } = await supabase
        .from('admin_notifications')
        .insert([{
          type: 'sponsor_inquiry',
          title: 'スポンサー広告のお問い合わせ',
          message: `${form.company_name}（${form.contact_person}様）からスポンサー広告のお問い合わせがありました。`,
          data: { 
            email: form.email,
            company_name: form.company_name,
            contact_person: form.contact_person,
            inquiry_id: inquiryData.id
          }
        }]);

      if (notificationError) {
        console.error('通知作成エラー:', notificationError);
        // 通知の作成に失敗しても処理は続行
      }

      // メール送信を試みる（失敗しても問い合わせは保存済み）
      try {
        const { error: emailError } = await supabase.functions.invoke('send-sponsor-invitation', {
          body: {
            email: form.email,
            company_name: form.company_name,
            contact_person: form.contact_person,
            inquiry_id: inquiryData.id
          }
        });

        if (emailError) {
          console.error('メール送信エラー:', emailError);
          // メール送信に失敗してもデータは保存済みなので続行
        }
      } catch (emailErr) {
        console.error('メール送信エラー:', emailErr);
        // メール送信に失敗してもデータは保存済みなので続行
      }

      setIsSubmitted(true);
    } catch (error) {
      console.error('Submit error:', error);
      alert('送信中にエラーが発生しました。しばらく経ってから再度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <>
        <SEO 
          title="スポンサー広告お問い合わせ完了"
          description="スポンサー広告に関するお問い合わせを承りました"
        />
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-2xl mx-auto px-4">
            <Card className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Send className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                お問い合わせありがとうございます
              </h1>
              <p className="text-gray-600 mb-6">
                スポンサー広告に関するお問い合わせを承りました。<br />
                ご入力いただいたメールアドレスに招待メールをお送りいたしました。
              </p>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-green-800">
                  <strong>✅ 招待メール送信完了</strong><br />
                  Supabaseの「Invite user」機能を使用して、スポンサー申し込みページへの招待メールを自動送信いたしました。<br />
                  メールが届かない場合は、迷惑メールフォルダもご確認ください。
                </p>
              </div>
              <p className="text-sm text-gray-500 mb-8">
                お急ぎの場合は、直接 <a href="mailto:info@dogparkjp.com" className="text-blue-600 hover:underline">info@dogparkjp.com</a> までお問い合わせください。
              </p>
              <Link to="/">
                <Button className="bg-blue-600 hover:bg-blue-700">
                  トップページに戻る
                </Button>
              </Link>
            </Card>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEO 
        title="スポンサー広告お問い合わせ"
        description="ドッグパークJPでスポンサー広告を掲載しませんか？効果的な広告プランをご提案いたします"
      />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-2xl mx-auto px-4">
          {/* ヘッダー */}
          <div className="mb-8">
            <Link 
              to="/" 
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              トップページに戻る
            </Link>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              スポンサー広告お問い合わせ
            </h1>
            <p className="text-gray-600">
              ドッグパークJPで効果的な広告を掲載しませんか？<br />
              まずは事業者様の情報をお聞かせください。
            </p>
          </div>

          {/* メインコンテンツ */}
          <Card className="p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                事業者情報の入力
              </h2>
              <p className="text-gray-600 text-sm">
                ご入力いただいた情報を確認後、詳細な広告プランと料金をメールでお送りいたします。
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 会社名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Building className="w-4 h-4 inline mr-1" />
                  会社名 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={form.company_name}
                  onChange={(e) => handleInputChange('company_name', e.target.value)}
                  placeholder="株式会社〇〇"
                  required
                  className="w-full"
                />
              </div>

              {/* 担当者名 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  担当者名 <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  value={form.contact_person}
                  onChange={(e) => handleInputChange('contact_person', e.target.value)}
                  placeholder="山田 太郎"
                  required
                  className="w-full"
                />
              </div>

              {/* メールアドレス */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-1" />
                  メールアドレス <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="example@company.com"
                  required
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  こちらのメールアドレス宛に詳細資料をお送りします
                </p>
              </div>

              {/* 送信ボタン */}
              <div className="pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3"
                >
                  {isSubmitting ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      送信中...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      資料請求・お問い合わせ
                    </>
                  )}
                </Button>
              </div>
            </form>

            {/* 注意事項 */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-900 mb-2">ご注意</h3>
              <ul className="text-xs text-gray-600 space-y-1">
                <li>• 事業者様のみを対象としたサービスです</li>
                <li>• お問い合わせ後、24時間以内にメールをお送りします</li>
                <li>• 詳細な広告プランと料金表をメールでご案内いたします</li>
                <li>• ご不明な点がございましたら、お気軽にお問い合わせください</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
};

export default SponsorInquiry;