import React, { useState } from 'react';
import Card from '../components/Card';
import Button from '../components/Button';

const articles = [
  {
    title: '犬が食べてはいけない食べ物',
    image: 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&w=300',
    summary: 'チョコレート、ぶどう、玉ねぎなど、犬にとって危険な食べ物とその理由を解説します。',
    detail: (
      <>
        <ul className="list-disc pl-5 mb-2">
          <li><b>チョコレート</b>：テオブロミンが中毒を起こし、嘔吐・けいれん・最悪の場合死に至ることも。</li>
          <li><b>ぶどう・レーズン</b>：腎不全を引き起こすことがあり、少量でも危険。</li>
          <li><b>玉ねぎ・ねぎ類</b>：赤血球を壊し、貧血や血尿の原因に。</li>
          <li>その他：アボカド、キシリトール、アルコール、カフェインなどもNG。</li>
        </ul>
        <p>人間には無害でも、犬には命に関わる食材が多くあります。誤食に注意しましょう。</p>
      </>
    ),
  },
  {
    title: '狂犬病予防や混合ワクチンの重要性',
    image: 'https://images.pexels.com/photos/1404819/pexels-photo-1404819.jpeg?auto=compress&w=300',
    summary: 'ワクチン接種は法律で義務付けられており、愛犬と社会全体を守るために不可欠です。',
    detail: (
      <>
        <ul className="list-disc pl-5 mb-2">
          <li>狂犬病予防接種は法律で年1回義務。未接種は罰則も。</li>
          <li>混合ワクチンは感染症から愛犬を守る。</li>
          <li>未接種だと命に関わる病気や、他の犬・人への感染リスクも。</li>
        </ul>
        <p>ワクチンは飼い主の責任。必ず動物病院で接種しましょう。</p>
      </>
    ),
  },
  {
    title: '犬種ごとにかかりやすい主な病気',
    image: 'https://images.pexels.com/photos/1108098/pexels-photo-1108098.jpeg?auto=compress&w=300',
    summary: '代表的な犬種と、なりやすい病気・予防策を紹介します。',
    detail: (
      <>
        <ul className="list-disc pl-5 mb-2">
          <li><b>ダックスフンド</b>：椎間板ヘルニア（胴長短足のため）。→体重管理・段差注意</li>
          <li><b>トイプードル</b>：膝蓋骨脱臼（小型犬に多い）。→滑りにくい床・適度な運動</li>
          <li><b>柴犬</b>：アトピー性皮膚炎。→こまめなシャンプー・アレルゲン管理</li>
        </ul>
        <p>犬種ごとの体質や遺伝的傾向を知り、早期発見・予防に努めましょう。</p>
      </>
    ),
  },
  {
    title: 'フィラリア・ダニ・ノミなど寄生虫の危険性',
    image: 'https://images.pexels.com/photos/458799/pexels-photo-458799.jpeg?auto=compress&w=300',
    summary: '寄生虫による症状や、予防・対策のポイントを解説します。',
    detail: (
      <>
        <ul className="list-disc pl-5 mb-2">
          <li><b>フィラリア</b>：蚊が媒介し、心臓や肺に寄生。咳・元気消失・重症化で死に至る。</li>
          <li><b>ノミ・ダニ</b>：皮膚炎・貧血・バベシア症など。人にも感染することが。</li>
        </ul>
        <p>毎月の予防薬や、散歩後のチェックでしっかり対策しましょう。</p>
      </>
    ),
  },
  {
    title: '犬用おやつやおもちゃの重要性',
    image: 'https://images.pexels.com/photos/1108097/pexels-photo-1108097.jpeg?auto=compress&w=300',
    summary: '歯みがき効果やストレス発散など、犬用おやつ・おもちゃの役割と選び方を紹介。',
    detail: (
      <>
        <ul className="list-disc pl-5 mb-2">
          <li>歯みがきガムや噛むおもちゃは、歯石予防やストレス解消に役立つ。</li>
          <li>安全な素材・サイズを選び、誤飲に注意。</li>
          <li>与えすぎや壊れたおもちゃはNG。</li>
        </ul>
        <p>愛犬の性格や年齢に合ったものを選びましょう。</p>
      </>
    ),
  },
  {
    title: 'ドッグショーについて',
    image: 'https://images.pexels.com/photos/458804/pexels-photo-458804.jpeg?auto=compress&w=300',
    summary: 'ドッグショーの魅力や観覧方法、どんな犬が出られるかを紹介。提案コーナーも！',
    detail: (
      <>
        <ul className="list-disc pl-5 mb-2">
          <li>犬種ごとの美しさや能力を競うイベント。プロ・アマ問わず参加可能。</li>
          <li>観覧は誰でもOK。犬好き同士の交流の場にも。</li>
          <li>「うちの子も出てみたい！」という方は、主催団体やクラブに相談を。</li>
        </ul>
        <p>今後、地域のドッグショー情報や体験レポートも掲載予定です！</p>
      </>
    ),
  },
];

export default function DogInfo() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6 text-center">犬についての情報発信</h1>
      <div className="grid md:grid-cols-2 gap-6">
        {articles.map((article, idx) => (
          <Card key={article.title} className="p-4 flex flex-col items-center">
            <img src={article.image} alt={article.title} className="w-32 h-32 object-cover rounded-full mb-3" />
            <h2 className="text-lg font-semibold mb-2 text-center">{article.title}</h2>
            <p className="text-gray-700 text-sm mb-2 text-center">{article.summary}</p>
            <Button size="sm" variant="secondary" onClick={() => setOpenIndex(openIndex === idx ? null : idx)}>
              {openIndex === idx ? '閉じる' : '詳しく見る'}
            </Button>
            {openIndex === idx && (
              <div className="mt-3 w-full text-sm text-left bg-gray-50 rounded p-3 border">
                {article.detail}
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
} 