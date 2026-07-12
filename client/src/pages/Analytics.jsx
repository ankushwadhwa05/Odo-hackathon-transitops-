import { useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { access } from '../permissions.js';

export default function Analytics() {
  const { user } = useAuth();
  const canView = access(user.role, 'analytics') !== 'none';
  const [data, setData] = useState(null);

  useEffect(() => {
    if (canView) api.get('/analytics').then(res => setData(res.data));
  }, [canView]);

  function exportCsv() {
    if (!data) return;
    const rows = [
      ['Vehicle', 'Reg No', 'Cost', 'Revenue', 'ROI %'],
      ...data.perVehicle.map(v => [v.vehicle, v.regNo, v.cost, v.revenue, v.roi])
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transitops-analytics.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!canView) {
    return <div className="p-6 text-gray-500 text-sm">You don't have access to Reports & Analytics.</div>;
  }
  if (!data) return <div className="p-6 text-gray-500">Loading...</div>;

  const maxCost = Math.max(...data.topCostliestVehicles.map(v => v.cost), 1);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Reports & Analytics</h1>
        <button className="btn-primary" onClick={exportCsv}>Export CSV</button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="card">
          <div className="text-xs text-gray-500">FUEL EFFICIENCY</div>
          <div className="text-2xl font-semibold">{data.fuelEfficiency} km/l</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500">FLEET UTILIZATION</div>
          <div className="text-2xl font-semibold">{data.fleetUtilization}%</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500">OPERATIONAL COST</div>
          <div className="text-2xl font-semibold">{data.operationalCost}</div>
        </div>
        <div className="card">
          <div className="text-xs text-gray-500">VEHICLE ROI</div>
          <div className="text-2xl font-semibold">{data.vehicleRoi}%</div>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-6">ROI = (Revenue − (Maintenance + Fuel)) / Acquisition Cost</p>

      <div className="card">
        <div className="text-sm font-medium mb-3">Top Costliest Vehicles</div>
        <div className="space-y-2">
          {data.topCostliestVehicles.map(v => (
            <div key={v.regNo} className="flex items-center gap-3">
              <div className="w-20 text-xs text-gray-400">{v.vehicle}</div>
              <div className="flex-1 bg-border rounded h-3">
                <div
                  className="bg-accent h-3 rounded"
                  style={{ width: `${(v.cost / maxCost) * 100}%` }}
                />
              </div>
              <div className="text-xs text-gray-400 w-16 text-right">{v.cost}</div>
            </div>
          ))}
          {data.topCostliestVehicles.length === 0 && (
            <div className="text-gray-500 text-sm">No cost data yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
