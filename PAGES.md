# ドッグパークJP - ページマニフェスト

このドキュメントは、ドッグパークJPプロジェクトの全ページとそのファイル構造、ルーティング情報を記載したマニフェストです。

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

---

## 🐕 ドッグパーク関連

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| ドッグラン一覧画面 | `src/pages/DogParkList.tsx` | `/parks` | 地図表示＋リスト、検索フィルター |
| ドッグラン詳細画面 | `src/pages/DogParkDetail.tsx` | `/parks/:id` | QRコード発行＋入退場ロジック、予約機能 |
| ドッグランのルール | `src/pages/DogParkRules.tsx` | `/rules` | 利用規約・ルール説明 |
| パーク予約画面 | `src/pages/ParkReservation.tsx` | `/reservation/:parkId` | 🔐 ドッグラン予約フォーム |
| パーク利用履歴 | `src/pages/DogParkHistory.tsx` | `/park-history` | 🔐 過去の利用記録 |

---

## 🛒 ショッピング関連

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| ペットショップ | `src/pages/PetShop.tsx` | `/petshop` | 商品一覧・カテゴリ表示 |
| 商品詳細 | `src/pages/ProductDetail.tsx` | `/products/:id` | 商品詳細情報・購入ボタン |
| ショッピングカート | `src/pages/Cart.tsx` | `/cart` | カート内商品確認・数量変更 |
| チェックアウト | `src/pages/Checkout.tsx` | `/checkout` | 決済・配送先入力 |
| 注文履歴 | `src/pages/OrderHistory.tsx` | `/order-history` | 🔐 過去の購入履歴 |

---

## 📰 ニュース・情報

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| ニュース一覧 | `src/pages/News.tsx` | `/news` | お知らせ・ニュース記事リスト |
| ニュース詳細 | `src/pages/NewsDetail.tsx` | `/news/:id` | 個別記事の詳細表示 |
| ワンちゃん情報トップ | `src/pages/DogInfo.tsx` | `/dog-info` | 犬に関する情報コーナー入口 |
| 犬種情報 | `src/pages/dog-info/Breeds.tsx` | `/dog-info/breeds` | 犬種別の詳細情報 |
| ケア・お手入れ | `src/pages/dog-info/Care.tsx` | `/dog-info/care` | 日常ケア方法 |
| 食事・栄養 | `src/pages/dog-info/Food.tsx` | `/dog-info/food` | フード・栄養ガイド |
| 散歩・運動 | `src/pages/dog-info/Walk.tsx` | `/dog-info/walk` | 散歩・運動のコツ |
| トレーニング | `src/pages/dog-info/Training.tsx` | `/dog-info/training` | しつけ・訓練方法 |
| 健康管理 | `src/pages/dog-info/HealthManagement.tsx` | `/dog-info/health` | 健康チェック・予防 |

### 個別情報ページ（レガシー）
| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| 犬種別病気情報 | `src/pages/DogInfoBreeds.tsx` | - | レガシー（統合予定） |
| 食べ物注意 | `src/pages/DogInfoFoods.tsx` | - | レガシー（統合予定） |
| ワクチン情報 | `src/pages/DogInfoVaccine.tsx` | - | レガシー（統合予定） |
| 寄生虫対策 | `src/pages/DogInfoParasite.tsx` | - | レガシー（統合予定） |
| おやつ・おもちゃ | `src/pages/DogInfoSnack.tsx` | - | レガシー（統合予定） |
| ドッグショー | `src/pages/DogInfoShow.tsx` | - | レガシー（統合予定） |

---

## 💬 コミュニティ・サポート

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| コミュニティ | `src/pages/Community.tsx` | `/community` | ユーザー間交流・フォーラム |
| お問い合わせ | `src/pages/Contact.tsx` | `/contact` | サポート・問い合わせフォーム |
| 利用規約 | `src/pages/TermsOfService.tsx` | `/terms` | サービス利用規約 |
| プライバシーポリシー | `src/pages/PrivacyPolicy.tsx` | `/privacy` | 個人情報保護方針 |

---

## 🔐 認証・ユーザー管理

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| マジックリンク | `src/pages/MagicLink.tsx` | - | メール認証リンク処理 |
| 二段階認証設定 | `src/pages/TwoFactorSetup.tsx` | - | 🔐 2FA初期設定 |
| 二段階認証確認 | `src/pages/TwoFactorVerify.tsx` | - | 🔐 2FA認証コード入力 |

---

## 👤 ユーザーダッシュボード

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| ユーザーダッシュボード | `src/pages/UserDashboard.tsx` | `/dashboard` | 🔐 メインダッシュボード |
| プロフィール設定 | `src/pages/ProfileSettings.tsx` | `/profile-settings` | 🔐 個人情報編集 |
| ワンちゃん登録 | `src/pages/DogRegistration.tsx` | `/dog-registration` | 🔐 新しい犬の登録 |
| ワンちゃん管理 | `src/pages/DogManagement.tsx` | `/dog-management` | 🔐 登録済み犬の管理 |
| ワンちゃんプロフィール | `src/pages/DogProfile.tsx` | `/dog-profile/:id` | 🔐 個別犬の詳細情報 |
| いいねした犬 | `src/pages/LikedDogs.tsx` | `/liked-dogs` | 🔐 お気に入り犬リスト |

---

## 🏢 オーナー・運営関連

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| オーナーダッシュボード | `src/pages/OwnerDashboard.tsx` | - | 🔐 施設オーナー専用画面 |
| パーク管理 | `src/pages/ParkManagement.tsx` | - | 🔐 ドッグラン管理機能 |
| 契約同意 | `src/pages/ParkRegistrationAgreement.tsx` | `/park-registration-agreement` | 🔐 オーナー契約同意書 |
| パーク登録（一次） | `src/pages/ParkRegistration.tsx` | `/park-registration` | 🔐 ドッグラン申請（一次審査・本人確認） |
| パーク登録（二次） | `src/pages/ParkRegistrationSecondStage.tsx` | - | 🔐 詳細情報・施設画像登録 |
| パーク登録（一次）複製 | `src/pages/ParkRegistration.tsx` | `/register-park` | 🔐 同一コンポーネント（複数ルート） |
| パーク公開設定 | `src/pages/ParkPublishingSetup.tsx` | - | 🔐 公開・運営設定 |
| 施設登録 | `src/pages/FacilityRegistration.tsx` | - | 🔐 ペット関連施設登録 |
| 事業者情報 | `src/pages/BusinessInformation.tsx` | - | 🔐 法人・事業者情報入力 |

### 💳 決済・サブスクリプション
| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| サブスクリプション | `src/pages/Subscription.tsx` | - | 🔐 月額プラン管理 |
| 決済設定 | `src/pages/PaymentSetup.tsx` | - | 🔐 初回決済情報設定 |
| 決済方法設定 | `src/pages/PaymentMethodSettings.tsx` | - | 🔐 クレカ・決済方法変更 |
| 決済確認 | `src/pages/PaymentConfirmation.tsx` | - | 🔐 決済完了画面 |
| オーナー収益システム | `src/pages/OwnerPaymentSystem.tsx` | - | 🔐 売上・振込管理 |

---

## ⚙️ 管理者機能

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| 管理者ダッシュボード | `src/pages/AdminDashboard.tsx` | `/admin` | 👑 統計・概要・メンテナンス |
| ユーザー管理 | `src/pages/AdminUserManagement.tsx` | `/admin/users` | 👑 ユーザー一覧・詳細管理 |
| ユーザー詳細 | `src/pages/AdminUserDetail.tsx` | - | 👑 個別ユーザー詳細情報 |
| ドッグラン管理 | `src/pages/AdminParkManagement.tsx` | `/admin/parks` | 👑 ドッグラン審査・管理 |
| 予約管理 | `src/pages/AdminReservationManagement.tsx` | `/admin/reservations` | 👑 予約状況・キャンセル管理 |
| 売上管理 | `src/pages/AdminSalesManagement.tsx` | `/admin/sales` | 👑 売上データ・取引管理 |
| 売上レポート | `src/pages/AdminRevenueReport.tsx` | `/admin/revenue` | 👑 収益分析・レポート |
| ワクチン証明書承認 | `src/pages/AdminVaccineApproval.tsx` | `/admin/vaccine-approval` | 👑 ワクチン証明書審査 |
| ペット施設承認 | `src/pages/AdminFacilityApproval.tsx` | `/admin/facility-approval` | 👑 施設掲載申請承認 |
| ショップ管理 | `src/pages/AdminShopManagement.tsx` | `/admin/shop` | 👑 商品・在庫・注文管理 |
| ニュース管理 | `src/pages/AdminNewsManagement.tsx` | `/admin/news` | 👑 お知らせ・記事管理 |
| 管理ツール | `src/pages/AdminManagement.tsx` | - | 👑 その他管理機能 |
| 管理タスク | `src/pages/AdminTasks.tsx` | - | 👑 定期タスク・メンテナンス |
| アクセス制御 | `src/pages/AccessControl.tsx` | - | 👑 権限・アクセス管理 |

---

## 🔧 開発・システム関連

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| デプロイ | `src/pages/Deploy.tsx` | - | 🛠️ デプロイ操作画面 |
| デプロイ履歴 | `src/pages/DeploymentHistory.tsx` | - | 🛠️ デプロイ履歴確認 |
| Netlify設定ガイド | `src/pages/NetlifySetupGuide.tsx` | - | 🛠️ Netlify設定手順 |

### PWA関連（開発・テスト用）
| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| PWAドキュメント | `src/pages/PWADocumentation.tsx` | - | 📋 PWA実装ドキュメント |
| PWA実装ガイド | `src/pages/PWAImplementationGuide.tsx` | - | 📋 実装手順書 |
| PWAセットアップガイド | `src/pages/PWASetupGuide.tsx` | - | 📋 初期設定手順 |
| PWAデプロイガイド | `src/pages/PWADeploymentGuide.tsx` | - | 📋 デプロイ手順 |
| PWAテストスイート | `src/pages/PWATestingSuite.tsx` | - | 🧪 PWA機能テスト |
| PWA Lighthouse監査 | `src/pages/PWALighthouseAudit.tsx` | - | 📊 パフォーマンス分析 |

### その他開発用
| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| 新パーク詳細（開発中） | `src/pages/NewParkDetail.tsx` | - | 🚧 新しいパーク詳細画面 |

---

## ❓ エラー・404ページ

| ページ名（画面） | ファイルパス | ルーティング | 説明・備考 |
|---|---|---|---|
| 404エラー | `src/pages/NotFound.tsx` | `*` | ページが見つからない場合 |

---

## 🔑 アクセス権限について

- **🔐 保護されたページ**: ログイン必須（ProtectedRoute）
- **👑 管理者専用**: 管理者権限必須（AdminRoute）
- **🛠️ 開発用**: 開発・管理者のみ
- **📋 ドキュメント**: 内部ドキュメント・ガイド
- **🧪 テスト用**: 機能テスト・検証用
- **📊 分析用**: データ分析・レポート用
- **🚧 開発中**: 実装中・テスト中機能

---

## 📝 備考

- このマニフェストは現在のApp.tsxルーティング設定に基づいています
- `-` のルーティングは現在App.tsxに定義されていないページです
- レガシーページは将来的に統合・削除予定
- PWA関連ページは開発・テスト用途です
- エラー修復時はこのマニフェストを参照してページ構造を確認してください

---

**最終更新**: プロジェクト直下作成時点  
**管理**: ドッグパークJP開発チーム 