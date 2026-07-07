import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'resume-pilot-workspace-panels';
const MIN = 220;
const MAX_LEFT = 420;
const MAX_RIGHT = 480;
const DEFAULTS = { left: 280, right: 320 };

type PanelWidths = typeof DEFAULTS;

function loadWidths(): PanelWidths {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return DEFAULTS;
}

type ResizeSide = 'left' | 'right';

export function useResizablePanels() {
  const [widths, setWidths] = useState<PanelWidths>(loadWidths);
  const [resizing, setResizing] = useState<ResizeSide | null>(null);

  useEffect(() => {
    if (!resizing) return;

    const onMove = (e: MouseEvent) => {
      setWidths((prev) => {
        if (resizing === 'left') {
          const left = Math.min(MAX_LEFT, Math.max(MIN, e.clientX));
          return { ...prev, left };
        }
        const right = Math.min(MAX_RIGHT, Math.max(MIN, window.innerWidth - e.clientX));
        return { ...prev, right };
      });
    };

    const onUp = () => {
      setResizing(null);
      setWidths((prev) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(prev));
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
  }, [resizing]);

  const startResize = useCallback((side: ResizeSide) => setResizing(side), []);

  return { widths, startResize, isResizing: resizing !== null };
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
