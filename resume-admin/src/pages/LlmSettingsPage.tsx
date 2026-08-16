import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/PageHeader';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatModelDisplay } from '@/lib/model-labels';

type LlmProvider = {
  id: string;
  slug: string;
  displayName: string;
  providerType: string;
  baseUrl?: string;
  enabled: boolean;
  hasApiKey: boolean;
  apiKeyMasked: string;
};

type LlmRoute = {
  id: string;
  operation: string;
  providerId: string;
  providerSlug: string;
  providerName: string;
  modelName: string;
  priority: number;
  enabled: boolean;
};

const OPERATION_ORDER = ['GENERATE', 'JOB_ANALYSIS', 'AI_DETECTION', 'AI_REVIEW', 'INTERVIEW_QUESTIONS', 'KEYWORD_COMPARE', 'PORTFOLIO_REVIEW', 'EMBEDDING'];

const FREE_CHAT_MODELS_BY_PROVIDER: Record<string, string[]> = {
  gemini: ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.0-flash-lite'],
  openai: ['gpt-4o-mini'],
  github: ['openai/gpt-4o-mini', 'openai/gpt-4.1-mini', 'meta/llama-3.3-70b-instruct'],
  groq: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
  openrouter: ['openrouter/free', 'openai/gpt-oss-20b:free', 'google/gemma-4-31b-it:free'],
  deepseek: ['deepseek-v4-flash', 'deepseek-v4-pro'],
};

const FREE_EMBEDDING_MODELS_BY_PROVIDER: Record<string, string[]> = {
  gemini: ['gemini-embedding-001'],
  openai: ['text-embedding-3-small'],
  github: [],
  groq: [],
  openrouter: [],
  deepseek: [],
};

export default function LlmSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [routeEdits, setRouteEdits] = useState<
    Record<string, { providerId: string; modelName: string; priority: string; enabled: boolean }>
  >({});
  const [routeValidationError, setRouteValidationError] = useState<{
    operation: string;
    message: string;
  } | null>(null);

  const [savingOperation, setSavingOperation] = useState<string | null>(null);

  const providersQuery = useQuery({
    queryKey: ['admin-llm-providers'],
    queryFn: api.listLlmProviders,
    retry: false,
  });

  const routesQuery = useQuery({
    queryKey: ['admin-llm-routes'],
    queryFn: api.listLlmRoutes,
    retry: false,
  });

  const providerMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof api.updateLlmProvider>[1] }) =>
      api.updateLlmProvider(id, data),
    onSuccess: (_, vars) => {
      setApiKeys((prev) => {
        const next = { ...prev };
        delete next[vars.id];
        return next;
      });
      toast.success(t('llmSettings.saveSuccess'));
      queryClient.invalidateQueries({ queryKey: ['admin-llm-providers'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : t('llmSettings.saveError'));
    },
  });

  const routeMutation = useMutation({
    mutationFn: ({ operation, routes }: { operation: string; routes: Parameters<typeof api.updateLlmRoutes>[1] }) =>
      api.updateLlmRoutes(operation, routes),
    onSuccess: (_, vars) => {
      setRouteEdits((prev) => {
        const next = { ...prev };
        for (const route of vars.routes) {
          delete next[route.id];
        }
        return next;
      });
      setRouteValidationError(null);
      toast.success(t('llmSettings.saveSuccess'));
      queryClient.invalidateQueries({ queryKey: ['admin-llm-routes'] });
    },
    onError: (err, vars) => {
      const message = err instanceof Error ? err.message : t('llmSettings.saveError');
      setRouteValidationError({ operation: vars.operation, message });
      toast.error(message);
    },
    onSettled: () => setSavingOperation(null),
  });

  const providers = (providersQuery.data ?? []) as LlmProvider[];
  const routes = (routesQuery.data ?? []) as LlmRoute[];

  const routesByOperation = useMemo(() => {
    const grouped = new Map<string, LlmRoute[]>();
    for (const route of routes) {
      const list = grouped.get(route.operation) ?? [];
      list.push(route);
      grouped.set(route.operation, list);
    }
    for (const [, list] of grouped) {
      list.sort((a, b) => a.priority - b.priority);
    }
    return OPERATION_ORDER.filter((op) => grouped.has(op)).map((op) => ({
      operation: op,
      routes: grouped.get(op) ?? [],
    }));
  }, [routes]);

  const isLoading = providersQuery.isLoading || routesQuery.isLoading;
  const isError = providersQuery.isError || routesQuery.isError;
  const error = providersQuery.error ?? routesQuery.error;

  const getRouteEdit = (route: LlmRoute) =>
    routeEdits[route.id] ?? {
      providerId: route.providerId,
      modelName: route.modelName,
      priority: String(route.priority),
      enabled: route.enabled,
    };

  const providerSlugById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of providers) map.set(p.id, p.slug);
    return map;
  }, [providers]);

  const getRouteModelOptions = (operation: string, providerId: string, currentModel: string) => {
    const slug = providerSlugById.get(providerId) ?? '';
    const byProvider = operation === 'EMBEDDING'
      ? FREE_EMBEDDING_MODELS_BY_PROVIDER
      : FREE_CHAT_MODELS_BY_PROVIDER;
    const preset = byProvider[slug] ?? [];
    if (currentModel && !preset.includes(currentModel)) {
      return [currentModel, ...preset];
    }
    return preset.length > 0 ? preset : currentModel ? [currentModel] : [];
  };

  const saveProvider = (provider: LlmProvider, enabled?: boolean) => {
    providerMutation.mutate({
      id: provider.id,
      data: {
        displayName: provider.displayName,
        baseUrl: provider.baseUrl,
        enabled: enabled ?? provider.enabled,
        apiKey: apiKeys[provider.id] || undefined,
      },
    });
  };

  const saveOperationRoutes = (operation: string, opRoutes: LlmRoute[]) => {
    if (operation === 'EMBEDDING') {
      return;
    }
    const payloads: Array<{
      id: string;
      providerId: string;
      modelName: string;
      priority: number;
      enabled: boolean;
    }> = [];
    const seenPriority = new Set<number>();
    const seenModel = new Set<string>();
    for (const route of opRoutes) {
      const edit = getRouteEdit(route);
      const priority = Number(edit.priority);
      const modelName = edit.modelName.trim();
      if (!Number.isInteger(priority) || priority < 1) {
        const message = t('llmSettings.validationPriority');
        setRouteValidationError({ operation, message });
        toast.error(message);
        return;
      }
      if (seenPriority.has(priority)) {
        const message = t('llmSettings.validationPriorityDup', { priority });
        setRouteValidationError({ operation, message });
        toast.error(message);
        return;
      }
      seenPriority.add(priority);
      const modelKey = `${edit.providerId}:${modelName.toLowerCase()}`;
      if (seenModel.has(modelKey)) {
        const message = t('llmSettings.validationModelDup');
        setRouteValidationError({ operation, message });
        toast.error(message);
        return;
      }
      seenModel.add(modelKey);
      payloads.push({
        id: route.id,
        providerId: edit.providerId,
        modelName,
        priority,
        enabled: edit.enabled,
      });
    }
    setRouteValidationError(null);
    setSavingOperation(operation);
    routeMutation.mutate({ operation, routes: payloads });
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t('llmSettings.title')} description={t('llmSettings.subtitle')} />

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : t('llmSettings.loadError')}
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('llmSettings.providersTitle')}</CardTitle>
          <CardDescription>{t('llmSettings.providersDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : (
            providers.map((provider) => (
              <Card key={provider.id} className="border-dashed">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-sm">{provider.displayName}</CardTitle>
                      <CardDescription className="font-mono text-xs">{provider.slug}</CardDescription>
                    </div>
                    <Badge variant={provider.enabled ? 'default' : 'secondary'}>
                      {provider.enabled ? t('common.active') : t('common.inactive')}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {provider.baseUrl && (
                    <p className="truncate text-xs text-muted-foreground" title={provider.baseUrl}>
                      {provider.baseUrl}
                    </p>
                  )}
                  <div className="space-y-1">
                    <Label htmlFor={`key-${provider.id}`}>{t('llmSettings.apiKey')}</Label>
                    <Input
                      id={`key-${provider.id}`}
                      type="password"
                      placeholder={provider.hasApiKey ? provider.apiKeyMasked : t('llmSettings.apiKeyPlaceholder')}
                      value={apiKeys[provider.id] ?? ''}
                      onChange={(e) =>
                        setApiKeys((prev) => ({ ...prev, [provider.id]: e.target.value }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor={`enabled-${provider.id}`}>{t('llmSettings.enableProvider')}</Label>
                    <Switch
                      id={`enabled-${provider.id}`}
                      checked={provider.enabled}
                      disabled={providerMutation.isPending || (!provider.hasApiKey && !apiKeys[provider.id])}
                      onCheckedChange={(checked) => saveProvider(provider, checked)}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={providerMutation.isPending || !apiKeys[provider.id]}
                    onClick={() => saveProvider(provider)}
                  >
                    {t('llmSettings.saveKey')}
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('llmSettings.routesTitle')}</CardTitle>
          <CardDescription>{t('llmSettings.routesDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : (
            routesByOperation.map(({ operation, routes: opRoutes }) => {
              const isRagEmbedding = operation === 'EMBEDDING';
              return (
              <div key={operation} className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-medium">{t(`llmSettings.operations.${operation}`, { defaultValue: operation })}</h3>
                  {isRagEmbedding ? (
                    <span className="text-xs text-muted-foreground">{t('llmSettings.ragLocked')}</span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={routeMutation.isPending}
                      onClick={() => saveOperationRoutes(operation, opRoutes)}
                    >
                      {savingOperation === operation ? t('common.loading') : t('llmSettings.saveRoutes')}
                    </Button>
                  )}
                </div>
                {routeValidationError?.operation === operation && (
                  <Alert variant="destructive">
                    <AlertDescription>{routeValidationError.message}</AlertDescription>
                  </Alert>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('llmSettings.priority')}</TableHead>
                      <TableHead>{t('llmSettings.provider')}</TableHead>
                      <TableHead>{t('llmSettings.model')}</TableHead>
                      <TableHead>{t('llmSettings.enabled')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opRoutes.map((route) => {
                      const edit = getRouteEdit(route);
                      return (
                        <TableRow key={route.id}>
                          <TableCell className="w-24">
                            <Input
                              type="number"
                              min={1}
                              value={edit.priority}
                              disabled={isRagEmbedding}
                              onChange={(e) =>
                                setRouteEdits((prev) => ({
                                  ...prev,
                                  [route.id]: { ...edit, priority: e.target.value },
                                }))
                              }
                            />
                          </TableCell>
                              <TableCell className="min-w-44">
                            <Select
                              value={edit.providerId}
                              disabled={isRagEmbedding}
                              onValueChange={(providerId) => {
                                const models = getRouteModelOptions(route.operation, providerId, '');
                                setRouteEdits((prev) => ({
                                  ...prev,
                                  [route.id]: {
                                    ...edit,
                                    providerId,
                                    modelName: models[0] ?? edit.modelName,
                                  },
                                }));
                              }}
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('llmSettings.provider')} />
                              </SelectTrigger>
                              <SelectContent>
                                {providers.map((p) => (
                                  <SelectItem key={p.id} value={p.id}>
                                    {p.displayName} ({p.slug})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={edit.modelName}
                              disabled={isRagEmbedding}
                              onValueChange={(value) =>
                                setRouteEdits((prev) => ({
                                  ...prev,
                                  [route.id]: { ...edit, modelName: value },
                                }))
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder={t('llmSettings.model')} />
                              </SelectTrigger>
                              <SelectContent>
                                {getRouteModelOptions(route.operation, edit.providerId, edit.modelName).map((model) => (
                                  <SelectItem key={model} value={model}>
                                    {formatModelDisplay(model)}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={edit.enabled}
                              disabled={isRagEmbedding}
                              onCheckedChange={(checked) =>
                                setRouteEdits((prev) => ({
                                  ...prev,
                                  [route.id]: { ...edit, enabled: checked },
                                }))
                              }
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('llmSettings.noteTitle')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>{t('llmSettings.note1')}</p>
          <p>{t('llmSettings.note2')}</p>
          <p>{t('llmSettings.note3')}</p>
        </CardContent>
      </Card>
    </div>
  );
}
