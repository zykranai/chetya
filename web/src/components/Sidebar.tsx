import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
    </svg>
  );
}

const baseNav =
  'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors duration-200 ease-out';
const activeNav = 'bg-white/[0.08] text-chetya-cream shadow-sm ring-1 ring-white/[0.06]';
const idleNav = 'text-chetya-muted hover:bg-white/[0.04] hover:text-chetya-cream';

type SidebarProps = {
  onNavigate?: () => void;
};

export function Sidebar({ onNavigate }: SidebarProps) {
  const logout = useAuthStore((s) => s.logout);
  const email = useAuthStore((s) => s.email);
  const initial = email?.trim()?.charAt(0)?.toUpperCase() ?? '?';

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-chetya-border/80 bg-chetya-surface">
      <div className="border-b border-chetya-border/60 px-4 pb-4 pt-5">
        <div className="flex items-center gap-3">
          <img
            src="/logo.svg"
            alt=""
            width={40}
            height={40}
            className="h-10 w-10 shrink-0 rounded-xl shadow-sm ring-1 ring-white/[0.08]"
            decoding="async"
          />
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold tracking-tight text-chetya-cream">Chetya</div>
            <p className="truncate text-xs text-chetya-muted">Not your kundli. Your life.</p>
          </div>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-3">
        <NavLink
          to="/chat"
          onClick={() => onNavigate?.()}
          className={({ isActive }) => `${baseNav} ${isActive ? activeNav : idleNav}`}
        >
          {({ isActive }) => (
            <>
              <ChatIcon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-chetya-gold' : 'text-chetya-muted group-hover:text-chetya-cream'}`} />
              <span>Talk to Guru</span>
            </>
          )}
        </NavLink>
        <NavLink
          to="/reading"
          onClick={() => onNavigate?.()}
          className={({ isActive }) => `${baseNav} ${isActive ? activeNav : idleNav}`}
        >
          {({ isActive }) => (
            <>
              <ChartIcon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-chetya-gold' : 'text-chetya-muted group-hover:text-chetya-cream'}`} />
              <span>Birth chart reading</span>
            </>
          )}
        </NavLink>
      </nav>
      <div className="border-t border-chetya-border/60 p-3">
        <div className="mb-2 flex items-center gap-2 rounded-xl px-2 py-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-chetya-border/60 text-xs font-medium text-chetya-cream">
            {initial}
          </div>
          <p className="min-w-0 flex-1 truncate text-xs text-chetya-muted">{email}</p>
        </div>
        <button
          type="button"
          onClick={() => logout()}
          className="w-full rounded-xl px-3 py-2.5 text-left text-sm text-chetya-muted transition-colors duration-200 hover:bg-white/[0.05] hover:text-chetya-cream"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
