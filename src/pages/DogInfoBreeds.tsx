import React from 'react';

export default function DogInfoBreeds() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4 text-center">犬種ごとにかかりやすい主な病気</h1>
      <img src="https://images.pexels.com/photos/1108098/pexels-photo-1108098.jpeg?auto=compress&w=400" alt="犬種と病気" className="w-full max-w-md mx-auto rounded-lg mb-6" />
      <p className="mb-4">犬種ごとに体質や遺伝的傾向があり、なりやすい病気も異なります。代表的な例と予防策を紹介します。</p>
      <ul className="list-disc pl-6 mb-4">
        <li><b>ダックスフンド</b>：椎間板ヘルニア（胴長短足のため）。→体重管理・段差注意</li>
        <li><b>トイプードル</b>：膝蓋骨脱臼（小型犬に多い）。→滑りにくい床・適度な運動</li>
        <li><b>柴犬</b>：アトピー性皮膚炎。→こまめなシャンプー・アレルゲン管理</li>
      </ul>
      <p>犬種ごとの特徴を知り、早期発見・予防に努めましょう。</p>
    </div>
  );
} 