import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Sidebar } from './Sidebar';

export function ProtectedLayout() {
  const token = useAuthStore((s) => s.token);
  const loc = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: loc }} replace />;
  }

  return (
    <div className="flex h-full min-h-0">
      <Sidebar />
      <main className="min-w-0 flex-1 flex flex-col min-h-0">
        <Outlet />
      </main>
    </div>
  );
}
