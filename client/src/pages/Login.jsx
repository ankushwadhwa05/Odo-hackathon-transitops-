import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const DEMO_ACCOUNTS = [
  { role: 'Fleet Manager', email: 'fleet@transitops.in' },
  { role: 'Dispatcher', email: 'dispatch@transitops.in' },
  { role: 'Safety Officer', email: 'safety@transitops.in' },
  { role: 'Financial Analyst', email: 'finance@transitops.in' }
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      <div className="w-1/2 bg-gray-200 text-black p-10 hidden md:block">
        <div className="text-xl font-semibold">TransitOps</div>
        <div className="text-sm text-gray-600 mb-10">Smart Transport Operations Platform</div>
        <div className="mt-16 text-sm">
          <div className="font-medium mb-2">One login, four roles:</div>
          <ul className="space-y-1 text-gray-700">
            <li>• Fleet Manager</li>
            <li>• Dispatcher</li>
            <li>• Safety Officer</li>
            <li>• Financial Analyst</li>
          </ul>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center bg-bg">
        <form onSubmit={handleSubmit} className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold mb-1">Sign in to your account</h1>
          <p className="text-sm text-gray-500 mb-6">Enter your credentials to continue</p>

          <label className="text-xs text-gray-500">EMAIL</label>
          <input
            className="input mb-4 mt-1"
            type="email"
            placeholder="you@transitops.in"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />

          <label className="text-xs text-gray-500">PASSWORD</label>
          <input
            className="input mb-2 mt-1"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
          />

          {error && (
            <div className="text-danger text-xs border border-danger/40 bg-danger/10 rounded p-2 my-3">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full mt-4">
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="mt-8 pt-4 border-t border-border text-xs text-gray-500">
            Demo accounts (password: password123)
            <div className="flex flex-col gap-1 mt-2">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  type="button"
                  key={acc.email}
                  onClick={() => { setEmail(acc.email); setPassword('password123'); }}
                  className="text-left text-gray-400 hover:text-accent"
                >
                  {acc.role} — {acc.email}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
