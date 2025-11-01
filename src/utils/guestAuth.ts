import { supabase } from './supabase';
import isCapacitorNative from './isCapacitorNative';

// 小さなユーティリティ: iOSデバイスかどうか
function isIOS(): boolean {
  try {
    const ua = navigator.userAgent || '';
    if (/iP(hone|od|ad)/.test(ua)) return true;
    // Capacitor runtime
    // @ts-ignore
    const platform = (window as any)?.Capacitor?.getPlatform?.();
    if (platform === 'ios') return true;
  } catch {}
  return false;
}

async function getDeviceUUID(): Promise<string> {
  try {
    const { Device } = await import('@capacitor/device');
    const info = await Device.getId();
    if (info?.identifier) return info.identifier;
  } catch {}
  // フォールバック: ランダム
  const existing = localStorage.getItem('guest_device_uuid');
  if (existing) return existing;
  const uuid = crypto.randomUUID();
  localStorage.setItem('guest_device_uuid', uuid);
  return uuid;
}

export async function ensureGuestLoginIOS(): Promise<boolean> {
  // iOSかつネイティブのみ
  if (!isCapacitorNative() || !isIOS()) return false;

  try {
    const savedEmail = localStorage.getItem('guest_email');
    const savedPass = localStorage.getItem('guest_password');
    if (savedEmail && savedPass) {
      const { error } = await supabase.auth.signInWithPassword({ email: savedEmail, password: savedPass });
      if (!error) return true;
    }

    const device_uuid = await getDeviceUUID();
    const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/guest-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ device_uuid }),
    });
    if (!resp.ok) return false;
    const json = await resp.json() as { email?: string; password?: string };
    if (!json.email || !json.password) return false;
    localStorage.setItem('guest_email', json.email);
    localStorage.setItem('guest_password', json.password);
    const { error } = await supabase.auth.signInWithPassword({ email: json.email, password: json.password });
    return !error;
  } catch {
    return false;
  }
}

export default ensureGuestLoginIOS;


