import React, { Component, useEffect, type ErrorInfo, type ReactNode } from 'react';
import { usePathname } from 'expo-router';
import Constants from 'expo-constants';
import { ErrorFallbackScreen } from './ErrorFallbackScreen';
import { createBugReport } from '../api/bugReports';
import { getLastRoute, setLastRoute } from '../utils/lastRoute';

const isExpoGo = Constants.appOwnership === 'expo';

function RouteTracker({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  useEffect(() => {
    setLastRoute(pathname ?? '');
  }, [pathname]);
  return <>{children}</>;
}

type State = {
  error: Error | null;
  errorInfo: ErrorInfo | null;
};

type Props = {
  children: ReactNode;
  onGoHome?: () => void;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {
    error: null,
    errorInfo: null,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    if (!isExpoGo) {
      try {
        require('@sentry/react-native').captureException(error, { extra: { componentStack: errorInfo?.componentStack } });
      } catch {
        // Sentry not available (e.g. Expo Go)
      }
    }
  }

  handleReport = async (payload: {
    message: string;
    stack?: string;
    screen?: string;
    userComment?: string;
  }) => {
    await createBugReport({
      type: 'BUG',
      message: payload.message,
      stack: payload.stack,
      screen: payload.screen ?? (getLastRoute() || undefined),
      userComment: payload.userComment,
    });
  };

  handleRetry = () => {
    this.setState({ error: null, errorInfo: null });
  };

  render() {
    const { error, errorInfo } = this.state;
    if (error) {
      const stack =
        errorInfo?.componentStack ?? error.stack ?? undefined;
      return (
        <ErrorFallbackScreen
          errorMessage={error.message || 'Erro desconhecido'}
          stack={stack}
          onReport={async (p) => {
            await this.handleReport({
              ...p,
              screen: p.screen ?? (getLastRoute() || undefined),
            });
          }}
          onRetry={this.handleRetry}
          onGoHome={this.props.onGoHome}
        />
      );
    }
    return <RouteTracker>{this.props.children}</RouteTracker>;
  }
}
