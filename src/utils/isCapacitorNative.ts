import { Capacitor } from '@capacitor/core';

export function isCapacitorNative(): boolean {
  try {
    if (Capacitor?.isNativePlatform && Capacitor.isNativePlatform()) return true;
  } catch {}

  const w = (typeof window !== 'undefined' ? (window as any) : undefined);
  try {
    if (w?.Capacitor?.isNativePlatform?.()) return true;
  } catch {}

  try {
    const protocol = typeof window !== 'undefined' ? window.location?.protocol : '';
    if (protocol === 'capacitor:') return true;
  } catch {}

  try {
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    if (ua.includes('Capacitor')) return true;
  } catch {}

  return false;
}

export default isCapacitorNative;


