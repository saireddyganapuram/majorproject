import { Link } from 'react-router-dom';
import { ShieldX } from 'lucide-react';

/**
 * 403 Unauthorized / Forbidden page.
 */
export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center px-4">
      <div className="text-center">
        <ShieldX className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h1 className="text-4xl font-bold text-surface-800 mb-2">Access Denied</h1>
        <p className="text-surface-500 mb-6">
          You don&apos;t have permission to access this page.
        </p>
        <p className="text-surface-400 mb-8 max-w-md">
          If you believe this is an error, contact your administrator.
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
