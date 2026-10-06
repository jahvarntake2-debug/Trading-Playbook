import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component<React.PropsWithChildren, { hasError: boolean }> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-slate-100">
          <div className="max-w-lg rounded-3xl border border-rose-500/40 bg-slate-900 p-8 text-center shadow-soft">
            <p className="text-sm uppercase tracking-[0.3em] text-rose-300">App Error</p>
            <h1 className="mt-4 text-2xl font-semibold text-white">Something went wrong</h1>
            <p className="mt-3 text-slate-300">
              The trading journal hit a runtime error. Refresh the page to try again.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
);
