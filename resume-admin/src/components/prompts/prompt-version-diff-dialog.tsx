import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Columns2, Rows3 } from 'lucide-react';
import { TextDiffView } from '@/components/common/text-diff-view';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { countChangedLines, diffText } from '@/lib/text-diff';

export type PromptVersionDetail = {
  id: string;
  versionNumber: number;
  active: boolean;
  systemPrompt: string;
  userPrompt: string;
};

type PromptVersionDiffDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: PromptVersionDetail[];
  initialA?: number;
  initialB?: number;
};

export function PromptVersionDiffDialog({
  open,
  onOpenChange,
  versions,
  initialA,
  initialB,
}: PromptVersionDiffDialogProps) {
  const { t } = useTranslation();
  const sorted = useMemo(
    () => [...versions].sort((a, b) => a.versionNumber - b.versionNumber),
    [versions],
  );
  const defaultA = initialA ?? sorted[0]?.versionNumber ?? 1;
  const defaultB = initialB ?? sorted[sorted.length - 1]?.versionNumber ?? defaultA;
  const [versionA, setVersionA] = useState(defaultA);
  const [versionB, setVersionB] = useState(defaultB);
  const [viewMode, setViewMode] = useState<'split' | 'unified'>('split');

  useEffect(() => {
    if (open) {
      setVersionA(initialA ?? sorted[0]?.versionNumber ?? 1);
      setVersionB(initialB ?? sorted[sorted.length - 1]?.versionNumber ?? 1);
    }
  }, [open, initialA, initialB, sorted]);

  const va = sorted.find((v) => v.versionNumber === versionA);
  const vb = sorted.find((v) => v.versionNumber === versionB);
  const systemRows = va && vb ? diffText(va.systemPrompt, vb.systemPrompt) : [];
  const userRows = va && vb ? diffText(va.userPrompt, vb.userPrompt) : [];

  const labelA = t('prompts.versionLabel', { version: versionA });
  const labelB = t('prompts.versionLabel', { version: versionB });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('prompts.compareTitle')}</DialogTitle>
        </DialogHeader>

        {sorted.length < 2 ? (
          <p className="text-sm text-muted-foreground">{t('prompts.needTwoVersions')}</p>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={String(versionA)} onValueChange={(v) => setVersionA(Number(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sorted.map((v) => (
                    <SelectItem key={v.id} value={String(v.versionNumber)}>
                      v{v.versionNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">{t('common.vs')}</span>
              <Select value={String(versionB)} onValueChange={(v) => setVersionB(Number(v))}>
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sorted.map((v) => (
                    <SelectItem key={v.id} value={String(v.versionNumber)}>
                      v{v.versionNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="ml-auto flex gap-1 rounded-lg border p-1">
                <Button
                  type="button"
                  variant={viewMode === 'split' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setViewMode('split')}
                >
                  <Columns2 className="size-3.5" />
                  {t('prompts.splitView')}
                </Button>
                <Button
                  type="button"
                  variant={viewMode === 'unified' ? 'secondary' : 'ghost'}
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setViewMode('unified')}
                >
                  <Rows3 className="size-3.5" />
                  {t('prompts.unifiedView')}
                </Button>
              </div>
            </div>

            <Tabs defaultValue="system">
              <TabsList>
                <TabsTrigger value="system">
                  {t('prompts.systemPrompt')}
                  {systemRows.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {countChangedLines(systemRows)}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="user">
                  {t('prompts.userPrompt')}
                  {userRows.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {countChangedLines(userRows)}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="system" className="mt-3">
                {systemRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('prompts.noDiff')}</p>
                ) : (
                  <TextDiffView rows={systemRows} mode={viewMode} labelA={labelA} labelB={labelB} />
                )}
              </TabsContent>
              <TabsContent value="user" className="mt-3">
                {userRows.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('prompts.noDiff')}</p>
                ) : (
                  <TextDiffView rows={userRows} mode={viewMode} labelA={labelA} labelB={labelB} />
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
