-- 新着情報テストデータの挿入
INSERT INTO news_announcements (
  title, 
  content, 
  category, 
  is_important, 
  image_url, 
  link_url
) VALUES 
(
  '新しいドッグランが西新宿にオープン！',
  '西新宿エリアに最新設備を備えたドッグランがオープンしました。広々とした芝生エリアと小型犬専用エリアを完備。オープン記念として初回利用料金50%OFFキャンペーンを実施中です。',
  'news',
  false,
  null,
  'https://example.com/west-shinjuku-park'
),
(
  '【重要】メンテナンスのお知らせ',
  '2024年1月15日（月）深夜2:00〜6:00の間、システムメンテナンスを実施いたします。この時間中はアプリのご利用ができません。ご不便をおかけして申し訳ございませんが、ご理解とご協力をお願いいたします。',
  'announcement',
  true,
  null,
  null
),
(
  '年末年始セール開催中！ペットグッズが最大30%OFF',
  'ペットショップにて年末年始の大セールを開催しています。人気のペットフードやおもちゃ、ウェアなどが最大30%OFF！さらにサブスクリプション会員様は追加で10%OFF。この機会をお見逃しなく！',
  'sale',
  false,
  'https://example.com/sale-banner.jpg',
  'https://example.com/pet-shop-sale'
); 