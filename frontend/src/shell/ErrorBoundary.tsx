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
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    if (prev.resetKey !== this.props.resetKey && this.state.error) {
      this.setState({ error: null });
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(
      `[ErrorBoundary${this.props.label ? ` ${this.props.label}` : ''}]`,
      error,
      info.componentStack,
    );
  }

  render() {
    if (this.state.error) {
      if (this.props.fallback !== undefined) return this.props.fallback;
      return (
        <div className="error-boundary grid h-full min-h-[120px] w-full place-items-center p-6 text-center">
          <div className="error-boundary__card max-w-[40ch]">
            <div className="error-boundary__title text-sm font-medium text-ink2">
              Something went wrong rendering this view.
            </div>
            <div className="error-boundary__message mt-1 break-words font-mono text-xs text-ink3">
              {this.state.error.message}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
