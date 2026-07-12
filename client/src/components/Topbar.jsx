import { useAuth } from '../context/AuthContext.jsx';
import { ROLE_LABELS } from '../permissions.js';

export default function Topbar() {
  const { user, logout } = useAuth();
  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || '?';

  return (
    <div className="flex items-center justify-between border-b border-border px-6 py-3">
      <input
        placeholder="Search..."
        className="input max-w-xs"
      />
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-400">{user?.name}</span>
        <span className="badge bg-info/20 text-info border border-info/40">
          {ROLE_LABELS[user?.role] || user?.role}
        </span>
        <div className="w-8 h-8 rounded-full bg-accent text-black flex items-center justify-center text-xs font-semibold">
          {initials}
        </div>
        <button onClick={logout} className="text-xs text-gray-500 hover:text-gray-300">
          Log out
        </button>
      </div>
    </div>
  );
}
