# ドッグパークJP - 歴史的ページマニフェスト（昨日夕方時点）

このドキュメントは、ドッグパークJPプロジェクトの昨日夕方時点（コミット40e37b39）での全ページとそのファイル構造、ルーティング情報を記載したマニフェストです。

## 📖 目次
- [🏠 公開ページ](#-公開ページ)
- [🐕 ドッグパーク関連](#-ドッグパーク関連)
- [🛒 ショッピング関連](#-ショッピング関連)
- [📰 ニュース・情報](#-ニュース情報)
- [💬 コミュニティ・サポート](#-コミュニティサポート)
- [🔐 認証・ユーザー管理](#-認証ユーザー管理)
- [👤 ユーザーダッシュボード](#-ユーザーダッシュボード)
- [🏢 オーナー・運営関連](#-オーナー運営関連)
- [⚙️ 管理者機能](#️-管理者機能)
- [🔧 開発・システム関連](#-開発システム関連)
- [❓ エラー・404ページ](#-エラー404ページ)

---

## 🏠 公開ページ

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| トップページ | `src/pages/Home.tsx` | `/` | サイト入口、犬データとニュース表示、バナー |
| ユーザー登録画面 | `src/pages/Register.tsx` | `/register` | 新規ユーザー登録フォーム |
| ユーザーログイン画面 | `src/pages/Login.tsx` | `/login` | メール＋パスワード認証 |
| パスワード忘れ | `src/pages/ForgotPassword.tsx` | `/forgot-password` | パスワードリセット申請 |
| パスワードリセット | `src/pages/ResetPassword.tsx` | `/reset-password` | 新しいパスワード設定 |
| マジックリンク認証 | `src/pages/MagicLink.tsx` | `/magic-link` | メール認証リンク処理 |
| 認証コールバック | - | `/auth/callback` | 認証システムのコールバック処理 |

---

## 🐕 ドッグパーク関連

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| ドッグラン一覧画面 | `src/pages/DogParkList.tsx` | `/parks` | 地図表示＋リスト、検索フィルター |
| ドッグラン詳細画面 | `src/pages/DogParkDetail.tsx` | `/parks/:parkId` | QRコード発行＋入退場ロジック、予約機能 |
| ドッグランのルール | `src/pages/DogParkRules.tsx` | `/parks/rules` | 利用規約・ルール説明 |
| パーク予約画面 | `src/pages/ParkReservation.tsx` | `/parks/:parkId/reserve` | 🔐 ドッグラン予約フォーム |
| パーク管理 | `src/pages/ParkManagement.tsx` | `/parks/:parkId/manage` | 🔐 ドッグラン管理機能 |
| パーク利用履歴 | `src/pages/DogParkHistory.tsx` | `/dogpark-history` | 🔐 過去の利用記録 |
| パーク登録（二次） | `src/pages/ParkRegistrationSecondStage.tsx` | `/parks/:parkId/second-stage` | 🔐 詳細情報・施設画像登録 |
| 新パーク詳細（開発中） | `src/pages/NewParkDetail.tsx` | `/news/park/:parkId` | 🚧 新しいパーク詳細画面 |

---

## 🛒 ショッピング関連

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| ペットショップ | `src/pages/PetShop.tsx` | `/shop` | 商品一覧・カテゴリ表示 |
| 商品詳細 | `src/pages/ProductDetail.tsx` | `/shop/product/:productId` | 商品詳細情報・購入ボタン |
| ショッピングカート | `src/pages/Cart.tsx` | `/cart` | 🔐 カート内商品確認・数量変更 |
| チェックアウト | `src/pages/Checkout.tsx` | `/checkout` | 🔐 決済・配送先入力 |
| 注文履歴 | `src/pages/OrderHistory.tsx` | `/orders` | 🔐 過去の購入履歴 |

---

## 📰 ニュース・情報

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| ニュース一覧 | `src/pages/News.tsx` | `/news` | お知らせ・ニュース記事リスト |
| ニュース詳細 | `src/pages/NewsDetail.tsx` | `/news/:newsId` | 個別記事の詳細表示 |

### ワンちゃん情報コーナー

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| ワンちゃん情報トップ | `src/pages/DogInfo.tsx` | `/dog-info` | 犬に関する情報コーナー入口 |

#### 新体系（新しいページ）
| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| 健康管理 | `src/pages/dog-info/HealthManagement.tsx` | `/dog-info/health` | 健康チェック・予防 |
| トレーニング | `src/pages/dog-info/Training.tsx` | `/dog-info/training` | しつけ・訓練方法 |
| 散歩・運動 | `src/pages/dog-info/Walk.tsx` | `/dog-info/walk` | 散歩・運動のコツ |
| 食事・栄養（新） | `src/pages/dog-info/Food.tsx` | `/dog-info/food` | フード・栄養ガイド |
| ケア・お手入れ | `src/pages/dog-info/Care.tsx` | `/dog-info/care` | 日常ケア方法 |
| 犬種情報（新） | `src/pages/dog-info/Breeds.tsx` | `/dog-info/breeds` | 犬種別の詳細情報 |

#### 旧体系（レガシーページ）
| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| 食べ物注意 | `src/pages/DogInfoFoods.tsx` | `/dog-info/foods` | 危険な食べ物情報 |
| ワクチン情報 | `src/pages/DogInfoVaccine.tsx` | `/dog-info/vaccine` | ワクチン接種ガイド |
| 犬種別病気情報 | `src/pages/DogInfoBreeds.tsx` | `/dog-info/breeds`* | 犬種別の病気情報（※重複ルート） |
| 寄生虫対策 | `src/pages/DogInfoParasite.tsx` | `/dog-info/parasite` | フィラリア・ダニ・ノミ対策 |
| おやつ・おもちゃ | `src/pages/DogInfoSnack.tsx` | `/dog-info/snack` | おやつとおもちゃガイド |
| ドッグショー | `src/pages/DogInfoShow.tsx` | `/dog-info/show` | ドッグショー参加ガイド |

---

## 💬 コミュニティ・サポート

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| コミュニティ | `src/pages/Community.tsx` | `/community` | 🔐 ユーザー間交流・フォーラム |
| お問い合わせ | `src/pages/Contact.tsx` | `/contact` | サポート・問い合わせフォーム |
| 利用規約 | `src/pages/TermsOfService.tsx` | `/terms` | サービス利用規約 |
| プライバシーポリシー | `src/pages/PrivacyPolicy.tsx` | `/privacy` | 個人情報保護方針 |
| 事業者情報 | `src/pages/BusinessInformation.tsx` | `/business-information` | 法人・事業者情報入力 |

---

## 🔐 認証・ユーザー管理

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| 二段階認証設定 | `src/pages/TwoFactorSetup.tsx` | `/two-factor-setup` | 🔐 2FA初期設定 |
| 二段階認証確認 | `src/pages/TwoFactorVerify.tsx` | `/two-factor-verify` | 🔐 2FA認証コード入力 |
| アクセス制御 | `src/pages/AccessControl.tsx` | `/access-control` | 🔐 権限・アクセス管理 |

---

## 👤 ユーザーダッシュボード

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| ユーザーダッシュボード | `src/pages/UserDashboard.tsx` | `/dashboard` | 🔐 メインダッシュボード |
| プロフィール設定 | `src/pages/ProfileSettings.tsx` | `/profile-settings` | 🔐 個人情報編集 |
| ワンちゃん登録 | `src/pages/DogRegistration.tsx` | `/register-dog` | 🔐 新しい犬の登録 |
| ワンちゃん管理 | `src/pages/DogManagement.tsx` | `/dog-management` | 🔐 登録済み犬の管理 |
| ワンちゃんプロフィール | `src/pages/DogProfile.tsx` | `/dog/:id` または `/dog-profile/:dogId` | 🔐 個別犬の詳細情報 |
| いいねした犬 | `src/pages/LikedDogs.tsx` | `/liked-dogs` | 🔐 お気に入り犬リスト |

---

## 🏢 オーナー・運営関連

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| オーナーダッシュボード | `src/pages/OwnerDashboard.tsx` | `/owner-dashboard` | 🔐 施設オーナー専用画面 |
| 契約同意 | `src/pages/ParkRegistrationAgreement.tsx` | `/park-registration-agreement` | 🔐 オーナー契約同意書 |
| パーク登録（一次） | `src/pages/ParkRegistration.tsx` | `/register-park` | 🔐 ドッグラン申請（一次審査・本人確認） |
| パーク公開設定 | `src/pages/ParkPublishingSetup.tsx` | - | 🔐 公開・運営設定 |
| 施設登録 | `src/pages/FacilityRegistration.tsx` | `/facility-registration` | 🔐 ペット関連施設登録 |
| オーナー収益システム | `src/pages/OwnerPaymentSystem.tsx` | `/owner-payment-system` | 🔐 売上・振込管理 |

### 💳 決済・サブスクリプション
| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| サブスクリプション | `src/pages/Subscription.tsx` | `/subscription` | 🔐 月額プラン管理 |
| 決済設定 | `src/pages/PaymentSetup.tsx` | `/payment-setup` | 🔐 初回決済情報設定 |
| 決済方法設定 | `src/pages/PaymentMethodSettings.tsx` | `/payment-method-settings` | 🔐 クレカ・決済方法変更 |
| 決済確認 | `src/pages/PaymentConfirmation.tsx` | `/payment-confirmation` | 🔐 決済完了画面 |

---

## ⚙️ 管理者機能

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| 管理者ダッシュボード | `src/pages/AdminDashboard.tsx` | `/admin` | 👑 統計・概要・メンテナンス |
| ユーザー管理 | `src/pages/AdminUserManagement.tsx` | `/admin/users` | 👑 ユーザー一覧・詳細管理 |
| ユーザー詳細 | `src/pages/AdminUserDetail.tsx` | `/admin/users/:userId` | 👑 個別ユーザー詳細情報 |
| ドッグラン管理 | `src/pages/AdminParkManagement.tsx` | `/admin/parks` | 👑 ドッグラン審査・管理 |
| 予約管理 | `src/pages/AdminReservationManagement.tsx` | `/admin/reservations` | 👑 予約状況・キャンセル管理 |
| 売上管理 | `src/pages/AdminSalesManagement.tsx` | `/admin/sales` | 👑 売上データ・取引管理 |
| 売上レポート | `src/pages/AdminRevenueReport.tsx` | `/admin/revenue` | 👑 収益分析・レポート |
| ワクチン証明書承認 | `src/pages/AdminVaccineApproval.tsx` | `/admin/vaccine-approval` | 👑 ワクチン証明書審査 |
| ペット施設承認 | `src/pages/AdminFacilityApproval.tsx` | `/admin/facility-approval` | 👑 施設掲載申請承認 |
| ショップ管理 | `src/pages/AdminShopManagement.tsx` | `/admin/shop` | 👑 商品・在庫・注文管理 |
| ニュース管理 | `src/pages/AdminNewsManagement.tsx` | `/admin/news` | 👑 お知らせ・記事管理 |
| 管理ツール | `src/pages/AdminManagement.tsx` | `/admin/management` | 👑 その他管理機能 |
| 管理タスク | `src/pages/AdminTasks.tsx` | `/admin/tasks` | 👑 定期タスク・メンテナンス |

---

## 🔧 開発・システム関連

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| デプロイ | `src/pages/Deploy.tsx` | - | 🛠️ デプロイ操作画面 |
| デプロイ履歴 | `src/pages/DeploymentHistory.tsx` | - | 🛠️ デプロイ履歴確認 |
| Netlify設定ガイド | `src/pages/NetlifySetupGuide.tsx` | `/netlify-setup-guide` | 🛠️ Netlify設定手順 |

### PWA関連（開発・テスト用）
| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| PWAドキュメント | `src/pages/PWADocumentation.tsx` | `/pwa-documentation` | 📋 PWA実装ドキュメント |
| PWA実装ガイド | `src/pages/PWAImplementationGuide.tsx` | `/pwa-implementation-guide` | 📋 実装手順書 |
| PWAセットアップガイド | `src/pages/PWASetupGuide.tsx` | `/pwa-setup-guide` | 📋 初期設定手順 |
| PWAデプロイガイド | `src/pages/PWADeploymentGuide.tsx` | `/pwa-deployment-guide` | 📋 デプロイ手順 |
| PWAテストスイート | `src/pages/PWATestingSuite.tsx` | `/pwa-testing-suite` | 🧪 PWA機能テスト |
| PWA Lighthouse監査 | `src/pages/PWALighthouseAudit.tsx` | `/pwa-lighthouse-audit` | 📊 パフォーマンス分析 |

---

## ❓ エラー・404ページ

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| 404エラー | `src/pages/NotFound.tsx` | - | ページが見つからない場合（キャッチオール未設定） |

---

## 🔑 アクセス権限について

- **🔐 保護されたページ**: ログイン必須（ProtectedRoute）
- **👑 管理者専用**: 管理者権限必須（ProtectedRoute）
- **🛠️ 開発用**: 開発・管理者のみ
- **📋 ドキュメント**: 内部ドキュメント・ガイド
- **🧪 テスト用**: 機能テスト・検証用
- **📊 分析用**: データ分析・レポート用
- **🚧 開発中**: 実装中・テスト中機能

---

## 🔍 昨日夕方時点の特徴

### 1. より詳細なルーティング
- ショップは `/shop` パスで統一
- PWA関連ページがすべて公開ルートとして設定
- 管理者機能が細かく分類されたルート設定
- 犬情報ページに新旧両方の体系が並存

### 2. セキュリティ機能の充実
- 二段階認証機能が完全実装
- アクセス制御ページが利用可能
- 認証コールバック処理が設定済み

### 3. ルート重複の問題
- `/dog-info/breeds` が新旧両ページで重複
- 一部のページが複数のパスでアクセス可能

### 4. 管理者機能の詳細化
- ユーザー詳細ページ（`/admin/users/:userId`）
- 管理ツールとタスクが分離
- より細かい管理機能の分類

---

## 📝 備考

- このマニフェストは昨日夕方時点（コミット40e37b39）のApp.tsxルーティング設定に基づいています
- 新旧の犬情報ページが混在しており、統合が必要な状況でした
- PWA関連機能が充実していた時点です
- エラー修復時はこのマニフェストを参照して当時の構造を確認してください

---

**作成日時**: 昨日夕方時点のコミット（40e37b39）から生成  
**管理**: ドッグパークJP開発チーム 

---

## 🔧 修正履歴・重要な技術的注意点

### 2024年1月 - ペットショップの詳細表示とカートに追加ボタンの認証対応修正

**問題**: 
1. ペットショップの商品詳細ページがクルクル状態（ローディング）のままで表示されない
2. 「カートに追加」ボタンが未ログイン時にログイン画面に遷移しない

**原因**: 
1. **ProductDetail.tsx**: useParamsでのパラメータ名の不一致
   - App.tsx: `/products/:id` (パラメータ名: `id`)
   - ProductDetail.tsx: `const { productId } = useParams()` (取得パラメータ名: `productId`)

2. **PetShop.tsx**: 認証チェックが不完全
   - `if (!user) return;` で早期リターンするだけで、ログイン画面への遷移なし

**修正内容**:
```typescript
// ProductDetail.tsx
// 修正前
const { productId } = useParams();

// 修正後  
const { id: productId } = useParams();

// PetShop.tsx
// 修正前
const addToCart = async (productId: string, quantity: number = 1) => {
  if (!user) return;
  // ...
};

// 修正後
const addToCart = async (productId: string, quantity: number = 1) => {
  if (!user) {
    navigate('/login');
    return;
  }
  // ...
};
```

**影響**: 
- ✅ 商品詳細ページが正常に表示される
- ✅ 未ログイン時の「カートに追加」ボタンでログイン画面に遷移
- ✅ ログイン時の「カートに追加」機能が正常動作
- ✅ ユーザー体験の大幅改善

**注意点**: 
- ルートパラメータ名とuseParams()での取得名は必ず一致させる
- 認証が必要な機能では適切なログイン誘導を実装する
- この修正により、ペットショップの基本機能が完全に動作するようになった

### 2024年1月 - 404ページ「よく利用されるページ」リンクの認証対応修正

**問題**: 404ページの「よく利用されるページ」のリンクが認証状態を考慮せず、誤ったパスに設定されている

**原因**: 固定リンクの設定と認証チェックの欠如
- 認証が必要なページへのリンクが常に同じパスを使用
- パス自体も間違っているものがある

**修正内容**:
```typescript
// ワンちゃん登録
- to="/register-dog"
+ to={isAuthenticated ? "/dog-registration" : "/login"}

// サブスクリプション  
- to="/subscription"
+ to={isAuthenticated ? "/subscription" : "/login"}

// ペットショップ
- to="/shop"
+ to="/petshop"

// コミュニティ
- to="/community"
+ to={isAuthenticated ? "/community" : "/login"}
```

**影響**: 
- ✅ 未ログイン時の適切なログイン誘導
- ✅ ログイン時の正しいページへの遷移
- ✅ ペットショップページへの正しいパス
- ✅ ユーザー体験の向上

**注意点**: 
- 404ページも認証状態を考慮したナビゲーションが重要
- パス設定の整合性を常に確認する必要がある

### 2024年1月 - ペットショップ商品詳細ページのリンク修正

**問題**: ペットショップの「詳細を見る」ボタンをクリックすると404エラーが発生

**原因**: リンクパスとルート設定の不一致
- **PetShop.tsx**: `/shop/product/${product.id}` (間違ったパス)
- **App.tsx**: `/products/:id` (正しいルート設定)

**修正内容**:
```typescript
// 修正前
<Link to={`/shop/product/${product.id}`}>

// 修正後  
<Link to={`/products/${product.id}`}>
```

**影響**: 
- ✅ ペットショップから商品詳細ページへの正常な遷移
- ✅ 404エラーの解消
- ✅ ユーザー体験の向上

**注意点**: 
- ページリンクとルート設定の整合性を常に確認する必要がある
- 類似の問題を避けるため、他のページでも同様のチェックが推奨される

### 2024年1月 - ドッグラン詳細ページ表示問題の修正

**問題**: ドッグラン一覧から「詳細を見る」ボタンをクリックしても詳細ページが表示されない

**原因**: ルートパラメータの名前不一致
- **App.tsx**: `/parks/:id` (パラメータ名: `id`)
- **DogParkDetail.tsx**: `const { parkId } = useParams()` (取得パラメータ名: `parkId`)

**修正内容**:
```typescript
// 修正前
const { parkId } = useParams();

// 修正後  
const { id: parkId } = useParams();
```

**影響**: 
- ✅ 未ログイン状態でもドッグラン詳細ページが正常表示
- ✅ ログイン状態でもドッグラン詳細ページが正常表示
- ✅ URLパラメータが正しく取得され、データベースクエリが実行される

**注意点**: 
- ルート定義のパラメータ名（`:id`）とuseParams()での取得名は一致させる必要がある
- この問題は開発時のデバッグログ追加により特定された
- 類似の問題を避けるため、他のページでも同様のチェックが推奨される

---

**⚠️ 重要**: このマニフェストは運用上の重要な指針です。ページ追加・削除・修正時は必ずこのマニフェストも更新してください。 