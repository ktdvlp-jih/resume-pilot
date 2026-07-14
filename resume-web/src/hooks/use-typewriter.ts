import { useEffect, useRef, useState } from 'react';

const TICK_MS = 16;
const TARGET_DURATION_MS = 900;

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function useTypewriter(text: string, enabled: boolean, onDone?: () => void) {
  const active = enabled && !prefersReducedMotion();
  const [displayed, setDisplayed] = useState(active ? '' : text);
  const [isTyping, setIsTyping] = useState(active && !!text);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!active || !text) {
      setDisplayed(text);
      setIsTyping(false);
      return;
    }

    setDisplayed('');
    setIsTyping(true);
    const chunk = Math.max(1, Math.ceil(text.length / (TARGET_DURATION_MS / TICK_MS)));
    let i = 0;
    intervalRef.current = setInterval(() => {
      i += chunk;
      if (i >= text.length) {
        setDisplayed(text);
        setIsTyping(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
        intervalRef.current = null;
        onDoneRef.current?.();
        return;
      }
      setDisplayed(text.slice(0, i));
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, active]);

  const skip = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setDisplayed(text);
    setIsTyping(false);
    onDoneRef.current?.();
  };

  return { displayed, isTyping, skip };
}
