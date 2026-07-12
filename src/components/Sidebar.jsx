import { NavLink } from 'react-router-dom';
import { access } from '../permissions.js';

const ITEMS = [
  { to: '/', label: 'Dashboard', module: null },
  { to: '/fleet', label: 'Fleet', module: 'fleet' },
  { to: '/drivers', label: 'Drivers', module: 'drivers' },
  { to: '/trips', label: 'Trips', module: 'trips' },
  { to: '/maintenance', label: 'Maintenance', module: 'fleet' },
  { to: '/fuel', label: 'Fuel & Expenses', module: 'fuel' },
  { to: '/analytics', label: 'Analytics', module: 'analytics' },
  { to: '/settings', label: 'Settings', module: null }
];

export default function Sidebar({ role }) {
  return (
    <div className="w-56 shrink-0 border-r border-border bg-panel min-h-screen p-4">
      <div className="text-lg font-semibold mb-8">TransitOps</div>
      <nav className="flex flex-col gap-1">
        {ITEMS.filter(i => !i.module || access(role, i.module) !== 'none').map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `px-3 py-2 rounded text-sm ${
                isActive ? 'border border-accent text-accent' : 'text-gray-400 hover:text-gray-200'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
