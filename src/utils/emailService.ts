import emailjs from '@emailjs/browser';

// EmailJS設定（環境変数から取得）
const EMAILJS_SERVICE_ID = 'service_dogparkjp'; // EmailJSで作成したサービスID
const EMAILJS_TEMPLATE_ID = 'template_sponsor_inquiry'; // EmailJSで作成したテンプレートID  
const EMAILJS_PUBLIC_KEY = 'YOUR_EMAILJS_PUBLIC_KEY'; // EmailJSの公開キー

// EmailJSを初期化
emailjs.init(EMAILJS_PUBLIC_KEY);

export interface EmailParams {
  to_email: string;
  to_name: string;
  company_name: string;
  sponsor_url: string;
  from_name?: string;
  reply_to?: string;
}

export const sendSponsorInquiryEmail = async (params: EmailParams): Promise<boolean> => {
  try {
    const templateParams = {
      to_email: params.to_email,
      to_name: params.to_name,
      company_name: params.company_name,
      sponsor_url: params.sponsor_url,
      from_name: 'ドッグパークJP運営チーム',
      reply_to: 'support@dogparkjp.com',
      subject: '【ドッグパークJP】スポンサー広告資料のご案内',
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams
    );

    console.log('Email sent successfully:', response);
    return true;
  } catch (error) {
    console.error('Email sending failed:', error);
    return false;
  }
};

// 簡易版：ブラウザのmailto機能を使用（確実に動作）
export const openMailtoLink = (params: EmailParams): void => {
  const subject = encodeURIComponent('【ドッグパークJP】スポンサー広告資料のご案内');
  const body = encodeURIComponent(`${params.company_name}
${params.to_name} 様

この度は、ドッグパークJPのスポンサー広告にご興味をお持ちいただき、誠にありがとうございます。

詳細な広告プランと料金につきましては、以下のURLよりご確認いただけます：
${params.sponsor_url}

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

  const mailtoUrl = `mailto:${params.to_email}?subject=${subject}&body=${body}`;
  window.open(mailtoUrl, '_blank');
};