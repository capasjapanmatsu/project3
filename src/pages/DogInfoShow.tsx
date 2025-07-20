import React from 'react';

export default function DogInfoShow() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4 text-center">ドッグショーについて</h1>
      <img src="https://images.pexels.com/photos/458804/pexels-photo-458804.jpeg?auto=compress&w=400" alt="ドッグショー" className="w-full max-w-md mx-auto rounded-lg mb-6" />
      <p className="mb-4">ドッグショーはワンちゃん種ごとの美しさや能力を競うイベントです。観覧や参加の方法、今後の提案コーナーも紹介します。</p>
      <ul className="list-disc pl-6 mb-4">
        <li>ワンちゃん種ごとの美しさや能力を競うイベント。プロ・アマ問わず参加可能。</li>
        <li>観覧は誰でもOK。ワンちゃん好き同士の交流の場にも。</li>
        <li>「うちの子も出てみたい！」という方は、主催団体やクラブに相談を。</li>
      </ul>
      <p>今後、地域のドッグショー情報や体験レポートも掲載予定です！</p>
    </div>
  );
} 
