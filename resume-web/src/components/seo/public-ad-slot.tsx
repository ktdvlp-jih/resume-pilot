import { useEffect } from 'react';

export function PublicAdSlot({ className }: { className?: string }) {
  const client = (import.meta.env.VITE_ADSENSE_CLIENT as string | undefined)?.trim();

  useEffect(() => {
    if (!client) return;
    const id = 'resumepilot-adsense';
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
    document.head.appendChild(script);
  }, [client]);

  if (!client) return null;

  return (
    <aside
      className={className}
      aria-label="advertisement"
      data-ad-client={client}
    />
  );
}
