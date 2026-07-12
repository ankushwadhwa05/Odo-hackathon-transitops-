import { RBAC, ROLE_LABELS } from '../permissions.js';

const MODULES = ['fleet', 'drivers', 'trips', 'fuel', 'analytics'];
const LABELS = { fleet: 'Fleet', drivers: 'Drivers', trips: 'Trips', fuel: 'Fuel/Exp.', analytics: 'Analytics' };
const SYMBOL = { edit: '✓', view: 'view', none: '—' };

export default function Settings() {
  return (
    <div className="p-6">
      <h1 className="text-lg font-semibold mb-6">Settings & RBAC</h1>

      <div className="card">
        <div className="text-sm font-medium mb-3">Role-Based Access (RBAC)</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-border">
              <th className="py-2">Role</th>
              {MODULES.map(m => <th key={m}>{LABELS[m]}</th>)}
            </tr>
          </thead>
          <tbody>
            {Object.entries(RBAC).map(([role, perms]) => (
              <tr key={role} className="border-b border-border/50">
                <td className="py-2">{ROLE_LABELS[role]}</td>
                {MODULES.map(m => <td key={m}>{SYMBOL[perms[m]]}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
