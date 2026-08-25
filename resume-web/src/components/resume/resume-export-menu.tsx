import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Download, Link2, Printer } from 'lucide-react';
import { api } from '@/lib/api';
import { siteOrigin } from '@/lib/site';
import { downloadPlainText, printPlainText } from '@/lib/resume-export';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ResumeExportMenu({
  title,
  content,
  resumeId,
  compact = false,
}: {
  title: string;
  content?: string;
  resumeId?: string;
  compact?: boolean;
}) {
  const { t } = useTranslation();
  const body = content?.trim() ?? '';

  const share = async () => {
    if (!resumeId) {
      toast.error(t('export.saveFirst'));
      return;
    }
    try {
      const link = await api.createResumeShareLink(resumeId);
      const url = `${siteOrigin()}${link.path}`;
      await navigator.clipboard.writeText(url);
      toast.success(t('export.shareCopied'));
    } catch {
      toast.error(t('common.error'));
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={compact ? 'icon-sm' : 'sm'} aria-label={t('export.menu')}>
          <Download className="size-4" />
          {!compact && t('export.menu')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          disabled={!body}
          onSelect={() => downloadPlainText(title || 'resume', body)}
        >
          <Download className="size-4" />
          {t('export.txt')}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={!body} onSelect={() => printPlainText(title || 'resume', body)}>
          <Printer className="size-4" />
          {t('export.printPdf')}
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => void share()}>
          <Link2 className="size-4" />
          {t('export.share')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
