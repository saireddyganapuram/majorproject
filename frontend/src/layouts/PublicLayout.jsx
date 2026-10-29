import { Outlet } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';

/**
 * PublicLayout — used for login, register, and other unauthenticated pages.
 * Features a centered card layout with branding.
 */
export default function PublicLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-950 via-primary-900 to-surface-900 flex flex-col items-center justify-center px-4 py-8">
      {/* Branding */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 bg-primary-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/25">
          <GraduationCap className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Virtual Classroom
          </h1>
          <p className="text-primary-300 text-sm">
            Engagement Analytics System
          </p>
        </div>
      </div>

      {/* Content card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl shadow-black/20 p-8">
        <Outlet />
      </div>

      {/* Footer */}
      <p className="mt-8 text-primary-400 text-xs">
        &copy; {new Date().getFullYear()} Virtual Classroom AI. All rights reserved.
      </p>
    </div>
  );
}
