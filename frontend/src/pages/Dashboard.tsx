import React, { useEffect, useState } from 'react';
import { api } from '../api/client';

interface Metrics {
  equipos: number;
  instalaciones: number;
  operadores: number;
  ordenes: number;
  tecnicos: number;
}

interface InstalacionResumen {
  nombre_tecnico: string;
  tipo_orden: string | null;
}

interface OrdenResumen {
  tipo_orden: string;
  valor_orden_tecnico: string | null;
}

interface TecnicoTotal {
  nombre: string;
  totalTec: number;
}

export const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tecnicoTotals, setTecnicoTotals] = useState<TecnicoTotal[]>([]);
  const [totalEmpresa, setTotalEmpresa] = useState<number>(0);

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

        setMetrics({
          equipos: getCount(equiposRes),
          instalaciones: getCount(instRes),
          operadores: getCount(opRes),
          ordenes: getCount(ordRes),
          tecnicos: getCount(tecRes),
        });

        // Análisis: Total técnico por cada técnico
        const instalacionesData = (instRes.data?.results ?? instRes.data) as InstalacionResumen[];
        const ordenesData = (ordRes.data?.results ?? ordRes.data) as OrdenResumen[];

        const parseMonto = (valor: string | null) => {
          if (!valor) return 0;
          const limpio = valor
            .replace(/[^0-9,.-]/g, '')
            .replace(/\.(?=\d{3}(?:\D|$))/g, '')
            .replace(',', '.');
          const n = parseFloat(limpio);
          return isNaN(n) ? 0 : n;
        };

        let acumuladoEmpresa = 0;

        const totalsMap = instalacionesData.reduce<Record<string, number>>((acc, inst) => {
          const nombre = (inst.nombre_tecnico || '').trim();
          const tipoOrden = inst.tipo_orden?.trim();
          if (!nombre || !tipoOrden) return acc;

          const orden = ordenesData.find((o) => o.tipo_orden === tipoOrden);
          if (!orden) return acc;

          const montoTec = parseMonto(orden.valor_orden_tecnico);
          const montoEmp = parseMonto((orden as any).valor_orden_empresa ?? null);
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
      } catch (err) {
        console.error('Error cargando métricas del dashboard', err);
        setError('No se pudieron cargar las métricas generales.');
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, []);

  return (
    <div className="p-4 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold text-slate-50">Dashboard</h1>
        <p className="text-sm text-slate-400">
          Resumen general del estado de equipos, instalaciones, órdenes y personal técnico.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Equipos"
          value={metrics?.equipos}
          loading={loading}
          accent="from-sky-500/20 to-sky-500/5"
        />
        <MetricCard
          title="Instalaciones"
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

      {!loading && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border border-emerald-700/60 bg-emerald-950/40 p-4 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-300">
              Ganancia total Technet
            </p>
            <p className="mt-1 text-2xl font-semibold text-emerald-100">
              ${totalEmpresa.toLocaleString('es-ES', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </p>
            <p className="mt-1 text-[11px] text-emerald-200/80">
              Suma de todos los valores de la orden para la empresa asociados a las instalaciones
              registradas.
            </p>
          </div>
        </div>
      )}

      {!loading && metrics && (
        <div className="rounded border border-slate-800 bg-slate-950/70 p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-slate-200">Resumen rápido</h2>
          <p className="text-xs text-slate-400">
            Actualmente se gestionan <span className="font-semibold text-slate-100">{metrics.equipos}</span> equipos,
            distribuidos en <span className="font-semibold text-slate-100">{metrics.instalaciones}</span> instalaciones,
            atendidos por <span className="font-semibold text-slate-100">{metrics.tecnicos}</span> técnicos y
            coordinados con <span className="font-semibold text-slate-100">{metrics.operadores}</span> operadores.
          </p>
        </div>
      )}

      {!loading && tecnicoTotals.length > 0 && (
        <div className="rounded border border-slate-800 bg-slate-950/70 p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold text-slate-200">
            Total técnico por técnico (Top 10)
          </h2>
          <div className="grid gap-2 md:grid-cols-2">
            {tecnicoTotals.map((tec) => (
              <div
                key={tec.nombre}
                className="flex items-center justify-between rounded border border-slate-800 bg-slate-900/70 px-3 py-2 text-xs"
              >
                <span className="font-medium text-slate-100 mr-3 line-clamp-1">{tec.nombre}</span>
                <span className="text-emerald-300 font-semibold whitespace-nowrap">
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
      className={`relative overflow-hidden rounded-lg border border-slate-800 bg-slate-950/80 p-4 shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-lg`}
    >
      <div className={`pointer-events-none absolute inset-0 bg-gradient-to-br opacity-80 ${accent}`} />
      <div className="relative space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{title}</p>
        <p className="text-2xl font-semibold text-slate-50">
          {loading ? <span className="text-slate-500">...</span> : value ?? 0}
        </p>
        {!loading && (
          <p className="text-[11px] text-slate-500">Datos en tiempo real desde el sistema.</p>
        )}
      </div>
    </div>
  );
};
