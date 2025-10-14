// Lightweight route prefetcher for lazy-chunk warm-up
// It is safe: only fetches JS chunks; UIは何も変えない

const prefetched = new Set<string>();

function key(path: string) {
  // 正規化（クエリ/ハッシュ除去）
  try {
    const u = new URL(path, typeof window !== 'undefined' ? window.location.origin : 'https://example.com');
    return u.pathname;
  } catch {
    return path.split('?')[0].split('#')[0];
  }
}

export async function prefetchRoute(path: string): Promise<void> {
  const k = key(path);
  if (prefetched.has(k)) return;
  try {
    // 目的の画面に対応するlazy importを先読み
    if (k === '/' || k === '/home') {
      await import('../pages/Home');
    } else if (k.startsWith('/parks')) {
      await import('../pages/DogParkList');
    } else if (k.startsWith('/petshop')) {
      await import('../pages/PetShop');
    } else if (k.startsWith('/community')) {
      await import('../pages/Community');
    } else if (k.startsWith('/dashboard')) {
      await import('../pages/UserDashboard');
    } else if (k.startsWith('/login')) {
      await import('../pages/Login');
    } else if (k.startsWith('/register')) {
      await import('../pages/Register');
    } else if (k.startsWith('/news')) {
      await import('../pages/News');
    } else if (k.startsWith('/dog-info')) {
      await import('../pages/DogInfo');
    } else if (k.startsWith('/contact')) {
      await import('../pages/Contact');
    }
    prefetched.add(k);
  } catch {
    // no-op（失敗してもUXは変えない）
  }
}

// アクセシビリティ配慮: hoverとfocusの両方でプリフェッチ
export function attachPrefetchHandlers(
  handlersPath: string
): { onMouseEnter: () => void; onFocus: () => void } {
  const fn = () => { void prefetchRoute(handlersPath); };
  return { onMouseEnter: fn, onFocus: fn };
}


