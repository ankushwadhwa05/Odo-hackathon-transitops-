import { useEffect, useState } from 'react';
import api from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { access } from '../permissions.js';

export default function FuelExpenses() {
  const { user } = useAuth();
  const canEdit = access(user.role, 'fuel') === 'edit';

  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [totalCost, setTotalCost] = useState(0);
  const [fuelForm, setFuelForm] = useState({ vehicle: '', date: '', liters: '', cost: '' });
  const [showFuelForm, setShowFuelForm] = useState(false);

  function load() {
    api.get('/fuel/logs').then(res => setLogs(res.data));
    api.get('/vehicles').then(res => setVehicles(res.data));
    api.get('/fuel/operational-cost').then(res => setTotalCost(res.data.total));
  }
  useEffect(load, []);

  async function addFuelLog(e) {
    e.preventDefault();
    await api.post('/fuel/logs', { ...fuelForm, liters: Number(fuelForm.liters), cost: Number(fuelForm.cost) });
    setFuelForm({ vehicle: '', date: '', liters: '', cost: '' });
    setShowFuelForm(false);
    load();
  }

  if (!canEdit) {
    return <div className="p-6 text-gray-500 text-sm">You don't have access to Fuel & Expense Management.</div>;
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Fuel & Expense Management</h1>
        <button className="btn-primary" onClick={() => setShowFuelForm(s => !s)}>+ Log Fuel</button>
      </div>

      {showFuelForm && (
        <form onSubmit={addFuelLog} className="card mb-6 grid grid-cols-2 md:grid-cols-4 gap-3">
          <select className="input" required value={fuelForm.vehicle}
            onChange={e => setFuelForm({ ...fuelForm, vehicle: e.target.value })}>
            <option value="">Vehicle</option>
            {vehicles.map(v => <option key={v._id} value={v._id}>{v.name}</option>)}
          </select>
          <input className="input" type="date" required
            value={fuelForm.date} onChange={e => setFuelForm({ ...fuelForm, date: e.target.value })} />
          <input className="input" type="number" placeholder="Liters" required
            value={fuelForm.liters} onChange={e => setFuelForm({ ...fuelForm, liters: e.target.value })} />
          <input className="input" type="number" placeholder="Fuel Cost" required
            value={fuelForm.cost} onChange={e => setFuelForm({ ...fuelForm, cost: e.target.value })} />
          <button className="btn-primary col-span-full md:col-span-1">Save</button>
        </form>
      )}

      <div className="card mb-6 overflow-x-auto">
        <div className="text-sm font-medium mb-3">Fuel Logs</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-border">
              <th className="py-2">Vehicle</th>
              <th>Date</th>
              <th>Liters</th>
              <th>Fuel Cost</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(l => (
              <tr key={l._id} className="border-b border-border/50">
                <td className="py-2">{l.vehicle?.name}</td>
                <td>{new Date(l.date).toLocaleDateString()}</td>
                <td>{l.liters} L</td>
                <td>{l.cost}</td>
              </tr>
            ))}
            {logs.length === 0 && <tr><td colSpan={4} className="py-4 text-gray-500">No fuel logs yet.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="card">
        <span className="text-sm text-gray-400">TOTAL OPERATIONAL COST (AUTO) = FUEL + MAINT</span>
        <div className="text-2xl font-semibold text-accent mt-1">{totalCost}</div>
      </div>
    </div>
  );
}
