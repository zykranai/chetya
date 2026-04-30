import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { Sidebar } from './Sidebar';

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  );
}

export function ProtectedLayout() {
  const token = useAuthStore((s) => s.token);
  const loc = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [loc.pathname]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [mobileNavOpen]);

  if (!token) {
    return <Navigate to="/" state={{ from: loc }} replace />;
  }

  return (
    <div className="relative flex h-full min-h-0 bg-chetya-bg">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[min(288px,92vw)] transition-transform duration-300 ease-out md:hidden ${
          mobileNavOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
        aria-hidden={!mobileNavOpen}
      >
        <Sidebar onNavigate={() => setMobileNavOpen(false)} />
      </div>

      {mobileNavOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px] transition-opacity md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <header className="flex h-12 shrink-0 items-center gap-3 border-b border-chetya-border/80 bg-chetya-bg/90 px-3 backdrop-blur-md md:hidden">
          <button
            type="button"
            onClick={() => setMobileNavOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-chetya-cream transition-colors hover:bg-white/[0.06]"
            aria-expanded={mobileNavOpen}
            aria-label={mobileNavOpen ? 'Close menu' : 'Open menu'}
          >
            <MenuIcon className="h-5 w-5" />
          </button>
          <span className="font-semibold tracking-tight text-chetya-cream">Chetya</span>
        </header>

        <main className="min-h-0 min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
