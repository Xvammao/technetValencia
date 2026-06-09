import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

interface Metrics {
  equipos: number;
  instalaciones: number;
  operadores: number;
  ordenes: number;
  tecnicos: number;
}

interface EquipoResumen {
  numero_serie_equipo: string;
}

interface InstalacionResumen {
  numero_serie_equipo: string;
  nombre_tecnico: string;
  tipo_orden: string | null;
  fecha_cierre: string | null;
}

interface OrdenResumen {
  tipo_orden: string;
  valor_orden_tecnico: string | null;
  valor_orden_empresa: string | null;
}

interface TecnicoTotal {
  nombre: string;
  totalTec: number;
}

// Devuelve "YYYY-MM" del mes actual
const currentYearMonth = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tecnicoTotals, setTecnicoTotals] = useState<TecnicoTotal[]>([]);
  const [totalEmpresa, setTotalEmpresa] = useState<number>(0);
  const [instalacionesMes, setInstalacionesMes] = useState<number>(0);

  // Filtro mes: "YYYY-MM"
  const [mesFiltro, setMesFiltro] = useState<string>(currentYearMonth());

  // Todos los datos crudos para recalcular al cambiar el mes sin volver a hacer fetch
  const [allInstalaciones, setAllInstalaciones] = useState<InstalacionResumen[]>([]);
  const [allOrdenes, setAllOrdenes] = useState<OrdenResumen[]>([]);

  const parseMonto = (valor: string | null): number => {
    if (!valor) return 0;
    const limpio = valor
      .replace(/[^0-9,.-]/g, '')
      .replace(/\.(?=\d{3}(?:\D|$))/g, '')
      .replace(',', '.');
    const n = parseFloat(limpio);
    return isNaN(n) ? 0 : n;
  };

  // Recalcula métricas dependientes del mes cada vez que cambia el filtro o los datos
  useEffect(() => {
    if (allInstalaciones.length === 0 && allOrdenes.length === 0) return;

    const [year, month] = mesFiltro.split('-').map(Number);

    const instDelMes = allInstalaciones.filter((inst) => {
      if (!inst.fecha_cierre) return false;
      const d = new Date(inst.fecha_cierre);
      return d.getFullYear() === year && d.getMonth() + 1 === month;
    });

    setInstalacionesMes(instDelMes.length);

    let acumuladoEmpresa = 0;

    const totalsMap = instDelMes.reduce<Record<string, number>>((acc, inst) => {
      const nombre = (inst.nombre_tecnico || '').trim();
      const tipoOrden = inst.tipo_orden?.trim();
      if (!nombre || !tipoOrden) return acc;

      const orden = allOrdenes.find((o) => o.tipo_orden === tipoOrden);
      if (!orden) return acc;

      const montoTec = parseMonto(orden.valor_orden_tecnico);
      const montoEmp = parseMonto(orden.valor_orden_empresa);
      if (!acc[nombre]) acc[nombre] = 0;
      acc[nombre] += montoTec;
      acumuladoEmpresa += montoEmp;
      return acc;
    }, {});

    const totalsList = Object.entries(totalsMap)
      .map(([nombre, totalTec]) => ({ nombre, totalTec }))
      .sort((a, b) => b.totalTec - a.totalTec)
      .slice(0, 10);

    setTecnicoTotals(totalsList);
    setTotalEmpresa(acumuladoEmpresa);
  }, [mesFiltro, allInstalaciones, allOrdenes]);

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      setError(null);
      try {
        const [equiposRes, instRes, opRes, ordRes, tecRes] = await Promise.all([
          api.get('/equipos/'),
          api.get('/instalaciones/'),
          api.get('/operador/'),
          api.get('/ordenes/'),
          api.get('/tecnicos/'),
        ]);

        const getCount = (res: any) => {
          const data = res.data?.results ?? res.data;
          return Array.isArray(data) ? data.length : 0;
        };

        const instalacionesData = (instRes.data?.results ?? instRes.data) as InstalacionResumen[];
        const ordenesData = (ordRes.data?.results ?? ordRes.data) as OrdenResumen[];
        const equiposData = (equiposRes.data?.results ?? equiposRes.data) as EquipoResumen[];

        // Equipos en stock: los que NO tienen su serie en ninguna instalación
        // Normalizar quitando sufijos _DUPLI que se generan en la importación
        const seriesInstSet = new Set(
          instalacionesData.map((i) => {
            const raw = (i.numero_serie_equipo ?? '').trim();
            // Quitar sufijo _DUPLI<n> si existe
            return raw.replace(/_DUPLI\d+$/i, '').toLowerCase();
          })
        );
        const enStock = equiposData.filter(
          (eq) =>
            !eq.numero_serie_equipo ||
            !seriesInstSet.has(eq.numero_serie_equipo.toLowerCase().trim())
        ).length;

        setMetrics({
          equipos: enStock,
          instalaciones: getCount(instRes),
          operadores: getCount(opRes),
          ordenes: getCount(ordRes),
          tecnicos: getCount(tecRes),
        });

        setAllInstalaciones(instalacionesData);
        setAllOrdenes(ordenesData);
      } catch (err) {
        console.error('Error cargando métricas del dashboard', err);
        setError('No se pudieron cargar las métricas generales.');
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, []);

  // Etiqueta legible del mes seleccionado
  const mesLabel = (() => {
    const [year, month] = mesFiltro.split('-').map(Number);
    const d = new Date(year, month - 1, 1);
    return d.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
  })();

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Resumen general del estado de equipos, instalaciones, órdenes y personal técnico.
          </p>
        </div>

        {/* Selector de mes */}
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-600 whitespace-nowrap">
            Mes de análisis
          </label>
          <input
            type="month"
            value={mesFiltro}
            onChange={(e) => setMesFiltro(e.target.value)}
            className="rounded border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
          <button
            type="button"
            onClick={() => setMesFiltro(currentYearMonth())}
            className="rounded border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-50"
            title="Ir al mes actual"
          >
            Hoy
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Equipos en stock"
          value={metrics?.equipos}
          loading={loading}
          accent="from-sky-500/20 to-sky-500/5"
        />
        <MetricCard
          title="Instalaciones totales"
          value={metrics?.instalaciones}
          loading={loading}
          accent="from-emerald-500/20 to-emerald-500/5"
        />
        <MetricCard
          title="Operadores"
          value={metrics?.operadores}
          loading={loading}
          accent="from-violet-500/20 to-violet-500/5"
        />
        <MetricCard
          title="Órdenes"
          value={metrics?.ordenes}
          loading={loading}
          accent="from-amber-500/20 to-amber-500/5"
        />
        <MetricCard
          title="Técnicos"
          value={metrics?.tecnicos}
          loading={loading}
          accent="from-rose-500/20 to-rose-500/5"
        />
      </div>

      {/* Tarjeta de instalaciones del mes */}
      {!loading && (
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-sky-100 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-sky-600">
              Instalaciones en {mesLabel}
            </p>
            <p className="mt-1 text-2xl font-semibold text-sky-700">{instalacionesMes}</p>
            <p className="mt-1 text-[11px] text-sky-600/80">
              Instalaciones con fecha de cierre en el mes seleccionado.
            </p>
          </div>

          <div className="rounded-lg border border-emerald-100 bg-white p-4 shadow-sm md:col-span-2">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-600">
              Ganancia Technet en {mesLabel}
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-700">
              ${totalEmpresa.toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="mt-1 text-[11px] text-emerald-600/80">
              Suma de todos los valores de la orden para la empresa en el mes seleccionado.
            </p>
          </div>
        </div>
      )}

      {!loading && metrics && (
        <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-800">Resumen rápido</h2>
          <p className="text-xs text-slate-600">
            Actualmente se gestionan <span className="font-semibold text-slate-900">{metrics.equipos}</span> equipos en stock,
            distribuidos en <span className="font-semibold text-slate-900">{metrics.instalaciones}</span> instalaciones
            totales, atendidos por <span className="font-semibold text-slate-900">{metrics.tecnicos}</span> técnicos y
            coordinados con <span className="font-semibold text-slate-900">{metrics.operadores}</span> operadores.
          </p>
        </div>
      )}

      {!loading && tecnicoTotals.length > 0 && (
        <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">
            Total técnico por técnico en {mesLabel} (Top 10)
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            {tecnicoTotals.map((tec) => (
              <div
                key={tec.nombre}
                className="flex items-center justify-between rounded border border-slate-200 bg-slate-50 px-3 py-2 text-xs"
              >
                <span className="font-medium text-slate-800 mr-3 line-clamp-1">{tec.nombre}</span>
                <span className="text-emerald-600 font-semibold whitespace-nowrap">
                  ${tec.totalTec.toLocaleString('es-ES', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && tecnicoTotals.length === 0 && allInstalaciones.length > 0 && (
        <div className="rounded border border-slate-200 bg-white p-4 shadow-sm text-center text-xs text-slate-500">
          No hay instalaciones con fecha de cierre en {mesLabel}.
        </div>
      )}
    </div>
  );
};

interface MetricCardProps {
  title: string;
  value: number | undefined;
  loading: boolean;
  accent: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, loading, accent }) => {
  return (
    <div
      className={`relative overflow-hidden rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-40 ${accent}`} />
      <div className="relative space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
        <p className="text-2xl font-semibold text-slate-800">
          {loading ? <span className="text-slate-400">...</span> : value ?? 0}
        </p>
        {!loading && (
          <p className="text-[11px] text-slate-500">Datos en tiempo real desde el sistema.</p>
        )}
      </div>
    </div>
  );
};
