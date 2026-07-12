import { useEffect, useState } from 'react';
import api from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { access } from '../permissions.js';

const EMPTY = { regNo: '', name: '', type: 'Van', capacity: '', odometer: '', acquisitionCost: '' };

export default function Fleet() {
  const { user } = useAuth();
  const canEdit = access(user.role, 'fleet') === 'edit';

  const [vehicles, setVehicles] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  function load() {
    api.get('/vehicles').then(res => setVehicles(res.data));
  }

  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/vehicles', {
        ...form,
        capacity: Number(form.capacity),
        odometer: Number(form.odometer) || 0,
        acquisitionCost: Number(form.acquisitionCost)
      });
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add vehicle');
    }
  }

  async function retire(id) {
    await api.delete(`/vehicles/${id}`);
    load();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Vehicle Registry</h1>
        {canEdit && (
          <button className="btn-primary" onClick={() => setShowForm(s => !s)}>
            + Add Vehicle
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="card mb-6 grid grid-cols-2 md:grid-cols-3 gap-3">
          <input className="input" placeholder="Registration No." required
            value={form.regNo} onChange={e => setForm({ ...form, regNo: e.target.value })} />
          <input className="input" placeholder="Name / Model" required
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
            <option>Van</option>
            <option>Truck</option>
            <option>Mini</option>
          </select>
          <input className="input" type="number" placeholder="Capacity (kg)" required
            value={form.capacity} onChange={e => setForm({ ...form, capacity: e.target.value })} />
          <input className="input" type="number" placeholder="Odometer"
            value={form.odometer} onChange={e => setForm({ ...form, odometer: e.target.value })} />
          <input className="input" type="number" placeholder="Acquisition Cost" required
            value={form.acquisitionCost} onChange={e => setForm({ ...form, acquisitionCost: e.target.value })} />
          {error && <div className="col-span-full text-danger text-xs">{error}</div>}
          <button className="btn-primary col-span-full md:col-span-1">Save Vehicle</button>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-border">
              <th className="py-2">Reg. No.</th>
              <th>Name/Model</th>
              <th>Type</th>
              <th>Capacity</th>
              <th>Odometer</th>
              <th>Acq. Cost</th>
              <th>Status</th>
              {canEdit && <th></th>}
            </tr>
          </thead>
          <tbody>
            {vehicles.map(v => (
              <tr key={v._id} className="border-b border-border/50">
                <td className="py-2">{v.regNo}</td>
                <td>{v.name}</td>
                <td>{v.type}</td>
                <td>{v.capacity} kg</td>
                <td>{v.odometer}</td>
                <td>{v.acquisitionCost}</td>
                <td><StatusBadge status={v.status} /></td>
                {canEdit && (
                  <td>
                    {v.status !== 'Retired' && (
                      <button onClick={() => retire(v._id)} className="text-xs text-danger hover:underline">
                        Retire
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Rule: Registration No. must be unique · Retired/In Shop vehicles are hidden from Trip Dispatcher
      </p>
    </div>
  );
}
