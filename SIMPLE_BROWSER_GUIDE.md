# 🌐 Simple Browser + Vite Dev Server 使い方ガイド

## 🚀 クイックスタート

### 1. 開発サーバー起動

```bash
npm run dev
```

または キーボードショートカット: `Ctrl+Shift+D`

### 2. Simple Browser で開く

- **方法 1**: キーボードショートカット `Ctrl+Shift+O`
- **方法 2**: コマンドパレット（F1）→ "Simple Browser: Show" → `http://localhost:3005`
- **方法 3**: タスク実行 `Ctrl+Shift+P` → "📊 Dev + Browser + Analysis"

## ⌨️ キーボードショートカット

| ショートカット | 機能                  |
| -------------- | --------------------- |
| `Ctrl+Shift+D` | 開発サーバー起動      |
| `Ctrl+Shift+O` | Simple Browser で開く |
| `Ctrl+Shift+P` | 開発+ブラウザ+分析    |
| `Ctrl+Shift+R` | 開発サーバー再起動    |
| `Ctrl+Alt+B`   | バンドル分析表示      |
| `Ctrl+Shift+B` | プロダクションビルド  |

## 🛠️ タスク一覧

VS Code のタスクパネル（Ctrl+Shift+P → "Tasks: Run Task"）から実行可能：

- **🚀 Start Development Server** - 開発サーバー起動
- **🌐 Open in Simple Browser** - Simple Browser で開く
- **🔄 Restart Dev Server** - サーバー再起動
- **📊 Dev + Browser + Analysis** - 総合開発環境起動

## 💡 開発ワークフロー

### 基本的な開発フロー

1. `Ctrl+Shift+D` で開発サーバー起動
2. `Ctrl+Shift+O` で Simple Browser を開く
3. VS Code 左側でコード編集
4. Simple Browser 右側で即座に確認
5. ホットリロードで自動更新

### 高度な開発フロー

1. `Ctrl+Shift+P` で開発+分析環境起動
2. メインビューで開発
3. バンドル分析で最適化確認
4. パフォーマンス監視

## 🎯 Simple Browser の特徴

### ✅ メリット

- **VS Code 内統合**: 別ウィンドウ不要
- **高速起動**: 軽量で瞬時に表示
- **開発者ツール**: F12 でデバッグ可能
- **ホットリロード**: Vite と完全連動
- **マルチタブ**: 複数 URL を同時表示

### 🔧 便利機能

- **ズーム**: `Ctrl + Plus/Minus`
- **リロード**: `F5` または `Ctrl+R`
- **戻る/進む**: マウスボタンまたは矢印キー
- **検索**: `Ctrl+F`
- **開発者ツール**: `F12`

## 📱 レスポンシブ表示

Simple Browser 内でモバイル表示をテスト：

1. F12 で開発者ツール起動
2. デバイスアイコンをクリック
3. iPhone/Android 等のプリセット選択

## 🔍 デバッグ機能

### ブレークポイント

1. VS Code でブレークポイント設定
2. Simple Browser で F12
3. Sources タブでデバッグ

### コンソール確認

1. Simple Browser で F12
2. Console タブでログ確認
3. VS Code とリアルタイム連動

## 🚀 パフォーマンス監視

### 1. ネットワーク確認

- F12 → Network タブ
- リロードしてファイル読み込み確認
- サイズと読み込み時間をチェック

### 2. バンドル分析

- `Ctrl+Alt+B` で stats.html 表示
- チャンクサイズと依存関係確認

### 3. Lighthouse 監査

- F12 → Lighthouse タブ
- "Generate report"でスコア確認

## 🔧 トラブルシューティング

### サーバーが起動しない

```bash
# ポートを変更して再起動
npm run dev -- --port 3006
```

### Simple Browser が空白

1. サーバーの起動を確認
2. URL が正しいかチェック
3. `Ctrl+R`でリロード

### ホットリロードが効かない

1. `Ctrl+Shift+R`でサーバー再起動
2. ブラウザのキャッシュクリア
3. VS Code 再起動

## 🎨 カスタマイズ

### Vite 設定の調整

`vite.config.ts`:

```typescript
server: {
  port: 3005,      // ポート番号
  open: false,     // 自動ブラウザ起動無効
  hmr: {
    overlay: false // エラーオーバーレイ無効
  }
}
```

### VS Code 設定

`.vscode/settings.json`:

```json
{
  "simpleBrowser.focusLockIndicator.enabled": true,
  "liveServer.settings.port": 3005
}
```

## 📈 効率アップのコツ

1. **キーボードショートカット**を覚える
2. **サイドバイサイド**でコードとブラウザを並べる
3. **ホットリロード**を活用してリアルタイム確認
4. **開発者ツール**で即座にデバッグ
5. **バンドル分析**で定期的に最適化チェック

これで**最高効率の開発環境**が完成です！🎉
