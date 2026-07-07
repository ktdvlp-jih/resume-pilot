let sentryReady = false;

export function initErrorTracking(app: 'web' | 'admin') {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  void import('@sentry/react').then((Sentry) => {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      integrations: [Sentry.browserTracingIntegration()],
      tracesSampleRate: import.meta.env.PROD ? 0.1 : 1,
    });
    Sentry.setTag('app', app);
    sentryReady = true;
  });
}

export function captureError(error: unknown, context?: Record<string, unknown>) {
  if (import.meta.env.DEV) {
    console.error('[error-tracking]', error, context);
  }
  if (!sentryReady) return;
  void import('@sentry/react').then((Sentry) => {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  });
}
