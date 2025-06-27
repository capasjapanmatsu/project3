import React from 'react';

export default function DogInfoParasite() {
  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-4 text-center">フィラリア・ダニ・ノミなど寄生虫の危険性</h1>
      <img src="https://images.pexels.com/photos/458799/pexels-photo-458799.jpeg?auto=compress&w=400" alt="寄生虫対策" className="w-full max-w-md mx-auto rounded-lg mb-6" />
      <p className="mb-4">寄生虫はワンちゃんの健康を脅かすだけでなく、人にも感染することがあります。主な症状や予防・対策を解説します。</p>
      <ul className="list-disc pl-6 mb-4">
        <li><b>フィラリア</b>：蚊が媒介し、心臓や肺に寄生。咳・元気消失・重症化で死に至る。</li>
        <li><b>ノミ・ダニ</b>：皮膚炎・貧血・バベシア症など。人にも感染することが。</li>
      </ul>
      <p>毎月の予防薬や、散歩後のチェックでしっかり対策しましょう。</p>
    </div>
  );
} 