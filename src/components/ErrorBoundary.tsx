import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    
    // Detect ChunkLoadError or dynamic import failures
    const errorString = String(error).toLowerCase();
    const isChunkError =
      errorString.includes("chunkloaderror") ||
      errorString.includes("failed to fetch dynamically imported module") ||
      errorString.includes("dynamically imported module");

    if (isChunkError) {
      console.warn("ChunkLoadError detected, performing automatic page reload...");
      window.location.reload();
    }
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          minHeight: '60vh', gap: '20px', padding: '20px', textAlign: 'center'
        }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <h3 style={{ fontFamily: "'Orbitron', sans-serif", margin: 0, color: 'var(--text-primary)' }}>
            Something went wrong
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '400px', margin: 0 }}>
            The page encountered an error. Click below to reload.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px', borderRadius: '10px', background: 'var(--accent, #e91e8c)',
              color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold'
            }}
          >
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
