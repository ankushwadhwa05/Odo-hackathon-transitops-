// Mirrors the Role-Based Access table in Settings & RBAC.
// 'edit' = full access, 'view' = read-only, 'none' = hidden.
export const RBAC = {
  FleetManager: { fleet: 'edit', drivers: 'edit', trips: 'none', fuel: 'none', analytics: 'edit' },
  Dispatcher: { fleet: 'view', drivers: 'none', trips: 'edit', fuel: 'none', analytics: 'none' },
  SafetyOfficer: { fleet: 'none', drivers: 'edit', trips: 'view', fuel: 'none', analytics: 'none' },
  FinancialAnalyst: { fleet: 'view', drivers: 'none', trips: 'none', fuel: 'edit', analytics: 'edit' }
};

export function access(role, module) {
  return RBAC[role]?.[module] || 'none';
}

export const ROLE_LABELS = {
  FleetManager: 'Fleet Manager',
  Dispatcher: 'Dispatcher',
  SafetyOfficer: 'Safety Officer',
  FinancialAnalyst: 'Financial Analyst'
};
