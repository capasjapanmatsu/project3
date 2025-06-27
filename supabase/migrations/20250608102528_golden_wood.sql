/*
  # ペットショップ商品の追加

  1. 新しい商品
    - ドッグフード: オーガニック、小型犬専用、シニア犬用
    - おやつ: フリーズドライレバー、野菜チップス、ボーンガム
    - おもちゃ: ロープトイ、ぬいぐるみ、フリスビー、知育パズル
    - アクセサリー: レザーカラー、LEDカラー、レインコート、キャリーバッグ
    - ヘルスケア: マルチビタミン、シャンプー、耳掃除用品、歯磨きセット
    - ペットシーツ: 厚手、消臭、大型犬用、エコタイプ

  2. 商品情報
    - 各商品に詳細な説明、価格、在庫数を設定
    - 適切なカテゴリ、対象年齢、対象犬種サイズを指定
    - 一部商品には原材料情報も含める
*/

-- 追加のサンプル商品を挿入
INSERT INTO products (name, description, price, category, image_url, stock_quantity, weight, brand, age_group, dog_size, ingredients) VALUES
-- ドッグフード
('オーガニックドッグフード（サーモン）', '新鮮なサーモンとオーガニック野菜を使用した高級ドッグフードです。オメガ3脂肪酸が豊富で、毛艶と皮膚の健康をサポートします。', 4580, 'food', 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg', 40, 2000, 'OrganicPet', 'adult', 'all', 'サーモン、サツマイモ、エンドウ豆、亜麻仁'),
('小型犬専用フード', '小型犬の小さな口に合わせた小粒タイプのドッグフードです。消化しやすく栄養価の高い原材料を厳選しています。', 3280, 'food', 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg', 60, 1500, 'SmallDog', 'adult', 'small', 'チキン、玄米、野菜ミックス'),
('シニア犬用フード', 'シニア犬の健康維持に特化したドッグフードです。関節サポート成分と消化しやすいタンパク質を配合しています。', 4280, 'food', 'https://images.pexels.com/photos/1108099/pexels-photo-1108099.jpeg', 35, 2000, 'SeniorCare', 'senior', 'all', 'ラム肉、グルコサミン、コンドロイチン'),

-- おやつ
('フリーズドライレバー', '栄養価の高いレバーをフリーズドライ加工した無添加おやつです。トレーニングのご褒美に最適です。', 1580, 'treats', 'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg', 80, 80, 'PureTreats', 'all', 'all', '牛レバー100%'),
('野菜チップス', '愛犬の健康を考えた野菜100%のチップスです。低カロリーでビタミン豊富なヘルシーおやつです。', 980, 'treats', 'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg', 120, 60, 'VeggieTreats', 'all', 'all', 'サツマイモ、ニンジン、カボチャ'),
('ボーンガム', '長時間噛んで楽しめるボーン型のガムです。歯の健康維持とストレス解消に効果的です。', 1380, 'treats', 'https://images.pexels.com/photos/1254140/pexels-photo-1254140.jpeg', 90, 120, 'ChewTime', 'adult', 'medium', '牛皮、コラーゲン'),

-- おもちゃ
('ロープトイ', '天然コットン100%のロープトイです。引っ張り遊びや一人遊びに最適で、歯の健康にも良い影響を与えます。', 880, 'toys', 'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg', 70, 150, 'PlayTime', 'all', 'all', NULL),
('音が鳴るぬいぐるみ', 'かわいい動物の形をした音が鳴るぬいぐるみです。愛犬の好奇心を刺激し、一人遊びの時間を楽しくします。', 1480, 'toys', 'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg', 50, 100, 'CuteToys', 'all', 'small', NULL),
('フリスビー', '軽量で安全な素材で作られたフリスビーです。屋外での運動やトレーニングに最適です。', 1280, 'toys', 'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg', 40, 80, 'ActivePlay', 'adult', 'large', NULL),
('知育パズル', '愛犬の知能を刺激するパズル型おもちゃです。おやつを隠して遊ぶことで、集中力と問題解決能力を向上させます。', 2980, 'toys', 'https://images.pexels.com/photos/1851164/pexels-photo-1851164.jpeg', 25, 300, 'BrainGames', 'adult', 'all', NULL),

-- アクセサリー
('レザーカラー', '高品質な本革を使用したおしゃれなカラーです。耐久性があり、使い込むほどに味が出ます。', 3480, 'accessories', 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg', 30, 80, 'LeatherCraft', 'all', 'medium', NULL),
('LED光るカラー', '夜間の散歩に安全なLED付きカラーです。USB充電式で経済的、視認性抜群で安心です。', 2480, 'accessories', 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg', 45, 120, 'SafeWalk', 'all', 'all', NULL),
('レインコート', '雨の日の散歩に必須のレインコートです。防水性能が高く、着脱も簡単です。', 2980, 'accessories', 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg', 35, 200, 'RainyDay', 'all', 'medium', NULL),
('キャリーバッグ', '通院や旅行に便利なキャリーバッグです。通気性が良く、愛犬が快適に過ごせる設計です。', 5980, 'accessories', 'https://images.pexels.com/photos/1805164/pexels-photo-1805164.jpeg', 20, 800, 'TravelPet', 'all', 'small', NULL),

-- ヘルスケア
('マルチビタミン', '愛犬の健康維持に必要なビタミンとミネラルをバランス良く配合したサプリメントです。', 3280, 'health', 'https://images.pexels.com/photos/3683107/pexels-photo-3683107.jpeg', 55, 90, 'VitaPet', 'all', 'all', NULL),
('皮膚ケアシャンプー', '敏感肌の愛犬にも安心して使える低刺激シャンプーです。天然成分配合で毛艶も良くなります。', 1980, 'health', 'https://images.pexels.com/photos/3683107/pexels-photo-3683107.jpeg', 65, 300, 'GentleCare', 'all', 'all', NULL),
('耳掃除用品セット', '愛犬の耳の健康を保つための掃除用品セットです。獣医師推奨の安全な成分を使用しています。', 1480, 'health', 'https://images.pexels.com/photos/3683107/pexels-photo-3683107.jpeg', 75, 150, 'EarCare', 'all', 'all', NULL),
('歯磨きセット', '愛犬の歯の健康を守る歯磨きセットです。歯ブラシと歯磨きペーストがセットになっています。', 1680, 'health', 'https://images.pexels.com/photos/3683107/pexels-photo-3683107.jpeg', 85, 100, 'DentalSet', 'all', 'all', NULL),

-- ペットシーツ
('厚手ペットシーツ', '5層構造の厚手ペットシーツです。優れた吸収力と防水性で床を完全に保護します。', 2280, 'sheets', 'https://images.pexels.com/photos/4498362/pexels-photo-4498362.jpeg', 100, 800, 'ThickPad', 'all', 'all', NULL),
('消臭ペットシーツ', '特殊な消臭成分配合で嫌な臭いを強力にカットします。長時間の外出時も安心です。', 1980, 'sheets', 'https://images.pexels.com/photos/4498362/pexels-photo-4498362.jpeg', 120, 600, 'OdorBlock', 'all', 'all', NULL),
('大型犬用ペットシーツ', '大型犬にも対応できる大きなサイズのペットシーツです。吸収量も多く、安心してお使いいただけます。', 2680, 'sheets', 'https://images.pexels.com/photos/4498362/pexels-photo-4498362.jpeg', 60, 1000, 'BigSize', 'all', 'large', NULL),
('エコペットシーツ', '環境に優しい素材で作られたエコタイプのペットシーツです。生分解性で地球にやさしい選択です。', 2180, 'sheets', 'https://images.pexels.com/photos/4498362/pexels-photo-4498362.jpeg', 80, 500, 'EcoFriendly', 'all', 'all', NULL)

ON CONFLICT (id) DO NOTHING;