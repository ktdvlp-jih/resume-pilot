import type { ReactNode } from 'react';
import { HelpChatWidget } from '@/components/help/help-chat-widget';
import { PublicHeader, AppFooter } from '@/components/layout/public-header';

export function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <PublicHeader />
      <main className="flex-1">{children}</main>
      <AppFooter />
      <HelpChatWidget />
    </div>
  );
}
