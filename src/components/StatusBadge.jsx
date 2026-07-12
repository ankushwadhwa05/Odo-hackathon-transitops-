const COLORS = {
  Available: 'bg-ok/20 text-ok border border-ok/40',
  'On Trip': 'bg-info/20 text-info border border-info/40',
  'In Shop': 'bg-warn/20 text-warn border border-warn/40',
  Retired: 'bg-danger/20 text-danger border border-danger/40',
  'Off Duty': 'bg-gray-600/20 text-gray-400 border border-gray-600/40',
  Suspended: 'bg-warn/20 text-warn border border-warn/40',
  Draft: 'bg-gray-600/20 text-gray-400 border border-gray-600/40',
  Dispatched: 'bg-info/20 text-info border border-info/40',
  Completed: 'bg-ok/20 text-ok border border-ok/40',
  Cancelled: 'bg-danger/20 text-danger border border-danger/40',
  Active: 'bg-warn/20 text-warn border border-warn/40'
};

export default function StatusBadge({ status }) {
  return (
    <span className={`badge ${COLORS[status] || 'bg-gray-600/20 text-gray-400'}`}>
      {status}
    </span>
  );
}
