export const dogBreeds = [
  // 日本犬
  "柴犬",
  "秋田犬",
  "甲斐犬",
  "紀州犬",
  "四国犬",
  "北海道犬",
  
  // 小型犬
  "トイプードル",
  "チワワ",
  "ポメラニアン",
  "ミニチュアダックスフンド",
  "ヨークシャーテリア",
  "マルチーズ",
  "パグ",
  "シーズー",
  "ペキニーズ",
  "パピヨン",
  "ジャックラッセルテリア",
  "ミニチュアピンシャー",
  "イタリアングレーハウンド",
  "キャバリア・キング・チャールズ・スパニエル",
  "ボストンテリア",
  "フレンチブルドッグ",
  "ミニチュアシュナウザー",
  "ウエストハイランドホワイトテリア",
  "ケアーンテリア",
  "ノーフォークテリア",
  "ノーリッチテリア",
  "スコティッシュテリア",
  "ワイヤーフォックステリア",
  "スムースフォックステリア",
  
  // 中型犬
  "コーギー",
  "ビーグル",
  "アメリカンコッカースパニエル",
  "イングリッシュコッカースパニエル",
  "ブリタニースパニエル",
  "ボーダーコリー",
  "オーストラリアンシェパード",
  "シェットランドシープドッグ",
  "ウィペット",
  "バセットハウンド",
  "ブルテリア",
  "スタッフォードシャーブルテリア",
  "アメリカンピットブルテリア",
  "エアデールテリア",
  "ケリーブルーテリア",
  "ソフトコーテッドウィートンテリア",
  "ポルトガルウォータードッグ",
  "スタンダードプードル",
  "ミディアムプードル",
  
  // 大型犬
  "ゴールデンレトリバー",
  "ラブラドールレトリバー",
  "シベリアンハスキー",
  "アラスカンマラミュート",
  "サモエド", // ← ここにサモエドが含まれています！
  "バーニーズマウンテンドッグ",
  "グレートピレニーズ",
  "セントバーナード",
  "ニューファンドランド",
  "マスティフ",
  "ブルマスティフ",
  "ロットワイラー",
  "ドーベルマン",
  "ジャーマンシェパード",
  "ベルジアンシェパード",
  "ダルメシアン",
  "ワイマラナー",
  "ジャーマンショートヘアードポインター",
  "ジャーマンワイヤーヘアードポインター",
  "イングリッシュセッター",
  "アイリッシュセッター",
  "ゴードンセッター",
  "ポインター",
  "ヴィズラ",
  "ブラッコイタリアーノ",
  "スピノーネイタリアーノ",
  "ローデシアンリッジバック",
  "ファラオハウンド",
  "アフガンハウンド",
  "サルーキ",
  "ボルゾイ",
  "アイリッシュウルフハウンド",
  "スコティッシュディアハウンド",
  "グレートデーン",
  "アイリッシュセッター",
  "フラットコーテッドレトリバー",
  "チェサピークベイレトリバー",
  "ノヴァスコシアダックトーリングレトリバー",
  
  // 希少犬種・その他
  "バセンジー",
  "チャウチャウ",
  "シャーペイ",
  "ラサアプソ",
  "チベタンテリア",
  "チベタンスパニエル",
  "プーリー",
  "コモンドール",
  "ハンガリアンビズラ",
  "ワイヤーヘアードビズラ",
  "ブリアード",
  "ボースロン",
  "ピレニアンシープドッグ",
  "オールドイングリッシュシープドッグ",
  "ビアデッドコリー",
  "ラフコリー",
  "スムースコリー",
  "カーディガンウェルシュコーギー",
  "ペンブロークウェルシュコーギー",
  "フィニッシュスピッツ",
  "ジャーマンスピッツ",
  "キースホンド",
  "エスキモードッグ",
  "グリーンランドドッグ",
  "アメリカンエスキモードッグ",
  "ミックス犬（雑種）",
  "その他"
] as const;

export type DogBreed = typeof dogBreeds[number];