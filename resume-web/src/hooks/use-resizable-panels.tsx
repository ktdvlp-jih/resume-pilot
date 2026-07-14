import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'resume-pilot-workspace-split-v2';
const MIN = 360;
const MAX = 640;

function clamp(width: number): number {
  return Math.min(MAX, Math.max(MIN, width));
}

function defaultWidth(): number {
  if (typeof window === 'undefined') return 420;
  return clamp(Math.round(window.innerWidth * 0.42));
}

function loadWidth(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const n = raw ? Number(raw) : NaN;
    if (Number.isFinite(n)) return clamp(n);
  } catch {
    /* ignore */
  }
  return defaultWidth();
}

export function useResizablePanels() {
  const [leftWidth, setLeftWidth] = useState<number>(loadWidth);
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (!isResizing) return;

    const onMove = (e: MouseEvent) => {
      setLeftWidth(clamp(e.clientX));
    };

    const onUp = () => {
      setIsResizing(false);
      setLeftWidth((prev) => {
        localStorage.setItem(STORAGE_KEY, String(prev));
        return prev;
      });
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isResizing]);

  const startResize = useCallback(() => setIsResizing(true), []);

  return { leftWidth, startResize, isResizing };
}

export function PanelResizeHandle({
  onMouseDown,
  className,
}: {
  onMouseDown: () => void;
  className?: string;
}) {
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel"
      onMouseDown={(e) => {
        e.preventDefault();
        onMouseDown();
      }}
      className={cn(
        'group relative z-10 w-1 shrink-0 cursor-col-resize bg-border/60 transition-colors hover:bg-primary/40',
        className,
      )}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  );
}
