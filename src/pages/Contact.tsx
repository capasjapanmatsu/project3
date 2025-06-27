import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, MapPin, Send, CheckCircle, AlertTriangle, User, MessageSquare } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { supabase } from '../utils/supabase';

export function Contact() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      // Validate form data
      if (!formData.name.trim()) {
        throw new Error('お名前を入力してください');
      }
      if (!formData.email.trim()) {
        throw new Error('メールアドレスを入力してください');
      }
      if (!formData.subject.trim()) {
        throw new Error('件名を入力してください');
      }
      if (!formData.message.trim()) {
        throw new Error('メッセージを入力してください');
      }

      // Email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        throw new Error('有効なメールアドレスを入力してください');
      }

      // Submit to database
      const { error: submitError } = await supabase
        .from('contact_messages')
        .insert([{
          name: formData.name,
          email: formData.email,
          subject: formData.subject,
          message: formData.message,
          status: 'new'
        }]);

      if (submitError) throw submitError;

      // Send notification to admin
      const { error: notifyError } = await supabase
        .from('admin_notifications')
        .insert([{
          type: 'user_report',
          title: 'お問い合わせがありました',
          message: `${formData.name}さんからのお問い合わせ: ${formData.subject}`,
          data: { email: formData.email }
        }]);

      if (notifyError) {
        console.error('Error sending admin notification:', notifyError);
        // Continue even if notification fails
      }

      // Success
      setSuccess(true);
      setFormData({
        name: '',
        email: '',
        subject: '',
        message: '',
      });
    } catch (err: any) {
      console.error('Error submitting contact form:', err);
      setError(err.message || 'お問い合わせの送信に失敗しました。もう一度お試しください。');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link to="/" className="inline-flex items-center text-blue-600 hover:text-blue-800">
          <ArrowLeft className="w-4 h-4 mr-2" />
          ホームに戻る
        </Link>
      </div>

      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold mb-4">お問い合わせ</h1>
        <p className="text-gray-600">ご質問やご意見がございましたら、お気軽にお問い合わせください。</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Contact Form */}
        <div className="md:col-span-2">
          <Card className="p-6">
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">お問い合わせありがとうございます</h2>
                <p className="text-gray-600 mb-6">
                  メッセージを受け付けました。担当者が確認次第、ご連絡いたします。
                </p>
                <Button onClick={() => setSuccess(false)}>
                  新しいお問い合わせ
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <h2 className="text-xl font-semibold mb-6 flex items-center">
                  <MessageSquare className="w-6 h-6 text-blue-600 mr-2" />
                  お問い合わせフォーム
                </h2>

                {error && (
                  <div className="mb-6 p-4 bg-red-50 rounded-lg flex items-start">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
                    <p className="text-red-800">{error}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <Input
                    label="お名前 *"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    icon={<User className="w-4 h-4 text-gray-500" />}
                  />

                  <Input
                    label="メールアドレス *"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                    icon={<Mail className="w-4 h-4 text-gray-500" />}
                  />

                  <Input
                    label="件名 *"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                  />

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      メッセージ *
                    </label>
                    <textarea
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      rows={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div className="mt-6">
                    <Button
                      type="submit"
                      isLoading={isSubmitting}
                      className="w-full"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      送信する
                    </Button>
                  </div>
                </div>
              </form>
            )}
          </Card>
        </div>

        {/* Contact Information */}
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Mail className="w-5 h-5 text-blue-600 mr-2" />
              お問い合わせ先
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-gray-500 mt-1" />
                <div>
                  <p className="font-medium">メール</p>
                  <p className="text-gray-600">info@dogparkjp.com</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="w-5 h-5 text-gray-500 mt-1" />
                <div>
                  <p className="font-medium">住所</p>
                  <p className="text-gray-600">
                    〒861-0563<br />
                    熊本県山鹿市鹿央町千田１７１８－１３<br />
                    株式会社ＣＡＰＡＳ
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-blue-50 border-blue-200">
            <h3 className="text-lg font-semibold mb-4 text-blue-900">よくあるお問い合わせ</h3>
            <div className="space-y-3">
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <p className="font-medium text-blue-900">Q: サブスクリプションの解約方法は？</p>
                <p className="text-sm text-gray-600 mt-1">
                  A: マイページの「サブスクリプション管理」から解約手続きができます。
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <p className="font-medium text-blue-900">Q: ワクチン証明書の承認にはどれくらい時間がかかりますか？</p>
                <p className="text-sm text-gray-600 mt-1">
                  A: 通常3営業日以内に審査を完了します。
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <p className="font-medium text-blue-900">Q: 予約のキャンセルはいつまでできますか？</p>
                <p className="text-sm text-gray-600 mt-1">
                  A: 予約時間の24時間前までキャンセル可能です。
                </p>
              </div>
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <p className="font-medium text-blue-900">Q: ドッグランオーナーになるには？</p>
                <p className="text-sm text-gray-600 mt-1">
                  A: マイページから「ドッグラン登録」を選択し、審査を受けてください。
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}