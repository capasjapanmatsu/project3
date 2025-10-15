export function isIOS(): boolean {
  try {
    if (typeof navigator !== 'undefined' && navigator.userAgent) {
      return /iPhone|iPad|iPod/i.test(navigator.userAgent);
    }
  } catch {}
  return false;
}

export default isIOS;


