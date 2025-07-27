# ドッグパークJP - 歴史的ページマニフェスト（2025年1月24日最新版）

このドキュメントは、ドッグパークJPプロジェクトの最新のページ構造とルーティング情報を記載したマニフェストです。

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
| ドッグラン詳細画面 | `src/pages/DogParkDetail.tsx` | `/parks/:id` | QRコード発行＋入退場ロジック、予約機能 |
| ドッグランのルール | `src/pages/DogParkRules.tsx` | `/parks/rules` | 利用規約・ルール説明 |
| パーク予約画面 | `src/pages/ParkReservation.tsx` | `/parks/:id/reserve` | 🔐 ドッグラン予約フォーム（日付自動入力なし、サブスク時日付不要） |
| パーク管理 | `src/pages/ParkManagement.tsx` | `/parks/:id/manage` | 🔐 ドッグラン管理機能 |
| パーク利用履歴 | `src/pages/DogParkHistory.tsx` | `/dogpark-history` | 🔐 過去の利用記録 |
| パーク登録（二次） | `src/pages/ParkRegistrationSecondStage.tsx` | `/parks/:id/second-stage` | 🔐 詳細情報・施設画像登録 |
| 新パーク詳細（開発中） | `src/pages/NewParkDetail.tsx` | `/news/park/:id` | 🚧 新しいパーク詳細画面 |

---

## 🛒 ショッピング関連

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| ペットショップ | `src/pages/PetShop.tsx` | `/petshop` | 商品一覧・カテゴリ表示 |
| 商品詳細 | `src/pages/ProductDetail.tsx` | `/products/:id` | 商品詳細情報・購入ボタン |
| ショッピングカート | `src/pages/Cart.tsx` | `/cart` | 🔐 カート内商品確認・数量変更 |
| チェックアウト | `src/pages/Checkout.tsx` | `/checkout` | 🔐 決済・配送先入力 |
| 注文履歴 | `src/pages/OrderHistory.tsx` | `/order-history` | 🔐 過去の購入履歴 |

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
| アクセス制御 | `src/pages/AccessControl.tsx` | `/access-control` | 🔐 ドッグランアクセス、ページネーション対応（10件表示） |

---

## 👤 ユーザーダッシュボード

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| ユーザーダッシュボード | `src/pages/UserDashboard.tsx` | `/dashboard` | 🔐 メインダッシュボード（軽量化済み、管理ボタンを専用ページに移行） |
| 管理中ドッグラン一覧 | `src/pages/MyParksManagement.tsx` | `/my-parks-management` | 🔐 ドッグラン管理専用ページ（実DB連携、統計表示、削除機能付き） |
| 管理中施設一覧 | `src/pages/MyFacilitiesManagement.tsx` | `/my-facilities-management` | 🔐 ペット関連施設管理専用ページ |
| プロフィール設定 | `src/pages/ProfileSettings.tsx` | `/profile-settings` | 🔐 ユーザー情報変更（サブスク管理機能追加、404リンク修正済み） |
| ワンちゃん登録 | `src/pages/DogRegistration.tsx` | `/dog-registration` | 🔐 新しい犬の登録 |
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
| 施設編集 | `src/pages/FacilityEdit.tsx` | `/facilities/:id/edit` | 🔐 **NEW** ペット施設詳細編集ページ（削除機能付き） |
| オーナー収益システム | `src/pages/OwnerPaymentSystem.tsx` | `/owner-payment-system` | 🔐 売上・振込管理 |

### 💳 決済・サブスクリプション
| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| サブスクリプション紹介 | `src/pages/SubscriptionIntro.tsx` | `/subscription-intro` | **NEW** サブスク加入紹介（初月無料ルール、不正検知機能） |
| ~~旧サブスクリプション~~ | ~~`src/pages/Subscription.tsx`~~ | ~~`/subscription`~~ | **DELETED** 混乱防止のため削除済み |
| 決済設定 | `src/pages/PaymentSetup.tsx` | `/payment-setup` | 🔐 初回決済情報設定 |
| 決済方法設定 | `src/pages/PaymentMethodSettings.tsx` | `/payment-method-settings` | 🔐 クレカ・決済方法変更 |
| 決済確認 | `src/pages/PaymentConfirmation.tsx` | `/payment-confirmation` | 🔐 決済完了画面 |

---

## ⚙️ 管理者機能

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| 管理者ダッシュボード | `src/pages/AdminDashboard.tsx` | `/admin` | 👑 統計・概要（緊急対応セクション、不正検知統計追加） |
| ユーザー管理 | `src/pages/AdminUserManagement.tsx` | `/admin/users` | 👑 ユーザー一覧（不正検知表示、強制退会機能、リスク評価） |
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
| 404エラー | `src/pages/NotFound.tsx` | - | ページが見つからない場合（認証状態対応リンク修正済み） |

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

## 🆕 **2025年1月24日の主要追加・修正**

### **💳 決済・サブスクリプション関連**
- **🆕 NEW**: `SubscriptionIntro.tsx` - サブスクリプション紹介ページ
  - 機能: サブスクの特典紹介、初月無料キャンペーン（月末まで）、不正利用防止対策
  - 不正防止: デバイスフィンガープリンティング、カードフィンガープリンティング、IP制限
  - 再登録者検知: 2回目以降は即課金ルール
  - ルート: `/subscription-intro`
- **🗑️ DELETED**: `Subscription.tsx` - 古いサブスクリプションページ（混乱防止のため）
- **🔄 UPDATED**: 全てのサブスクリプション関連リンクを`/subscription`から`/subscription-intro`に統一

### **🏢 ドッグラン・施設管理関連**
- **🆕 NEW**: `MyParksManagement.tsx` - 管理中ドッグラン専用管理ページ
  - 機能: 実際のDBからowner_idベースでドッグラン一覧取得
  - 統計: リアルタイム利用者数、月間収益、総予約数表示
  - 管理: 各ドッグランの詳細管理・編集リンク、削除機能（却下済み物件のみ）
  - ルート: `/my-parks-management`
- **🆕 NEW**: `MyFacilitiesManagement.tsx` - ペット関連施設専用管理ページ
  - 機能: 管理中ペット施設の一覧・編集
  - ルート: `/my-facilities-management`
- **🆕 NEW**: `FacilityEdit.tsx` - 施設編集専用ページ
  - 機能: ペット施設の詳細編集、削除機能（慎重な確認プロセス付き）
  - ルート: `/facilities/:id/edit`

### **👤 プロフィール・アカウント管理**
- **🔄 UPDATED**: `ProfileSettings.tsx`にサブスクリプション管理機能
  - 機能: サブスクの一時停止・再開・退会
  - UI: アカウント削除の上部に配置、紫色カードデザイン
  - 修正: 404エラーリンクを正しいパスに修正（決済方法、利用履歴、注文履歴）
  - API連携: Stripe Edge Functions (`stripe-pause-subscription`, `stripe-resume-subscription`, `stripe-cancel-subscription`)

### **⚙️ 管理者機能の大幅強化**
- **🔄 UPDATED**: `AdminDashboard.tsx` - 緊急対応セクション追加
  - 機能: 高リスクユーザー表示、不正検知統計専用タブ
  - UI: 緊急対応が必要な項目を最優先表示
- **🔄 UPDATED**: `AdminUserManagement.tsx` - 不正検知・強制退会機能追加
  - 機能: ユーザーリスクレベル表示（高・中・低）、フィルタリング・ソート
  - 詳細: 不正検知詳細モーダル（デバイス情報、カード使用履歴、重複ユーザー情報）
  - 強制退会: 高リスクユーザー対象、慎重な確認プロセス、包括的なデータ処理

### **🛡️ セキュリティ・不正防止機能**
- **🆕 NEW**: `src/utils/dateUtils.ts` - 日付計算ユーティリティ
  - 機能: 月末までの日数計算、サブスクトライアル期間管理
- **🆕 NEW**: `src/utils/deviceFingerprint.ts` - デバイスフィンガープリント
  - 機能: FingerprintJSによる端末識別、重複デバイス検知
- **🆕 NEW**: `src/utils/cardFraudPrevention.ts` - カード不正検知
  - 機能: Stripeカードフィンガープリント、トライアル悪用検知
- **🆕 NEW**: `src/utils/adminBanActions.ts` - 管理者用強制退会機能
  - 機能: 包括的な強制退会処理、ブラックリスト管理、データ匿名化
- **🆕 NEW**: `src/utils/adminFraudDetection.ts` - 管理者用不正検知
  - 機能: 高リスクユーザー検知、不正統計取得、詳細分析

### **🛢️ データベース・スキーマ**
- **🆕 NEW**: `create_blacklist_schema.sql` - ブラックリスト管理用テーブル
  - テーブル: `blacklisted_users`, `blacklisted_ips`, `blacklisted_devices`, `blacklisted_emails`, `blacklisted_cards`, `forced_bans_log`
  - 機能: 多層防御による再登録防止システム

### **🔧 技術的改善・修正**
- **🔄 UPDATED**: `src/App.tsx` - 新ルート追加、MaintenanceProvider統合
- **🔄 UPDATED**: `src/pages/AccessControl.tsx` - ページネーション実装（10件表示）
- **🔄 UPDATED**: `src/pages/ParkReservation.tsx` - パラメータ取得修正、サブスク時日付バリデーション調整
- **🔄 UPDATED**: `src/pages/UserDashboard.tsx` - パフォーマンス最適化、専用管理ページへのリンク追加
- **🔄 UPDATED**: `src/hooks/useStripe.ts` - トライアル期間対応
- **🔄 UPDATED**: `supabase/functions/stripe-checkout/index.ts` - トライアル期間処理追加

### **🧪 テスト・メンテナンス**
- **🆕 NEW**: `src/components/admin/AdminMaintenanceTest.tsx` - テスト用メンテナンス管理
  - 機能: メンテナンス機能のシンプルなテスト版

---

## 🔍 **現在の特徴（2025年1月24日版）**

### **1. セキュリティ・不正防止システムの完全実装**
- デバイスフィンガープリンティングによる端末識別
- カードフィンガープリンティングによるトライアル悪用防止
- 包括的なブラックリストシステム（メール・IP・デバイス・カード）
- 管理者向け不正検知ダッシュボード・強制退会機能

### **2. サブスクリプション機能の洗練**
- 初月無料キャンペーン（月末まで、再登録者除外）
- プロフィール設定からの一時停止・再開・退会機能
- 不正利用防止対策の統合
- ユーザーフレンドリーな紹介ページ

### **3. 管理機能の分離・最適化**
- ダッシュボードの軽量化（パフォーマンス改善）
- 専用管理ページによる詳細機能の分離
- 実データベースとの連携強化
- 管理者向け不正検知・対応機能

### **4. ユーザー体験の向上**
- 404エラーリンクの修正
- 認証状態に応じたナビゲーション
- ページネーション対応（アクセス制御ページ）
- より直感的な予約・決済フロー

---

## 📝 **重要な運用指針**

**⚠️ 最重要**: このマニフェストは毎回確認し、ページを追加・修正・削除した場合は必ずここにも反映する。エラーなどで一旦削除して復元の際はこのマニフェストを確認して修復する。このルールは絶対に忘れてはいけない重要な運用指針である。

**🔧 修正時の注意点**:
- ルートパラメータ名とuseParams()での取得名は必ず一致させる
- 認証が必要な機能では適切なログイン誘導を実装する
- リンク設定時は必ずルート定義との整合性を確認する
- 新機能実装時は既存機能への影響を十分に検証する

---

**作成日時**: 2025年1月24日最新版  
**管理**: ドッグパークJP開発チーム  
**最終更新**: MaintenanceProvider統合、不正検知システム完全実装、サブスクリプション機能洗練 