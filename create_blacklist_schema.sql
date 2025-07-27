-- 悪質ユーザー強制退会・アクセス制限システム用テーブル

-- ブラックリストユーザーテーブル
CREATE TABLE IF NOT EXISTS blacklisted_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  reason TEXT NOT NULL,
  banned_by UUID REFERENCES auth.users(id),
  ip_address TEXT,
  device_fingerprint TEXT,
  card_fingerprint TEXT,
  evidence JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- IPアドレスブラックリスト
CREATE TABLE IF NOT EXISTS blacklisted_ips (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_address TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  banned_by UUID REFERENCES auth.users(id),
  related_user_id UUID,
  evidence JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- デバイスフィンガープリントブラックリスト
CREATE TABLE IF NOT EXISTS blacklisted_devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  device_fingerprint TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  banned_by UUID REFERENCES auth.users(id),
  related_user_id UUID,
  evidence JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- メールアドレスブラックリスト
CREATE TABLE IF NOT EXISTS blacklisted_emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  banned_by UUID REFERENCES auth.users(id),
  related_user_id UUID,
  evidence JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- カードフィンガープリントブラックリスト
CREATE TABLE IF NOT EXISTS blacklisted_cards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  card_fingerprint TEXT NOT NULL UNIQUE,
  reason TEXT NOT NULL,
  banned_by UUID REFERENCES auth.users(id),
  related_user_id UUID,
  evidence JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 強制退会処理ログ
CREATE TABLE IF NOT EXISTS forced_bans_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  banned_user_id UUID NOT NULL,
  banned_email TEXT NOT NULL,
  banned_by UUID REFERENCES auth.users(id),
  reason TEXT NOT NULL,
  ban_type TEXT NOT NULL CHECK (ban_type IN ('fraud_abuse', 'subscription_abuse', 'policy_violation', 'other')),
  evidence JSONB DEFAULT '{}',
  actions_taken JSONB DEFAULT '{}', -- 削除されたデータの記録
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_blacklisted_users_user_id ON blacklisted_users(user_id);
CREATE INDEX IF NOT EXISTS idx_blacklisted_users_email ON blacklisted_users(email);
CREATE INDEX IF NOT EXISTS idx_blacklisted_ips_ip ON blacklisted_ips(ip_address);
CREATE INDEX IF NOT EXISTS idx_blacklisted_devices_fingerprint ON blacklisted_devices(device_fingerprint);
CREATE INDEX IF NOT EXISTS idx_blacklisted_emails_email ON blacklisted_emails(email);
CREATE INDEX IF NOT EXISTS idx_blacklisted_cards_fingerprint ON blacklisted_cards(card_fingerprint);
CREATE INDEX IF NOT EXISTS idx_forced_bans_log_banned_user ON forced_bans_log(banned_user_id);

-- RLS (Row Level Security) ポリシー設定
ALTER TABLE blacklisted_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE forced_bans_log ENABLE ROW LEVEL SECURITY;

-- 管理者のみアクセス可能
CREATE POLICY "Admin only access" ON blacklisted_users FOR ALL USING (auth.jwt() ->> 'user_type' = 'admin');
CREATE POLICY "Admin only access" ON blacklisted_ips FOR ALL USING (auth.jwt() ->> 'user_type' = 'admin');
CREATE POLICY "Admin only access" ON blacklisted_devices FOR ALL USING (auth.jwt() ->> 'user_type' = 'admin');
CREATE POLICY "Admin only access" ON blacklisted_emails FOR ALL USING (auth.jwt() ->> 'user_type' = 'admin');
CREATE POLICY "Admin only access" ON blacklisted_cards FOR ALL USING (auth.jwt() ->> 'user_type' = 'admin');
CREATE POLICY "Admin only access" ON forced_bans_log FOR ALL USING (auth.jwt() ->> 'user_type' = 'admin');

-- 強制退会処理関数
CREATE OR REPLACE FUNCTION force_ban_user(
  p_user_id UUID,
  p_admin_id UUID,
  p_reason TEXT,
  p_ban_type TEXT DEFAULT 'fraud_abuse'
)
RETURNS JSONB AS $$
DECLARE
  v_user_email TEXT;
  v_user_profile JSONB;
  v_device_fingerprints TEXT[];
  v_ip_addresses TEXT[];
  v_card_fingerprints TEXT[];
  v_actions_taken JSONB := '{}';
BEGIN
  -- ユーザー情報を取得
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id;
  
  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'ユーザーが見つかりません'
    );
  END IF;
  
  -- プロファイル情報を取得
  SELECT to_jsonb(profiles.*) INTO v_user_profile
  FROM profiles
  WHERE id = p_user_id;
  
  -- デバイスフィンガープリントを取得
  SELECT ARRAY(
    SELECT DISTINCT fingerprint
    FROM user_device_fingerprints
    WHERE user_id = p_user_id
  ) INTO v_device_fingerprints;
  
  -- IPアドレスを取得
  SELECT ARRAY(
    SELECT DISTINCT ip_address
    FROM user_device_fingerprints
    WHERE user_id = p_user_id AND ip_address IS NOT NULL
  ) INTO v_ip_addresses;
  
  -- カードフィンガープリントを取得
  SELECT ARRAY(
    SELECT DISTINCT card_fingerprint
    FROM stripe_card_fingerprints
    WHERE user_id = p_user_id
  ) INTO v_card_fingerprints;
  
  -- ブラックリストユーザーに追加
  INSERT INTO blacklisted_users (
    user_id,
    email,
    reason,
    banned_by,
    ip_address,
    device_fingerprint,
    card_fingerprint,
    evidence
  ) VALUES (
    p_user_id,
    v_user_email,
    p_reason,
    p_admin_id,
    COALESCE(v_ip_addresses[1], ''),
    COALESCE(v_device_fingerprints[1], ''),
    COALESCE(v_card_fingerprints[1], ''),
    jsonb_build_object(
      'profile', v_user_profile,
      'device_fingerprints', v_device_fingerprints,
      'ip_addresses', v_ip_addresses,
      'card_fingerprints', v_card_fingerprints
    )
  );
  
  -- IPアドレスをブラックリストに追加
  IF array_length(v_ip_addresses, 1) > 0 THEN
    INSERT INTO blacklisted_ips (ip_address, reason, banned_by, related_user_id)
    SELECT ip, p_reason, p_admin_id, p_user_id
    FROM unnest(v_ip_addresses) AS ip
    ON CONFLICT (ip_address) DO NOTHING;
    
    v_actions_taken := v_actions_taken || jsonb_build_object('ips_blacklisted', array_length(v_ip_addresses, 1));
  END IF;
  
  -- デバイスフィンガープリントをブラックリストに追加
  IF array_length(v_device_fingerprints, 1) > 0 THEN
    INSERT INTO blacklisted_devices (device_fingerprint, reason, banned_by, related_user_id)
    SELECT device, p_reason, p_admin_id, p_user_id
    FROM unnest(v_device_fingerprints) AS device
    ON CONFLICT (device_fingerprint) DO NOTHING;
    
    v_actions_taken := v_actions_taken || jsonb_build_object('devices_blacklisted', array_length(v_device_fingerprints, 1));
  END IF;
  
  -- カードフィンガープリントをブラックリストに追加
  IF array_length(v_card_fingerprints, 1) > 0 THEN
    INSERT INTO blacklisted_cards (card_fingerprint, reason, banned_by, related_user_id)
    SELECT card, p_reason, p_admin_id, p_user_id
    FROM unnest(v_card_fingerprints) AS card
    ON CONFLICT (card_fingerprint) DO NOTHING;
    
    v_actions_taken := v_actions_taken || jsonb_build_object('cards_blacklisted', array_length(v_card_fingerprints, 1));
  END IF;
  
  -- メールアドレスをブラックリストに追加
  INSERT INTO blacklisted_emails (email, reason, banned_by, related_user_id)
  VALUES (v_user_email, p_reason, p_admin_id, p_user_id)
  ON CONFLICT (email) DO NOTHING;
  
  -- サブスクリプションを無効化
  UPDATE subscriptions
  SET status = 'cancelled', updated_at = NOW()
  WHERE user_id = p_user_id AND status = 'active';
  
  -- プロファイルを無効化（完全削除はしない）
  UPDATE profiles
  SET 
    name = '[BANNED USER]',
    phone_number = NULL,
    address = NULL,
    postal_code = NULL,
    updated_at = NOW()
  WHERE id = p_user_id;
  
  -- 犬の情報を無効化
  UPDATE dogs
  SET 
    name = '[BANNED]',
    is_public = false,
    updated_at = NOW()
  WHERE owner_id = p_user_id;
  
  -- 予約をキャンセル
  UPDATE reservations
  SET status = 'cancelled', updated_at = NOW()
  WHERE user_id = p_user_id AND status IN ('pending', 'confirmed');
  
  v_actions_taken := v_actions_taken || jsonb_build_object(
    'email_blacklisted', true,
    'subscriptions_cancelled', true,
    'profile_anonymized', true,
    'dogs_anonymized', true,
    'reservations_cancelled', true
  );
  
  -- ログに記録
  INSERT INTO forced_bans_log (
    banned_user_id,
    banned_email,
    banned_by,
    reason,
    ban_type,
    evidence,
    actions_taken
  ) VALUES (
    p_user_id,
    v_user_email,
    p_admin_id,
    p_reason,
    p_ban_type,
    jsonb_build_object(
      'profile', v_user_profile,
      'device_fingerprints', v_device_fingerprints,
      'ip_addresses', v_ip_addresses,
      'card_fingerprints', v_card_fingerprints
    ),
    v_actions_taken
  );
  
  -- 最後にauth.usersからユーザーを削除
  -- （注意: これにより関連するデータはCASCADE削除される可能性があります）
  DELETE FROM auth.users WHERE id = p_user_id;
  
  v_actions_taken := v_actions_taken || jsonb_build_object('auth_user_deleted', true);
  
  RETURN jsonb_build_object(
    'success', true,
    'message', '悪質ユーザーを強制退会させました',
    'banned_email', v_user_email,
    'actions_taken', v_actions_taken
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'エラーが発生しました: ' || SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ブラックリスト確認関数（新規登録時の制限チェック用）
CREATE OR REPLACE FUNCTION check_blacklist_restrictions(
  p_email TEXT DEFAULT NULL,
  p_ip_address TEXT DEFAULT NULL,
  p_device_fingerprint TEXT DEFAULT NULL,
  p_card_fingerprint TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_restrictions JSONB := '{}';
  v_is_blocked BOOLEAN := false;
BEGIN
  -- メールアドレスチェック
  IF p_email IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM blacklisted_emails WHERE email = p_email) THEN
      v_restrictions := v_restrictions || jsonb_build_object('email_blocked', true);
      v_is_blocked := true;
    END IF;
  END IF;
  
  -- IPアドレスチェック
  IF p_ip_address IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM blacklisted_ips WHERE ip_address = p_ip_address) THEN
      v_restrictions := v_restrictions || jsonb_build_object('ip_blocked', true);
      v_is_blocked := true;
    END IF;
  END IF;
  
  -- デバイスフィンガープリントチェック
  IF p_device_fingerprint IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM blacklisted_devices WHERE device_fingerprint = p_device_fingerprint) THEN
      v_restrictions := v_restrictions || jsonb_build_object('device_blocked', true);
      v_is_blocked := true;
    END IF;
  END IF;
  
  -- カードフィンガープリントチェック
  IF p_card_fingerprint IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM blacklisted_cards WHERE card_fingerprint = p_card_fingerprint) THEN
      v_restrictions := v_restrictions || jsonb_build_object('card_blocked', true);
      v_is_blocked := true;
    END IF;
  END IF;
  
  RETURN jsonb_build_object(
    'is_blocked', v_is_blocked,
    'restrictions', v_restrictions
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 