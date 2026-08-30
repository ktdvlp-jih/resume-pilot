import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/** 같은 앱 안에서 `#id`로 들어오면 해당 제목으로 스크롤합니다. */
export function useScrollToHash() {
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [hash]);
}
