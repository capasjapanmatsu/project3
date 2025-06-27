import React from 'react';

export default function DogInfoVaccine() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4 text-center">狂犬病予防や混合ワクチンの重要性</h1>
      <img src="https://images.pexels.com/photos/1404819/pexels-photo-1404819.jpeg?auto=compress&w=400" alt="ワクチン接種" className="w-full max-w-md mx-auto rounded-lg mb-6" />
      <p className="mb-4">ワクチン接種は愛犬と社会全体を守るために不可欠です。狂犬病予防接種は法律で義務付けられており、未接種には罰則もあります。</p>
      <ul className="list-disc pl-6 mb-4">
        <li>狂犬病予防接種は年1回、飼い主の義務（狂犬病予防法）。</li>
        <li>混合ワクチンは感染症から愛犬を守る。</li>
        <li>未接種だと命に関わる病気や、他の犬・人への感染リスクも。</li>
      </ul>
      <p>ワクチンは飼い主の責任。必ず動物病院で接種しましょう。</p>
    </div>
  );
} 