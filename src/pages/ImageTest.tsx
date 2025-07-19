// ImageTest.tsx - 画像読み込みテスト用ページ
import React from 'react';

const testImages = [
  'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg',
  'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg',
  'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg',
  'https://via.placeholder.com/400x300?text=Test+Image',
];

export function ImageTest() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">画像読み込みテスト</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {testImages.map((imageUrl, index) => (
          <div key={index} className="border rounded-lg p-4">
            <h3 className="text-lg font-semibold mb-4">テスト画像 {index + 1}</h3>
            <div className="bg-gray-100 rounded-lg overflow-hidden h-48 mb-4">
              <img
                src={imageUrl}
                alt={`テスト画像 ${index + 1}`}
                className="w-full h-full object-cover"
                onLoad={() => {
                  console.log(`✅ 画像読み込み成功: ${imageUrl}`);
                }}
                onError={e => {
                  console.error(`❌ 画像読み込み失敗: ${imageUrl}`);
                  console.error('Error event:', e);
                }}
              />
            </div>
            <p className="text-sm text-gray-600 break-all">URL: {imageUrl}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">テスト手順:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>DevToolsのConsoleタブを開く</li>
          <li>CSPエラーがないことを確認</li>
          <li>画像読み込みの成功/失敗メッセージを確認</li>
          <li>Networkタブで画像リクエストのステータスを確認</li>
        </ol>
      </div>
    </div>
  );
}
