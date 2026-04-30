import { NavLink } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `block rounded-lg px-3 py-2 text-sm transition-colors ${
    isActive
      ? 'bg-chetya-border/80 text-chetya-cream'
      : 'text-chetya-muted hover:bg-chetya-border/40 hover:text-chetya-cream'
  }`;

export function Sidebar() {
  const logout = useAuthStore((s) => s.logout);
  const email = useAuthStore((s) => s.email);

  return (
    <aside className="flex w-60 flex-col border-r border-chetya-border bg-chetya-panel">
      <div className="border-b border-chetya-border px-4 py-5">
        <div className="font-semibold text-chetya-cream">Chetya</div>
        <p className="mt-1 truncate text-xs text-chetya-muted">{email}</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        <NavLink to="/chat" className={linkClass}>
          Talk to Guru
        </NavLink>
        <NavLink to="/reading" className={linkClass}>
          Birth chart reading
        </NavLink>
      </nav>
      <div className="border-t border-chetya-border p-3">
        <button
          type="button"
          onClick={() => logout()}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-chetya-muted hover:bg-chetya-border/40 hover:text-chetya-cream"
        >
          Log out
        </button>
      </div>
    </aside>
  );
}
