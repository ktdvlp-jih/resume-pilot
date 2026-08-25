import { useEffect } from 'react';
import { clearTokens, getAccessToken } from '@/lib/api';

/** 사용자 입력이 없으면 로그아웃. 자소서 작성 중 잠깐의 멈춤은 허용한다. */
const IDLE_SESSION_MS = 60 * 60 * 1000;
const CHECK_MS = 30_000;
const MOVE_THROTTLE_MS = 1000;

export function useIdleSession(loginPath: string) {
  useEffect(() => {
    if (!getAccessToken()) return;

    let lastActivity = Date.now();
    let lastMove = 0;

    const mark = () => {
      lastActivity = Date.now();
    };
    const onMove = () => {
      const now = Date.now();
      if (now - lastMove < MOVE_THROTTLE_MS) return;
      lastMove = now;
      mark();
    };

    const opts: AddEventListenerOptions = { passive: true };
    window.addEventListener('mousedown', mark, opts);
    window.addEventListener('keydown', mark, opts);
    window.addEventListener('scroll', mark, opts);
    window.addEventListener('touchstart', mark, opts);
    window.addEventListener('mousemove', onMove, opts);

    const timer = window.setInterval(() => {
      if (!getAccessToken()) return;
      if (Date.now() - lastActivity < IDLE_SESSION_MS) return;
      clearTokens();
      const sep = loginPath.includes('?') ? '&' : '?';
      window.location.assign(`${loginPath}${sep}expired=1`);
    }, CHECK_MS);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('mousedown', mark);
      window.removeEventListener('keydown', mark);
      window.removeEventListener('scroll', mark);
      window.removeEventListener('touchstart', mark);
      window.removeEventListener('mousemove', onMove);
    };
  }, [loginPath]);
}
