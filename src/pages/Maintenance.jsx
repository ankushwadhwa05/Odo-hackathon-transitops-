import { useEffect, useState } from 'react';
import api from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { access } from '../permissions.js';

const EMPTY = { vehicle: '', serviceType: '', cost: '', date: '' };

export default function Maintenance() {
  const { user } = useAuth();
  const canEdit = access(user.role, 'fleet') === 'edit';

  const [records, setRecords] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  function load() {
    api.get('/maintenance').then(res => setRecords(res.data));
    api.get('/vehicles').then(res => setVehicles(res.data));
  }
  useEffect(load, []);

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/maintenance', { ...form, cost: Number(form.cost) });
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save record');
    }
  }

  async function closeRecord(id) {
    await api.post(`/maintenance/${id}/complete`);
    load();
  }

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h1 className="text-lg font-semibold mb-4">Maintenance</h1>
        {canEdit && (
          <form onSubmit={handleSave} className="card space-y-3">
            <div className="text-sm font-medium mb-2">Log Service Record</div>
            <select className="input" required value={form.vehicle}
              onChange={e => setForm({ ...form, vehicle: e.target.value })}>
              <option value="">Vehicle</option>
              {vehicles.filter(v => v.status !== 'Retired').map(v => (
                <option key={v._id} value={v._id}>{v.name}</option>
              ))}
            </select>
            <input className="input" placeholder="Service Type (e.g. Oil Change)" required
              value={form.serviceType} onChange={e => setForm({ ...form, serviceType: e.target.value })} />
            <input className="input" type="number" placeholder="Cost" required
              value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
            <input className="input" type="date" required
              value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            {error && <div className="text-danger text-xs">{error}</div>}
            <button className="btn-primary w-full">Save</button>
          </form>
        )}
        <p className="text-xs text-gray-500 mt-3">
          Note: In Shop vehicles are removed from the dispatch pool. Closing a record restores the vehicle to Available (unless Retired).
        </p>
      </div>

      <div>
        <div className="text-sm font-medium mb-4 mt-1 lg:mt-10">Service Log</div>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b border-border">
                <th className="py-2">Vehicle</th>
                <th>Service</th>
                <th>Cost</th>
                <th>Status</th>
                {canEdit && <th></th>}
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r._id} className="border-b border-border/50">
                  <td className="py-2">{r.vehicle?.name}</td>
                  <td>{r.serviceType}</td>
                  <td>{r.cost}</td>
                  <td><StatusBadge status={r.status} /></td>
                  {canEdit && (
                    <td>
                      {r.status === 'Active' && (
                        <button onClick={() => closeRecord(r._id)} className="text-xs text-ok hover:underline">
                          Mark Completed
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={5} className="py-4 text-gray-500">No records yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
