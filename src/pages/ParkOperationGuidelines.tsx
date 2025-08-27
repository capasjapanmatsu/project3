import { Link } from 'react-router-dom';
import Card from '../components/Card';
import { SEO } from '../components/SEO';

export default function ParkOperationGuidelines() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <SEO title="ドッグラン運営の注意事項" description="運営にあたっての重要な注意事項" />
      <h1 className="text-2xl font-bold mb-4">ドッグラン運営の注意事項</h1>
      <Card className="p-6 space-y-4">
        <p>運営開始前に、以下の事項を必ずご確認ください。</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>万が一、事故やトラブルが発生した場合は、<span className="font-semibold">早急に現場へ向かい対応</span>してください。</li>
          <li><span className="font-semibold">ウンチ等の廃棄用ゴミ箱の設置は必須</span>です。定期的に袋を交換し、衛生管理を徹底してください。</li>
          <li>施設内での<span className="font-semibold">除草剤の使用は禁止</span>です。手作業や安全な方法での雑草管理をお願いします。</li>
          <li>ワンちゃんが飲み込んでしまいそうな小さな物が落ちていないか、<span className="font-semibold">定期巡回</span>してください。</li>
          <li>フェンスや設備に<span className="font-semibold">突起物・鋭利な箇所が無いか</span>を点検し、怪我の恐れがある箇所は速やかに是正してください。</li>
          <li>
            フェンスは<strong>金属製または樹脂等の丈夫な素材</strong>を使用し、<strong>ネット等は使用禁止</strong>としてください。<br />
            高さは<strong>1m20cm以上</strong>を目安とし、<strong>下側に15cm以上の隙間が生じない</strong>構造にしてください。
          </li>
          <li>
            入退場口は<strong>必ず二重扉</strong>（前室）とし、<strong>外側はスマートロック付きの扉</strong>を設置してください。
          </li>
          <li>
            エリア分けの目安：<strong>大型犬は10kg以上</strong>／<strong>小型犬は10kg以下</strong>で区分し、混雑時は安全上の配慮を優先してください。
          </li>
          <li>
            施設内の見やすい場所に<strong>緊急連絡先</strong>（運営者名・電話番号）を必ず掲示してください。
          </li>
        </ul>
        <p className="text-sm text-gray-600">上記は最低限の事項です。安全で快適な運営のため、随時点検・改善をお願いします。</p>
      </Card>
      <div className="mt-6">
        <Link to="/my-parks-management" className="text-blue-700 hover:text-blue-900 underline">管理中ドッグラン一覧へ戻る</Link>
      </div>
    </div>
  );
}
