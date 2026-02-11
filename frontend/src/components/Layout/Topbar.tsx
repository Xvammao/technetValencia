import { useNavigate } from 'react-router-dom';

export function Topbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    navigate('/login');
  };

  return (
    <header className="flex h-14 items-center justify-between border-b border-slate-200 bg-white px-6">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">Panel de Gestión</h1>
        <p className="text-xs text-slate-500">Supervisión centralizada de equipos e instalaciones</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-right text-xs">
          <p className="font-medium text-slate-800">Operador</p>
          <p className="text-slate-500">Sesión activa</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
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
