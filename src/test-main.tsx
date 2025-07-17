import ReactDOM from 'react-dom/client';

// 最小限のテストコンポーネント
const TestApp = () => {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ color: 'green' }}>✅ React App Loading Test</h1>
      <p>もしこのメッセージが表示されていれば、基本的なReactアプリは動作しています。</p>
      <div style={{ background: '#f0f0f0', padding: '10px', margin: '10px 0' }}>
        <strong>現在の時刻:</strong> {new Date().toLocaleString('ja-JP')}
      </div>
    </div>
  );
};

// Root要素の確認
const rootElement = document.getElementById('root');
console.log('Root element:', rootElement);

if (rootElement) {
  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<TestApp />);
    console.log('✅ Test app rendered successfully');
  } catch (error) {
    console.error('❌ Error rendering test app:', error);
  }
} else {
  console.error('❌ Root element not found');
}
