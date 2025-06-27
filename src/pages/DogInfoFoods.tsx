import React from 'react';

export default function DogInfoFoods() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4 text-center">ワンちゃんが食べてはいけない食べ物</h1>
      <img src="https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg?auto=compress&w=400" alt="危険な食べ物" className="w-full max-w-md mx-auto rounded-lg mb-6" />
      <p className="mb-4">ワンちゃんにとって危険な食べ物は意外と多く、誤食すると命に関わることもあります。代表的なものとその理由をまとめました。</p>
      <ul className="list-disc pl-6 mb-4">
        <li><b>チョコレート</b>：テオブロミンが中毒を起こし、嘔吐・けいれん・最悪の場合死に至ることも。</li>
        <li><b>ぶどう・レーズン</b>：腎不全を引き起こすことがあり、少量でも危険。</li>
        <li><b>玉ねぎ・ねぎ類</b>：赤血球を壊し、貧血や血尿の原因に。</li>
        <li><b>アボカド</b>：ペルシンという成分が中毒を起こす。</li>
        <li><b>キシリトール</b>：血糖値の急激な低下や肝障害を引き起こす。</li>
        <li><b>アルコール・カフェイン</b>：中枢神経に作用し、命に関わる。</li>
      </ul>
      <p>人間には無害でも、ワンちゃんには危険な食材が多くあります。食卓やゴミ箱の管理、誤食時の早期受診が大切です。</p>
    </div>
  );
} 