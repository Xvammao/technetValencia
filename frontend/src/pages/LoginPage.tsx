import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const baseApiUrl = import.meta.env.VITE_API_URL || '/api';
      // El endpoint de login de Djoser está bajo /token/token/login/ en el backend
      const loginUrl = baseApiUrl.replace(/\/?api\/?$/, '') + '/token/token/login/';

      const response = await axios.post(loginUrl, {
        username,
        password,
      });

      const token = response.data.auth_token;
      localStorage.setItem('auth_token', token);

      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const detail = (err.response?.data as any)?.detail;

        if (status === 400 || status === 401) {
          setError(detail || 'Credenciales inválidas. Comprueba usuario y contraseña.');
        } else if (!err.response) {
          setError('No se pudo conectar con el servidor. Revisa que el backend esté levantado en 127.0.0.1:8000.');
        } else {
          setError('Error al iniciar sesión. Código: ' + status);
        }
      } else {
        setError('Error inesperado al iniciar sesión.');
      }
      console.error('Login error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 bg-gradient-to-br from-slate-900 via-slate-950 to-sky-950 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950/90 p-6 shadow-xl shadow-sky-900/20 backdrop-blur">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-600 text-lg font-bold text-white shadow-lg shadow-sky-900/40">
            TN
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-50">Technet</h1>
            <p className="text-[11px] uppercase tracking-wide text-slate-400">Panel de gestión de telecomunicaciones</p>
          </div>
        </div>

        <h2 className="mb-2 text-base font-semibold text-slate-100">Iniciar sesión</h2>
        <p className="mb-4 text-xs text-slate-400">
          Introduce tus credenciales para acceder al panel de control.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300" htmlFor="username">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-300" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              className="w-full rounded-md border border-slate-700 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 shadow-inner shadow-slate-950 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="rounded border border-red-700/60 bg-red-950/40 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-md bg-sky-600 px-4 py-2.5 text-sm font-medium text-slate-50 shadow-md shadow-sky-900/40 transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Entrando...' : 'Acceder al panel'}
            </button>
          </div>

          <p className="pt-1 text-center text-[11px] text-slate-500">
            © {new Date().getFullYear()} Technet. Acceso restringido a personal autorizado.
          </p>
        </form>
      </div>
    </div>
  );
};
