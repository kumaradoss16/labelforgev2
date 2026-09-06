import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon, RefreshCw, RotateCcw, Copy, Download, Check } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[LabelForge] Uncaught exception in component tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      localStorage.removeItem('labelforge_active_doc');
      localStorage.removeItem('labelforge_recent_templates');
      window.location.reload();
    }
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleCopyDetails = async () => {
    const details = `LabelForge Studio Diagnostic Incident Report
Timestamp: ${new Date().toISOString()}
Error: ${this.state.error?.name}: ${this.state.error?.message}
Stack:
${this.state.error?.stack || 'N/A'}
Component Stack:
${this.state.errorInfo?.componentStack || 'N/A'}
User Agent: ${navigator.userAgent}
Viewport: ${window.innerWidth}x${window.innerHeight}
`;
    try {
      await navigator.clipboard.writeText(details);
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2500);
    } catch {
      // Fallback
    }
  };

  private handleExportReport = () => {
    const report = {
      product: 'LabelForge Studio',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screen: {
        width: window.innerWidth,
        height: window.innerHeight,
        pixelRatio: window.devicePixelRatio,
      },
      error: {
        name: this.state.error?.name,
        message: this.state.error?.message,
        stack: this.state.error?.stack,
      },
      componentStack: this.state.errorInfo?.componentStack,
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `labelforge-crash-diagnostic-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          aria-live="assertive"
          className="w-screen h-screen bg-[#0d0e11] text-zinc-100 flex flex-col items-center justify-center p-6 select-none"
        >
          <div className="w-full max-w-2xl bg-[#16181d] border border-red-500/40 rounded-xl p-6 shadow-2xl shadow-black/80 space-y-5">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-zinc-800 pb-4">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <AlertOctagon className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-zinc-100">
                  {this.props.fallbackTitle || 'Application Exception Intercepted'}
                </h1>
                <p className="text-xs text-zinc-400">
                  LabelForge Studio has protected your workspace state from corruption.
                </p>
              </div>
            </div>

            {/* Error Message Box */}
            <div className="bg-[#0f1013] border border-zinc-800/80 rounded-lg p-3 font-mono text-xs text-red-400/90 overflow-x-auto max-h-32 select-text">
              <p className="font-semibold text-red-300">
                {this.state.error?.name || 'Error'}: {this.state.error?.message || 'An unexpected render failure occurred'}
              </p>
              {this.state.error?.stack && (
                <pre className="mt-2 text-[10px] text-zinc-500 whitespace-pre-wrap leading-tight">
                  {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                </pre>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={this.handleReload}
                  className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reload App
                </button>
                <button
                  type="button"
                  onClick={this.handleReset}
                  className="px-3.5 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/40 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset to Safe Default
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={this.handleCopyDetails}
                  className="px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs rounded-md flex items-center gap-1.5 transition-colors"
                  title="Copy diagnostics to clipboard"
                >
                  {this.state.copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {this.state.copied ? 'Copied' : 'Copy Diagnostics'}
                </button>
                <button
                  type="button"
                  onClick={this.handleExportReport}
                  className="px-3 py-1.5 bg-zinc-800/80 hover:bg-zinc-700 text-zinc-300 text-xs rounded-md flex items-center gap-1.5 transition-colors"
                  title="Download JSON incident log"
                >
                  <Download className="w-3.5 h-3.5" />
                  Export JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
