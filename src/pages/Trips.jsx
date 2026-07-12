import { useEffect, useState } from 'react';
import api from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { access } from '../permissions.js';

const EMPTY = { source: '', destination: '', vehicle: '', driver: '', cargoWeight: '', plannedDistance: '', revenue: '' };

export default function Trips() {
  const { user } = useAuth();
  const canEdit = access(user.role, 'trips') === 'edit';

  const [trips, setTrips] = useState([]);
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [availableDrivers, setAvailableDrivers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');

  function load() {
    api.get('/trips').then(res => setTrips(res.data));
    api.get('/vehicles/available').then(res => setAvailableVehicles(res.data));
    api.get('/drivers/available').then(res => setAvailableDrivers(res.data));
  }
  useEffect(load, []);

  const selectedVehicle = availableVehicles.find(v => v._id === form.vehicle);
  const cargoExceeds = selectedVehicle && Number(form.cargoWeight) > selectedVehicle.capacity;

  async function handleCreate(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/trips', {
        ...form,
        cargoWeight: Number(form.cargoWeight),
        plannedDistance: Number(form.plannedDistance),
        revenue: Number(form.revenue) || 0
      });
      setForm(EMPTY);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create trip');
    }
  }

  async function dispatch(id) {
    try {
      await api.post(`/trips/${id}/dispatch`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dispatch');
    }
  }

  async function complete(id) {
    const finalOdometer = prompt('Final odometer reading:');
    const fuelConsumed = prompt('Fuel consumed (liters):');
    if (!finalOdometer || !fuelConsumed) return;
    try {
      await api.post(`/trips/${id}/complete`, {
        finalOdometer: Number(finalOdometer),
        fuelConsumed: Number(fuelConsumed)
      });
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to complete');
    }
  }

  async function cancel(id) {
    try {
      await api.post(`/trips/${id}/cancel`);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel');
    }
  }

  return (
    <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div>
        <h1 className="text-lg font-semibold mb-4">Trip Dispatcher</h1>
        {canEdit && (
          <form onSubmit={handleCreate} className="card space-y-3">
            <div className="text-sm font-medium mb-2">Create Trip</div>
            <input className="input" placeholder="Source" required
              value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
            <input className="input" placeholder="Destination" required
              value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} />

            <select className="input" required value={form.vehicle}
              onChange={e => setForm({ ...form, vehicle: e.target.value })}>
              <option value="">Vehicle (available only)</option>
              {availableVehicles.map(v => (
                <option key={v._id} value={v._id}>{v.name} — {v.capacity} kg capacity</option>
              ))}
            </select>

            <select className="input" required value={form.driver}
              onChange={e => setForm({ ...form, driver: e.target.value })}>
              <option value="">Driver (available only)</option>
              {availableDrivers.map(d => (
                <option key={d._id} value={d._id}>{d.name}</option>
              ))}
            </select>

            <input className="input" type="number" placeholder="Cargo Weight (kg)" required
              value={form.cargoWeight} onChange={e => setForm({ ...form, cargoWeight: e.target.value })} />
            <input className="input" type="number" placeholder="Planned Distance (km)" required
              value={form.plannedDistance} onChange={e => setForm({ ...form, plannedDistance: e.target.value })} />
            <input className="input" type="number" placeholder="Expected Revenue (optional)"
              value={form.revenue} onChange={e => setForm({ ...form, revenue: e.target.value })} />

            {cargoExceeds && (
              <div className="text-danger text-xs border border-danger/40 bg-danger/10 rounded p-2">
                Vehicle Capacity: {selectedVehicle.capacity} kg · Cargo Weight: {form.cargoWeight} kg<br />
                Capacity exceeded by {Number(form.cargoWeight) - selectedVehicle.capacity} kg — dispatch blocked
              </div>
            )}
            {error && <div className="text-danger text-xs">{error}</div>}

            <button className="btn-primary w-full" disabled={cargoExceeds}>
              Create Trip (Draft)
            </button>
          </form>
        )}
      </div>

      <div>
        <div className="text-sm font-medium mb-4 mt-1 lg:mt-10">Live Board</div>
        <div className="space-y-3">
          {trips.map(t => (
            <div key={t._id} className="card">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-medium text-sm">{t.source} → {t.destination}</div>
                  <div className="text-xs text-gray-500">
                    {t.vehicle?.name || 'Unassigned'} / {t.driver?.name || '—'}
                  </div>
                </div>
                <StatusBadge status={t.status} />
              </div>
              {canEdit && (
                <div className="flex gap-3 mt-3 text-xs">
                  {t.status === 'Draft' && (
                    <>
                      <button onClick={() => dispatch(t._id)} className="text-accent hover:underline">Dispatch</button>
                      <button onClick={() => cancel(t._id)} className="text-danger hover:underline">Cancel</button>
                    </>
                  )}
                  {t.status === 'Dispatched' && (
                    <>
                      <button onClick={() => complete(t._id)} className="text-ok hover:underline">Complete</button>
                      <button onClick={() => cancel(t._id)} className="text-danger hover:underline">Cancel</button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
          {trips.length === 0 && <div className="text-gray-500 text-sm">No trips yet.</div>}
        </div>
      </div>
    </div>
  );
}
