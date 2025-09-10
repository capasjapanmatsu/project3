import { Helmet } from 'react-helmet-async';
import { COMPANY } from '../config/company';

export default function LegalTokushoho() {
  const C = COMPANY;
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <Helmet>
        <title>特定商取引法に基づく表記 - ドッグパークJP</title>
        <meta name="robots" content="index,follow" />
      </Helmet>
      <h1 className="text-2xl font-bold mb-6">特定商取引法に基づく表記</h1>

      <div className="space-y-4 text-sm leading-7">
        <Row label="販売業者" value={C.CORP_LEGAL_NAME} />
        <Row label="運営責任者" value={C.REPRESENTATIVE_NAME} />
        <Row label="所在地" value={C.CORP_ADDRESS} />
        <Row label="電話番号" value={C.CORP_TEL} />
        <Row label="メールアドレス" value={C.SUPPORT_EMAIL} />
        <Row label="URL" value={<a href="https://dogparkjp.com/" className="text-blue-600 underline">https://dogparkjp.com/</a>} />

        <Section title="販売価格">
          各サービス/予約ページに税込価格を表示
        </Section>
        <Section title="商品代金以外の必要料金">{C.EXTRA_FEES}</Section>
        <Section title="支払方法">クレジットカード（Stripe）</Section>
        <Section title="支払時期">
          ・都度課金：予約/申込時にお支払い<br />
          ・サブスクリプション：申込日を基準に毎月自動課金
        </Section>
        <Section title="役務の提供時期">決済完了後ただちに予約確定/利用開始（メール通知）</Section>
        <Section title="解約・キャンセル">
          ・サブスク：次回更新日の{C.CANCEL_DEADLINE_DAYS}日前までの手続きで解約。日割り精算は行いません。<br />
          ・予約サービス：各施設のキャンセルポリシーに準拠（詳細は予約ページに記載）
        </Section>
        <Section title="返品・不良品">該当なし（デジタル/役務のため）</Section>
        <Section title="営業時間">{C.BUSINESS_HOURS}</Section>
        <Section title="動作環境">特に指定なし</Section>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 py-2 border-b">
      <div className="text-gray-500">{label}</div>
      <div className="md:col-span-2 break-words">{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div className="py-2 border-b">
      <div className="text-gray-500">{title}</div>
      <div className="mt-1">{children}</div>
    </div>
  );
}



