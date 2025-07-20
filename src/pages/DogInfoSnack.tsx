import React from 'react';

export default function DogInfoSnack() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4 text-center">ワンちゃん用おやつやおもちゃの重要性</h1>
      <img src="https://images.pexels.com/photos/1108097/pexels-photo-1108097.jpeg?auto=compress&w=400" alt="ワンちゃん用おやつとおもちゃ" className="w-full max-w-md mx-auto rounded-lg mb-6" />
      <p className="mb-4">ワンちゃん用おやつやおもちゃは、歯みがき効果やストレス発散など、健康維持に役立ちます。選び方のポイントも紹介します。</p>
      <ul className="list-disc pl-6 mb-4">
        <li>歯みがきガムや噛むおもちゃは、歯石予防やストレス解消に役立つ。</li>
        <li>安全な素材・サイズを選び、誤飲に注意。</li>
        <li>与えすぎや壊れたおもちゃはNG。</li>
      </ul>
      <p>ワンちゃんの性格や年齢に合ったものを選びましょう。</p>
    </div>
  );
} 
