import { Component, type ErrorInfo, type ReactNode } from "react";

import { captureAppException, getSentryEventId } from "@/lib/sentry";

import { AppErrorFallback } from "./app-error-fallback";

type AppErrorBoundaryProps = {
  release?: string;
  children: ReactNode;
};

type AppErrorBoundaryState = {
  componentStack?: string;
  error: unknown;
  sentryEventId?: string;
};

class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    componentStack: undefined,
    error: null,
    sentryEventId: undefined,
  };

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    return {
      componentStack: undefined,
      error,
      sentryEventId: getSentryEventId(error),
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    const componentStack = info.componentStack || undefined;
    this.setState({
      componentStack,
      error,
      sentryEventId:
        getSentryEventId(error) ??
        captureAppException(error, {
          componentStack,
          release: this.props.release,
          routePath: window.location.pathname,
        }),
    });
  }

  reset = () => {
    this.setState({
      componentStack: undefined,
      error: null,
      sentryEventId: undefined,
    });
  };

  render() {
    if (this.state.error) {
      return (
        <AppErrorFallback
          release={this.props.release}
          error={this.state.error}
          componentStack={this.state.componentStack}
          sentryEventId={this.state.sentryEventId}
        />
      );
    }

    return this.props.children;
  }
}

export { AppErrorBoundary };
