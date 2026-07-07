import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureError } from '@/lib/error-tracking';

type Props = { children: ReactNode; fallbackTitle?: string };

type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureError(error, { componentStack: info.componentStack });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangle className="size-10 text-destructive" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">{this.props.fallbackTitle ?? 'Something went wrong'}</h2>
            <p className="max-w-md text-sm text-muted-foreground">{this.state.error.message}</p>
          </div>
          <Button variant="outline" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
