import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/equipos', label: 'Equipos' },
  { to: '/instalaciones', label: 'Instalaciones' },
  { to: '/operadores', label: 'Operadores' },
  { to: '/ordenes', label: 'Órdenes' },
  { to: '/tecnicos', label: 'Técnicos' },
];

export function Sidebar() {
  return (
    <aside className="flex w-64 flex-col border-r border-slate-200 bg-white px-4 py-6">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-500 text-lg font-bold text-white">
          TV
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Telecomunicaciones</p>
          <p className="text-xs text-slate-500">Panel de gestión</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 text-sm font-medium text-slate-700">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center rounded-md px-3 py-2 transition-colors hover:bg-slate-100 ${
                isActive ? 'bg-primary-50 text-primary-700 border border-primary-200' : 'text-slate-700'
              }`
            }
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-6 border-t border-slate-200 pt-4 text-xs text-slate-400">
        © {new Date().getFullYear()} Telecomunicaciones Valencia
      </div>
    </aside>
  );
}
