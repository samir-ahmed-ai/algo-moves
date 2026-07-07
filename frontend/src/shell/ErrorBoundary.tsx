import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Optional custom fallback UI. */
  fallback?: ReactNode;
  /** When this changes, the boundary clears its error (e.g. on problem switch). */
  resetKey?: string | number;
  /** Prefix for the console.error, so logs point at the failing surface. */
  label?: string;
}

interface State {
  error: Error | null;
}

/**
 * Catches render/runtime errors in a subtree so one bad plugin View or panel
 * can't white-screen the whole app. Two mount points: around each plugin View
 * (keyed by problem id, so switching problems recovers) and around the whole
 * Shell as a backstop.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[ErrorBoundary${this.props.label ? ` ${this.props.label}` : ''}]`,
      error,
      info.componentStack,
    );
  }

  private handleRetry = () => {
    this.setState({ error: null });
  };

  override render() {
    if (this.state.error) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <div
          className="error-boundary grid h-full min-h-[180px] w-full place-items-center p-6 text-center"
          role="alert"
          aria-live="assertive"
        >
          <div className="error-boundary__card max-w-[42ch] rounded-[calc(var(--radius)*1.4)] border border-edge bg-panel/90 p-5 shadow-theme-lg backdrop-blur">
            <div className="mx-auto mb-3 grid size-10 place-items-center rounded-2xl bg-badbg font-mono text-sm font-semibold text-bad">
              !
            </div>
            <h2 className="error-boundary__title text-base font-semibold text-ink">
              This view needs a refresh.
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink2">
              Algo Moves kept the rest of the workspace alive, but this panel hit a render error.
            </p>
            <code className="error-boundary__message mt-3 block break-words rounded-xl border border-edge bg-bg/70 px-3 py-2 text-left font-mono text-xs text-ink3">
              {this.state.error.message}
            </code>
            <button
              type="button"
              onClick={this.handleRetry}
              className="mt-4 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-bg shadow-theme-sm transition hover:translate-y-[-1px] hover:shadow-theme-md"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
