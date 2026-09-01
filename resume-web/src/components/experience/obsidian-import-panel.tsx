import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { BrandIconBadge } from '@/components/common/brand-icons';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

type ObsidianImportPanelProps = {
  onPreview: (files: Array<{ filename: string; content: string }>) => Promise<void>;
  previewing?: boolean;
};

async function readMarkdownFiles(fileList: FileList): Promise<Array<{ filename: string; content: string }>> {
  const mdFiles = Array.from(fileList).filter(
    (f) => f.name.toLowerCase().endsWith('.md') || f.type === 'text/markdown' || f.type === 'text/plain',
  );
  if (mdFiles.length === 0) {
    throw new Error('noMarkdown');
  }
  const results: Array<{ filename: string; content: string }> = [];
  for (const file of mdFiles) {
    const content = await file.text();
    results.push({ filename: file.name, content });
  }
  return results;
}

export function ObsidianImportPanel({ onPreview, previewing = false }: ObsidianImportPanelProps) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [loadingFiles, setLoadingFiles] = useState(false);

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setLoadingFiles(true);
    try {
      const files = await readMarkdownFiles(fileList);
      setSelectedCount(files.length);
      await onPreview(files);
    } catch (err) {
      if (err instanceof Error && err.message === 'noMarkdown') {
        toast.error(t('experienceImport.obsidianNoMarkdown'));
      } else {
        toast.error(err instanceof Error ? err.message : t('common.error'));
      }
    } finally {
      setLoadingFiles(false);
      if (inputRef.current) {
        inputRef.current.value = '';
      }
    }
  };

  const busy = previewing || loadingFiles;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="items-center text-center">
        <BrandIconBadge brand="obsidian" className="mb-3" />
        <CardTitle>{t('experienceImport.obsidianTitle')}</CardTitle>
        <CardDescription className="max-w-lg">{t('experienceImport.obsidianDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4 pb-8">
        <div className="w-full max-w-md space-y-3 rounded-lg border border-dashed p-6 text-center">
          <Label htmlFor="obsidian-md-files" className="cursor-pointer">
            <div className="flex flex-col items-center gap-2">
              <FileUp className="size-8 text-muted-foreground" aria-hidden />
              <p className="text-sm font-medium">{t('experienceImport.obsidianPickFiles')}</p>
              <p className="text-xs text-muted-foreground">{t('experienceImport.obsidianFileHint')}</p>
            </div>
          </Label>
          <input
            ref={inputRef}
            id="obsidian-md-files"
            type="file"
            accept=".md,text/markdown,text/plain"
            multiple
            className="sr-only"
            disabled={busy}
            onChange={(e) => handleFiles(e.target.files)}
          />
          {selectedCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {t('experienceImport.obsidianSelected', { count: selectedCount })}
            </p>
          )}
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : t('experienceImport.obsidianBrowse')}
          </Button>
        </div>
        <p className="max-w-lg text-center text-xs text-muted-foreground">{t('experienceImport.obsidianVaultHint')}</p>
      </CardContent>
    </Card>
  );
}
