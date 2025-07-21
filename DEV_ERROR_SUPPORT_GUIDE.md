# 開発エラー監視＆サポートガイド

このガイドは、開発中に発生する各種エラーの迅速な対応のためのリファレンスです。

## 🚨 エラーパターン別対応法

### 1. 構文エラー・型エラー

**よくあるパターン：**
```
- TypeScript error: Property 'xxx' does not exist on type
- SyntaxError: Unexpected token
- Module not found: Can't resolve
```

**対応手順：**
1. エラーメッセージのファイル名と行数を確認
2. 該当箇所の型定義・インポート文をチェック
3. 修正コード例の提示

### 2. 依存関係の警告

**よくあるパターン：**
```
- npm WARN deprecated package-name@version
- peer dependency warning
- security vulnerability found
```

**対応手順：**
1. パッケージ名と問題のある版本を特定
2. 最新の安全なバージョンを確認
3. package.json の修正版を提案

### 3. HMR・再ビルドエラー

**よくあるパターン：**
```
- [vite] hmr update /src/xxx.tsx failed
- Failed to reload /src/xxx.tsx
- Module build failed
```

**対応手順：**
1. Viteキャッシュクリア: `rm -rf node_modules/.vite`
2. vite.config.ts の設定確認
3. HMR設定の最適化

### 4. パフォーマンス問題

**監視項目：**
- ビルド時間: 500ms以上で警告
- チャンクサイズ: 500KB以上で警告
- 重複依存関係の検出

**最適化案：**
- Code Splitting の実装
- 不要な依存関係の削除
- Lazy Loading の活用

## 📊 リアルタイム監視設定

### Vite設定（既に適用済み）
```typescript
// パフォーマンス監視プラグイン有効
// ビルド時間閾値: 500ms
// 詳細ログ出力: ON
// HMR最適化: ON
```

### エラー報告方法
エラーが発生したら以下を共有してください：
1. **スクリーンショット** または **エラーテキスト**
2. **発生したタイミング**（ファイル変更時、起動時など）
3. **実行していた操作**

### 即座対応できる問題
- ✅ TypeScript型エラー
- ✅ インポートエラー
- ✅ ESLint警告
- ✅ Vite設定問題
- ✅ 依存関係問題
- ✅ HMRエラー

## 🔧 よく使う修正コマンド

```bash
# キャッシュクリア
npm run dev -- --force

# 依存関係再インストール
rm -rf node_modules package-lock.json && npm install

# TypeScript型チェック
npx tsc --noEmit

# ESLint修正
npx eslint src --fix

# Viteキャッシュクリア
rm -rf node_modules/.vite && npm run dev
```

## 🎯 緊急時対応フロー

1. **エラー発生**
   - スクリーンショット撮影
   - エラーメッセージをコピー

2. **即座報告**
   - チャットでエラー情報共有
   - 「修正案お願いします」と記載

3. **修正適用**
   - 提示された修正コードを適用
   - 結果を報告

4. **動作確認**
   - 修正後の動作確認
   - 追加問題があれば再報告

---

このガイドに従って、開発中のエラーを迅速に解決していきましょう！ 