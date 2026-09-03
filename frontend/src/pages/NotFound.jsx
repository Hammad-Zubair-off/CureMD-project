import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 px-6 text-center">
            <Compass className="w-12 h-12 text-slate-400 mb-6" />
            <p className="text-6xl font-black text-slate-900">404</p>
            <h1 className="mt-3 text-xl font-bold text-slate-700">Page not found</h1>
            <p className="mt-2 text-sm text-slate-500 max-w-sm">
                The page you're looking for doesn't exist or has moved.
            </p>
            <Link
                to="/"
                className="mt-8 inline-flex items-center rounded-lg bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
            >
                Back to home
            </Link>
        </div>
    );
}
