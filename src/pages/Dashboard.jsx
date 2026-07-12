import { useEffect, useState } from 'react';
import api from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';

export default function Dashboard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard').then(res => setData(res.data));
  }, []);

  if (!data) return <div className="p-6 text-gray-500">Loading...</div>;

  const kpis = [
    { label: 'Active Vehicles', value: data.activeVehicles },
    { label: 'Available Vehicles', value: data.availableVehicles },
    { label: 'Vehicles in Maintenance', value: data.vehiclesInMaintenance },
    { label: 'Active Trips', value: data.activeTrips },
    { label: 'Pending Trips', value: data.pendingTrips },
    { label: 'Drivers on Duty', value: data.driversOnDuty },
    { label: 'Fleet Utilization', value: `${data.fleetUtilization}%` }
  ];

  return (
    <div className="p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-6">
        {kpis.map(k => (
          <div key={k.label} className="card">
            <div className="text-xs text-gray-500 mb-1">{k.label.toUpperCase()}</div>
            <div className="text-2xl font-semibold">{k.value}</div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="text-sm font-medium mb-3">Recent Trips</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-border">
              <th className="py-2">Trip</th>
              <th>Vehicle</th>
              <th>Driver</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {data.recentTrips.map(t => (
              <tr key={t._id} className="border-b border-border/50">
                <td className="py-2">{t.source} → {t.destination}</td>
                <td>{t.vehicle?.name || '—'}</td>
                <td>{t.driver?.name || '—'}</td>
                <td><StatusBadge status={t.status} /></td>
              </tr>
            ))}
            {data.recentTrips.length === 0 && (
              <tr><td colSpan={4} className="py-4 text-gray-500">No trips yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
