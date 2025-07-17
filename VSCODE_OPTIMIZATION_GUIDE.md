# VS Code 最適化ガイド - TypeScript/React PWA 開発環境

## 🎯 必須拡張機能（最小構成）

### Core Extensions（絶対必要）

- **TypeScript**: `ms-vscode.vscode-typescript-next`
- **ESLint**: `dbaeumer.vscode-eslint`
- **Prettier**: `esbenp.prettier-vscode`

### UI/UX Extensions（推奨）

- **Material Icon Theme**: `PKief.material-icon-theme`
- **Tailwind CSS IntelliSense**: `bradlc.vscode-tailwindcss`

### JSON/YAML Support

- **JSON**: `ms-vscode.vscode-json` (ビルトイン)
- **YAML**: `redhat.vscode-yaml`

## 🚫 削除推奨拡張機能（パフォーマンス向上）

### 重い拡張機能

- Python 関連: `ms-python.python`
- Java 関連: `redhat.java`, `vscjava.vscode-java-pack`
- C++関連: `ms-vscode.cpptools`
- Docker 関連: `ms-azuretools.vscode-docker`
- Kubernetes 関連: `ms-kubernetes-tools.vscode-kubernetes-tools`

### 重複機能の拡張機能

- Live Server: `ritwickdey.liveserver` (Vite があるため不要)
- REST Client: `humao.rest-client` (必要に応じて)

## ⚡ パフォーマンス最適化設定

### 1. ファイル監視最適化

```json
{
  "files.watcherExclude": {
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/.git/**": true,
    "**/coverage/**": true
  }
}
```

### 2. 検索除外設定

```json
{
  "search.exclude": {
    "**/node_modules/**": true,
    "**/dist/**": true,
    "**/package-lock.json": true
  }
}
```

### 3. TypeScript 最適化

```json
{
  "typescript.workspaceSymbols.scope": "currentProject",
  "typescript.preferences.maxInlayHintLength": 30,
  "typescript.inlayHints.parameterTypes.enabled": false
}
```

## 🔧 開発効率設定

### 自動保存・フォーマット

```json
{
  "files.autoSave": "afterDelay",
  "files.autoSaveDelay": 1000,
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  }
}
```

### エディター設定

```json
{
  "editor.fontSize": 14,
  "editor.tabSize": 2,
  "editor.fontLigatures": true,
  "editor.minimap.enabled": false
}
```

## 🚀 起動・ホットリロード最適化

### 1. VS Code 起動最適化

```json
{
  "extensions.autoCheckUpdates": false,
  "extensions.autoUpdate": false,
  "workbench.startupEditor": "none",
  "window.restoreWindows": "none"
}
```

### 2. 不要機能の無効化

```json
{
  "telemetry.telemetryLevel": "off",
  "workbench.enableExperiments": false,
  "git.autofetch": false
}
```

### 3. UI 最適化

```json
{
  "workbench.editor.enablePreview": false,
  "editor.occurrencesHighlight": "off",
  "editor.selectionHighlight": false
}
```

## 📁 プロジェクト構造最適化

### .vscode/settings.json

プロジェクト固有の設定。チーム共有推奨。

### .vscode/extensions.json

推奨拡張機能と除外リスト。

### .vscode/launch.json（必要に応じて）

デバッグ設定。

## 🔄 Vite 設定との連携

### 開発サーバー最適化

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    hmr: {
      overlay: false, // エラーオーバーレイ無効化
    },
    open: false, // 自動ブラウザ起動無効化
  },
});
```

## 📊 パフォーマンス監視

### 拡張機能パフォーマンス確認

1. `Ctrl+Shift+P` → "Developer: Show Running Extensions"
2. 重い拡張機能を特定・無効化

### VS Code 起動時間計測

```bash
code --status
```

## 🎯 推奨ワークフロー

### 1. 朝の作業開始

```bash
# VS Code起動（最小構成）
code .

# 開発サーバー起動
npm run dev
```

### 2. 開発中

- 自動保存・フォーマット活用
- ホットリロードでリアルタイム確認
- TypeScript 型チェック活用

### 3. 終了時

```bash
# 開発サーバー停止
Ctrl+C

# VS Code終了
Ctrl+Shift+W
```

## 🔍 トラブルシューティング

### VS Code が重い場合

1. 拡張機能の無効化
2. `~/.vscode/extensions`フォルダの整理
3. ワークスペース設定の見直し

### TypeScript サーバーが重い場合

1. `Ctrl+Shift+P` → "TypeScript: Restart TS Server"
2. `tsconfig.json`の`include`/`exclude`見直し
3. プロジェクトサイズの縮小

### ホットリロードが遅い場合

1. ファイル監視除外設定の追加
2. Vite 設定の最適化
3. ファイルシステムの最適化

この設定により、TypeScript/React PWA 開発に最適化された軽量な VS Code 環境が構築できます。
