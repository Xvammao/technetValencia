import { useNavigate } from 'react-router-dom';

export function Topbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/login');
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-800 bg-slate-950/70 px-6 backdrop-blur">
      <div>
        <h1 className="text-lg font-semibold text-slate-50">Panel de Gestión</h1>
        <p className="text-xs text-slate-400">Supervisión centralizada de equipos e instalaciones</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right text-xs">
          <p className="font-medium text-slate-100">Operador</p>
          <p className="text-slate-400">Sesión activa</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded border border-slate-700 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 hover:text-white"
        >
          Salir
        </button>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-500 text-sm font-semibold text-white">
          OP
        </div>
      </div>
    </header>
  );
}
