import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';
import AIChatWidget from './AIChatWidget';

export default function AIChatPortal() {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const el = document.createElement('div');
    el.id = 'ai-chat-portal-root';
    el.style.position = 'fixed';
    el.style.zIndex = '2147483000';
    el.style.inset = '0 auto auto 0';
    document.body.appendChild(el);
    setContainer(el);
    try { console.log('[AIChatPortal] mounted'); } catch {}
    return () => {
      try { document.body.removeChild(el); } catch {}
    };
  }, []);

  if (!container) return null;
  return createPortal(<AIChatWidget />, container);
}


