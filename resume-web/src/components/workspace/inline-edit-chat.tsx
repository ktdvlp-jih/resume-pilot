import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, MessageSquareText } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  fullContent: string;
  onApply: (nextContent: string) => void;
};

export function InlineEditChat({ fullContent, onApply }: Props) {
  const { t } = useTranslation();
  const [selection, setSelection] = useState('');
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);

  const captureFromWindow = () => {
    const text = window.getSelection()?.toString()?.trim() ?? '';
    if (text) setSelection(text);
  };

  const submit = async () => {
    const selected = selection.trim();
    if (!selected) {
      toast.message(t('workspace.inlineEditNeedSelection'));
      return;
    }
    if (!fullContent.trim()) {
      toast.message(t('workspace.inlineEditNeedContent'));
      return;
    }
    setLoading(true);
    try {
      const res = await api.humanizeAi(fullContent, [selected]);
      const next = String(res.content ?? fullContent);
      const replacements = Array.isArray(res.replacements) ? res.replacements : [];
      let applied = next;
      if (next === fullContent && replacements.length > 0) {
        applied = fullContent;
        for (const r of replacements) {
          const original = r.original?.trim();
          const revised = r.revised;
          if (original && revised != null && applied.includes(original)) {
            applied = applied.replace(original, revised);
          }
        }
      }
      if (applied === fullContent) {
        toast.message(t('workspace.humanizeNone'));
        return;
      }
      onApply(applied);
      setSelection('');
      setInstruction('');
      toast.success(t('workspace.inlineEditApplied'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquareText className="size-4 text-primary" aria-hidden />
        {t('workspace.inlineEditTitle')}
      </div>
      <p className="text-xs text-muted-foreground">{t('workspace.inlineEditHint')}</p>
      <div className="space-y-2">
        <Label htmlFor="inline-selection">{t('workspace.inlineEditSelection')}</Label>
        <Textarea
          id="inline-selection"
          value={selection}
          onChange={(e) => setSelection(e.target.value)}
          onFocus={captureFromWindow}
          placeholder={t('workspace.inlineEditSelectionPlaceholder')}
          className="min-h-20 resize-none text-sm"
        />
        <Button type="button" variant="outline" size="sm" onClick={captureFromWindow}>
          {t('workspace.inlineEditCapture')}
        </Button>
      </div>
      <div className="space-y-2">
        <Label htmlFor="inline-instruction">{t('workspace.inlineEditInstruction')}</Label>
        <Input
          id="inline-instruction"
          value={instruction}
          onChange={(e) => setInstruction(e.target.value)}
          placeholder={t('workspace.inlineEditInstructionPlaceholder')}
        />
      </div>
      <Button type="button" size="sm" disabled={loading} onClick={() => void submit()}>
        {loading ? <Loader2 className="size-4 animate-spin" /> : t('workspace.inlineEditSubmit')}
      </Button>
    </div>
  );
}
