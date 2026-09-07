import { Component } from 'react';

/**
 * Top-level error boundary. A render-time throw anywhere below this shows a
 * recoverable fallback instead of a blank white screen.
 */
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        // eslint-disable-next-line no-console
        console.error('[ErrorBoundary]', error, info?.componentStack);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.assign('/');
    };

    render() {
        if (!this.state.hasError) return this.props.children;
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
                <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center">
                    <h1 className="text-lg font-semibold text-slate-900 mb-2">Something went wrong</h1>
                    <p className="text-sm text-slate-500 mb-6">
                        This page hit an unexpected error. Reloading usually fixes it.
                    </p>
                    <button
                        onClick={this.handleReload}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-all"
                    >
                        Reload the app
                    </button>
                </div>
            </div>
        );
    }
}
