import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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

const OPERATION_ORDER = ['GENERATE', 'JOB_ANALYSIS', 'AI_DETECTION', 'AI_REVIEW', 'EMBEDDING'];

const FREE_CHAT_MODELS_BY_PROVIDER: Record<string, string[]> = {
  gemini: ['gemini-2.5-flash', 'gemini-2.0-flash-lite'],
  openai: ['gpt-4o-mini'],
  github: ['openai/gpt-4o-mini', 'openai/gpt-4.1-mini', 'meta/llama-3.3-70b-instruct'],
  groq: ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
  openrouter: ['google/gemini-2.5-flash', 'meta-llama/llama-3.1-8b-instruct:free', 'deepseek/deepseek-r1:free'],
};

const FREE_EMBEDDING_MODELS_BY_PROVIDER: Record<string, string[]> = {
  gemini: ['gemini-embedding-001'],
  openai: ['text-embedding-3-small'],
  github: [],
  groq: [],
  openrouter: [],
};

export default function LlmSettingsPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [routeEdits, setRouteEdits] = useState<Record<string, { modelName: string; priority: string; enabled: boolean }>>({});

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
      queryClient.invalidateQueries({ queryKey: ['admin-llm-providers'] });
    },
  });

  const routeMutation = useMutation({
    mutationFn: api.updateLlmRoute,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-llm-routes'] });
    },
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
      modelName: route.modelName,
      priority: String(route.priority),
      enabled: route.enabled,
    };

  const getRouteModelOptions = (route: LlmRoute, currentModel: string) => {
    const byProvider = route.operation === 'EMBEDDING'
      ? FREE_EMBEDDING_MODELS_BY_PROVIDER
      : FREE_CHAT_MODELS_BY_PROVIDER;
    const preset = byProvider[route.providerSlug] ?? [];
    if (currentModel && !preset.includes(currentModel)) {
      return [currentModel, ...preset];
    }
    return preset;
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

  const saveRoute = (route: LlmRoute) => {
    const edit = getRouteEdit(route);
    routeMutation.mutate({
      id: route.id,
      modelName: edit.modelName.trim(),
      priority: Number(edit.priority),
      enabled: edit.enabled,
    });
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

      {(providerMutation.isError || routeMutation.isError) && (
        <Alert variant="destructive">
          <AlertDescription>
            {(providerMutation.error ?? routeMutation.error) instanceof Error
              ? (providerMutation.error ?? routeMutation.error)?.message
              : t('llmSettings.saveError')}
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
            routesByOperation.map(({ operation, routes: opRoutes }) => (
              <div key={operation} className="space-y-2">
                <h3 className="text-sm font-medium">{t(`llmSettings.operations.${operation}`, { defaultValue: operation })}</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('llmSettings.priority')}</TableHead>
                      <TableHead>{t('llmSettings.provider')}</TableHead>
                      <TableHead>{t('llmSettings.model')}</TableHead>
                      <TableHead>{t('llmSettings.enabled')}</TableHead>
                      <TableHead className="text-right">{t('common.save')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {opRoutes.map((route) => {
                      const edit = getRouteEdit(route);
                      const isRagEmbedding = route.operation === 'EMBEDDING';
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
                          <TableCell>
                            <div className="text-sm">{route.providerName}</div>
                            <div className="text-xs text-muted-foreground">{route.providerSlug}</div>
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
                                {getRouteModelOptions(route, edit.modelName).map((model) => (
                                  <SelectItem key={model} value={model}>
                                    {model}
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
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={routeMutation.isPending || isRagEmbedding}
                              onClick={() => saveRoute(route)}
                            >
                              {isRagEmbedding
                                ? t('llmSettings.ragLocked', { defaultValue: 'RAG 고정' })
                                : t('common.save')}
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ))
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
