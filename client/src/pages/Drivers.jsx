import { useEffect, useState } from 'react';
import api from '../api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { access } from '../permissions.js';

const EMPTY = { name: '', licenseNo: '', licenseCategory: 'LMV', licenseExpiry: '', contact: '' };
const STATUSES = ['Available', 'On Trip', 'Off Duty', 'Suspended'];

export default function Drivers() {
  const { user } = useAuth();
  const canEdit = access(user.role, 'drivers') === 'edit';

  const [drivers, setDrivers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);

  function load() {
    api.get('/drivers').then(res => setDrivers(res.data));
  }
  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    try {
      await api.post('/drivers', form);
      setForm(EMPTY);
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add driver');
    }
  }

  async function setStatus(id, status) {
    await api.put(`/drivers/${id}`, { status });
    load();
  }

  function isExpired(date) {
    return new Date(date) < new Date();
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-semibold">Drivers & Safety Profiles</h1>
        {canEdit && (
          <button className="btn-primary" onClick={() => setShowForm(s => !s)}>
            + Add Driver
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="card mb-6 grid grid-cols-2 md:grid-cols-3 gap-3">
          <input className="input" placeholder="Name" required
            value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="input" placeholder="License No." required
            value={form.licenseNo} onChange={e => setForm({ ...form, licenseNo: e.target.value })} />
          <select className="input" value={form.licenseCategory}
            onChange={e => setForm({ ...form, licenseCategory: e.target.value })}>
            <option>LMV</option>
            <option>HMV</option>
          </select>
          <input className="input" type="date" required
            value={form.licenseExpiry} onChange={e => setForm({ ...form, licenseExpiry: e.target.value })} />
          <input className="input" placeholder="Contact" required
            value={form.contact} onChange={e => setForm({ ...form, contact: e.target.value })} />
          {error && <div className="col-span-full text-danger text-xs">{error}</div>}
          <button className="btn-primary col-span-full md:col-span-1">Save Driver</button>
        </form>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-border">
              <th className="py-2">Driver</th>
              <th>License No.</th>
              <th>Category</th>
              <th>Expiry</th>
              <th>Contact</th>
              <th>Safety</th>
              <th>Status</th>
              {canEdit && <th>Toggle</th>}
            </tr>
          </thead>
          <tbody>
            {drivers.map(d => (
              <tr key={d._id} className="border-b border-border/50">
                <td className="py-2">{d.name}</td>
                <td>{d.licenseNo}</td>
                <td>{d.licenseCategory}</td>
                <td className={isExpired(d.licenseExpiry) ? 'text-danger' : ''}>
                  {new Date(d.licenseExpiry).toLocaleDateString()}
                  {isExpired(d.licenseExpiry) ? ' EXPIRED' : ''}
                </td>
                <td>{d.contact}</td>
                <td>{d.safetyScore}%</td>
                <td><StatusBadge status={d.status} /></td>
                {canEdit && (
                  <td>
                    <select
                      className="input py-1 text-xs"
                      value={d.status}
                      onChange={e => setStatus(d._id, e.target.value)}
                    >
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500 mt-2">
        Rule: Expired license or Suspended status → blocked from trip assignment
      </p>
    </div>
  );
}
