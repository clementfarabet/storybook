import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[Storybook ErrorBoundary] Uncaught render exception:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetStorage = () => {
    try {
      localStorage.removeItem('storybook_active_book_v1');
      localStorage.removeItem('storybook_saved_book');
    } catch (_) {}
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center p-6"
          style={{ backgroundColor: 'var(--paper)', color: 'var(--ink)' }}
        >
          <div
            className="max-w-md w-full p-8 rounded-3xl border shadow-xl text-center space-y-5"
            style={{
              backgroundColor: 'var(--paper-2)',
              borderColor: 'var(--rule)',
            }}
          >
            <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-amber-500/10 text-amber-600">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h1 className="font-serif text-2xl font-medium tracking-tight" style={{ color: 'var(--ink)' }}>
                Something gently slipped
              </h1>
              <p className="text-xs sm:text-sm font-sans leading-relaxed" style={{ color: 'var(--ink-2)' }}>
                The storybook encountered an unexpected hiccup. Your recorded memories are safe in storage.
              </p>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="btn-accent min-h-[44px] px-5 py-2.5 rounded-full text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-xs"
                style={{
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-contrast)',
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reload Storybook</span>
              </button>

              <button
                type="button"
                onClick={this.handleResetStorage}
                className="min-h-[44px] px-4 py-2.5 rounded-full text-xs font-medium border transition-colors cursor-pointer"
                style={{
                  borderColor: 'var(--rule)',
                  backgroundColor: 'var(--paper)',
                  color: 'var(--ink-2)',
                }}
              >
                <span>Reset to Fresh Book</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
