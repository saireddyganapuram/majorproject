import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

/**
 * 404 Not Found page.
 */
export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4">
      <div className="text-center">
        <FileQuestion className="w-16 h-16 text-surface-300 mx-auto mb-4" />
        <h1 className="text-6xl font-bold text-surface-800 mb-2">404</h1>
        <p className="text-xl text-surface-500 mb-6">Page not found</p>
        <p className="text-surface-400 mb-8 max-w-md">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700
                     text-white rounded-lg text-sm font-medium transition-base"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
