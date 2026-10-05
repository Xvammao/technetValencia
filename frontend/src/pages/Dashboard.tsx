import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

interface Equipo {
  numero_serie_equipo: string;
}

interface Instalacion {
  numero_de_orden: string;
  numero_serie_equipo: string;
  nombre_tecnico: string;
  tipo_orden: string | null;
  fecha_cierre: string | null;
}

interface InstalacionMasOrange {
  id: number;
  ot: string;
  operador: string;
  tipo: string;
  fecha_cierre: string | null;
  tecnico_asignado: string;
  equipo_serial: string;
  desco_serial: string;
  seriales_tarjetas_sim: string[];
  acometida_id: number | null;
}

interface Orden {
  tipo_orden: string;
  valor_orden_tecnico: string | null;
  valor_orden_empresa: string | null;
}

interface Acometida {
  id: number;
  acometida: string;
  valor_tecnico: string | null;
  valor_empresa: string | null;
}

interface Operador {
  id_operador: number;
  nombre_operador: string;
}

interface Tecnico {
  id_tecnico: number;
  nombre_tecnico: string;
}

interface DashboardData {
  equipos: Equipo[];
  instalaciones: Instalacion[];
  masOrange: InstalacionMasOrange[];
  ordenes: Orden[];
  acometidas: Acometida[];
  operadores: Operador[];
  tecnicos: Tecnico[];
}

interface Cierre {
  id: string;
  ot: string;
  tecnico: string;
  tipo: string;
  fecha: string;
  operador: string;
}

interface TecnicoTotal {
  nombre: string;
  valor: number;
  ordenes: number;
}

interface MesTotal {
  key: string;
  label: string;
  total: number;
}

const currentYearMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const getList = <T,>(response: {
  data?: { results?: T[] } | T[];
}): T[] => {
  const data = response.data;
  if (Array.isArray(data)) return data;
  return data?.results ?? [];
};

const normalizeSerial = (serial: string) =>
  serial.trim().toLowerCase().replace(/_dupli\d+$/i, "");

const parseAmount = (value: string | null | undefined) => {
  if (!value) return 0;
  const normalized = value
    .replace(/[^0-9,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  const amount = Number.parseFloat(normalized);
  return Number.isFinite(amount) ? amount : 0;
};

const monthKey = (date: string | null) => {
  if (!date) return "";
  const match = date.match(/^(\d{4})-(\d{2})/);
  return match ? `${match[1]}-${match[2]}` : "";
};

const formatCurrency = (amount: number) =>
  `$${amount.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value: string) => {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  if (!year || !month || !day) return value;
  return new Date(year, month - 1, day).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getMonthLabel = (
  key: string,
  options?: Intl.DateTimeFormatOptions,
) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(
    "es-ES",
    options ?? { month: "long", year: "numeric" },
  );
};

export const Dashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [monthFilter, setMonthFilter] = useState(currentYearMonth());

  useEffect(() => {
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          equiposResponse,
          instalacionesResponse,
          masOrangeResponse,
          ordenesResponse,
          acometidasResponse,
          operadoresResponse,
          tecnicosResponse,
        ] = await Promise.all([
          api.get("/equipos/"),
          api.get("/instalaciones/"),
          api.get("/instalaciones-masorange/"),
          api.get("/ordenes/"),
          api.get("/acometidas/"),
          api.get("/operador/"),
          api.get("/tecnicos/"),
        ]);

        setData({
          equipos: getList<Equipo>(equiposResponse),
          instalaciones: getList<Instalacion>(instalacionesResponse),
          masOrange: getList<InstalacionMasOrange>(masOrangeResponse),
          ordenes: getList<Orden>(ordenesResponse),
          acometidas: getList<Acometida>(acometidasResponse),
          operadores: getList<Operador>(operadoresResponse),
          tecnicos: getList<Tecnico>(tecnicosResponse),
        });
      } catch (loadError) {
        console.error("Error cargando métricas del dashboard", loadError);
        setError("No se pudo cargar el resumen. Intenta actualizar la página.");
      } finally {
        setLoading(false);
      }
    };

    void loadDashboard();
  }, []);

  const summary = useMemo(() => {
    if (!data) return null;

    const usedSerials = new Set(
      [
        ...data.instalaciones.map((item) => item.numero_serie_equipo),
        ...data.masOrange.flatMap((item) => [
          item.equipo_serial,
          item.desco_serial,
        ]),
      ]
        .filter(Boolean)
        .map(normalizeSerial),
    );
    const stockCount = data.equipos.filter(
      (equipo) =>
        !equipo.numero_serie_equipo ||
        !usedSerials.has(normalizeSerial(equipo.numero_serie_equipo)),
    ).length;

    const ordenesByType = new Map(
      data.ordenes.map((orden) => [orden.tipo_orden.trim().toLowerCase(), orden]),
    );
    const acometidasById = new Map(
      data.acometidas.map((acometida) => [acometida.id, acometida]),
    );
    const matchesSelectedMonth = (date: string | null) =>
      monthKey(date) === monthFilter;

    const legacyThisMonth = data.instalaciones.filter((item) =>
      matchesSelectedMonth(item.fecha_cierre),
    );
    const masOrangeThisMonth = data.masOrange.filter((item) =>
      matchesSelectedMonth(item.fecha_cierre),
    );

    let monthlyTeamValue = 0;
    let monthlyCompanyValue = 0;
    const technicianTotals = new Map<string, TecnicoTotal>();
    legacyThisMonth.forEach((item) => {
      const name = item.nombre_tecnico?.trim();
      const order = item.tipo_orden
        ? ordenesByType.get(item.tipo_orden.trim().toLowerCase())
        : undefined;
      if (!order) return;
      const teamAmount = parseAmount(order.valor_orden_tecnico);
      monthlyTeamValue += teamAmount;
      monthlyCompanyValue += parseAmount(order.valor_orden_empresa);
      if (!name) return;
      const existing = technicianTotals.get(name) ?? {
        nombre: name,
        valor: 0,
        ordenes: 0,
      };
      existing.valor += teamAmount;
      existing.ordenes += 1;
      technicianTotals.set(name, existing);
    });

    const monthlyAcometidas = masOrangeThisMonth.reduce(
      (totals, item) => {
        const acometida = item.acometida_id
          ? acometidasById.get(item.acometida_id)
          : undefined;
        const teamAmount = parseAmount(acometida?.valor_tecnico);
        totals.tecnico += teamAmount;
        totals.empresa += parseAmount(acometida?.valor_empresa);
        const name = item.tecnico_asignado?.trim();
        if (name) {
          const existing = technicianTotals.get(name) ?? {
            nombre: name,
            valor: 0,
            ordenes: 0,
          };
          existing.valor += teamAmount;
          existing.ordenes += 1;
          technicianTotals.set(name, existing);
        }
        return totals;
      },
      { tecnico: 0, empresa: 0 },
    );
    monthlyTeamValue += monthlyAcometidas.tecnico;
    monthlyCompanyValue += monthlyAcometidas.empresa;

    const operatorTotals = new Map<string, number>();
    masOrangeThisMonth.forEach((item) => {
      const operator = item.operador?.trim() || "Sin operador";
      operatorTotals.set(operator, (operatorTotals.get(operator) ?? 0) + 1);
    });

    const closures: Cierre[] = [
      ...data.instalaciones
        .filter((item) => item.fecha_cierre)
        .map((item, index) => ({
          id: `instalacion-${index}-${item.numero_serie_equipo}`,
          ot: item.numero_de_orden || item.numero_serie_equipo,
          tecnico: item.nombre_tecnico || "Sin técnico",
          tipo: item.tipo_orden || "Instalación",
          fecha: item.fecha_cierre as string,
          operador: "Instalaciones",
        })),
      ...data.masOrange
        .filter((item) => item.fecha_cierre)
        .map((item) => ({
          id: `masorange-${item.id}`,
          ot: item.ot,
          tecnico: item.tecnico_asignado || "Sin técnico",
          tipo: item.tipo || "Instalación",
          fecha: item.fecha_cierre as string,
          operador: item.operador || "MasOrange",
        })),
    ]
      .sort((a, b) => b.fecha.localeCompare(a.fecha))
      .slice(0, 6);

    const [selectedYear, selectedMonth] = monthFilter.split("-").map(Number);
    const allDates = [
      ...data.instalaciones.map((item) => item.fecha_cierre),
      ...data.masOrange.map((item) => item.fecha_cierre),
    ];
    const lastSixMonths: MesTotal[] = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(selectedYear, selectedMonth - 5 + index, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return {
        key,
        label: getMonthLabel(key, { month: "short" }),
        total: allDates.filter((dateValue) => monthKey(dateValue) === key).length,
      };
    });
    const maxMonthlyCount = Math.max(
      1,
      ...lastSixMonths.map((month) => month.total),
    );
    const topTechnicians = [...technicianTotals.values()]
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5);
    const maxTechnicianValue = Math.max(
      1,
      ...topTechnicians.map((technician) => technician.valor),
    );

    return {
      stockCount,
      legacyCount: data.instalaciones.length,
      masOrangeCount: data.masOrange.length,
      masOrangeOrders: new Set(data.masOrange.map((item) => item.ot)).size,
      simCount: data.masOrange.reduce(
        (total, item) => total + (item.seriales_tarjetas_sim?.length ?? 0),
        0,
      ),
      selectedMonthLabel: getMonthLabel(monthFilter),
      legacyThisMonth: legacyThisMonth.length,
      masOrangeThisMonth: masOrangeThisMonth.length,
      monthlyTeamValue,
      monthlyCompanyValue,
      lastSixMonths,
      maxMonthlyCount,
      topTechnicians,
      maxTechnicianValue,
      operators: [...operatorTotals.entries()].sort((a, b) => b[1] - a[1]),
      closures,
      operatorCount: data.operadores.length,
      technicianCount: data.tecnicos.length,
    };
  }, [data, monthFilter]);

  return (
    <main className="space-y-6 p-4 pb-8 animate-fade-in sm:p-6">
      <header className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 px-6 py-7 text-white shadow-xl sm:px-8 sm:py-9">
        <div className="pointer-events-none absolute -right-12 -top-24 h-72 w-72 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-1/4 h-32 w-32 rounded-full bg-sky-400/10 blur-2xl" />
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-orange-300">
              Centro de operaciones
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
              Dashboard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-300 sm:text-base">
              Equipos disponibles, actividad de instalaciones y rendimiento
              económico de MasOrange en un solo lugar.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="dashboard-month" className="sr-only">
              Mes de análisis
            </label>
            <input
              id="dashboard-month"
              type="month"
              value={monthFilter}
              onChange={(event) => setMonthFilter(event.target.value)}
              className="rounded-xl border border-white/15 bg-white/10 px-3 py-2.5 text-sm text-white [color-scheme:dark] focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              type="button"
              onClick={() => setMonthFilter(currentYearMonth())}
              className="rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/20"
            >
              Mes actual
            </button>
          </div>
        </div>
        <div className="relative mt-7 flex flex-wrap gap-2">
          <QuickLink to="/instalaciones-masorange" label="MasOrange" />
          <QuickLink to="/equipos" label="Inventario de equipos" />
          <QuickLink to="/axcometidas" label="Acometidas y precios" />
        </div>
      </header>

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Equipos disponibles"
          value={summary?.stockCount}
          loading={loading}
          note="Excluye seriales ya asignados"
          tone="sky"
          icon="E"
        />
        <MetricCard
          title="Instalaciones MasOrange"
          value={summary?.masOrangeCount}
          loading={loading}
          note={`${summary?.masOrangeOrders ?? 0} órdenes de trabajo`}
          tone="orange"
          icon="M"
        />
        <MetricCard
          title="Instalaciones históricas"
          value={summary?.legacyCount}
          loading={loading}
          note="Módulo de instalaciones original"
          tone="emerald"
          icon="I"
        />
        <MetricCard
          title="Tarjetas SIM asignadas"
          value={summary?.simCount}
          loading={loading}
          note="Seriales registrados en MasOrange"
          tone="violet"
          icon="S"
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                Actividad operativa
              </p>
              <h2 className="mt-1 text-lg font-semibold text-slate-900">
                Instalaciones cerradas
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Últimos seis meses, módulos clásico y MasOrange.
              </p>
            </div>
            <span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold capitalize text-orange-700">
              {summary?.selectedMonthLabel ?? "—"}
            </span>
          </div>
          <div className="mt-7 flex h-48 items-end gap-3 border-b border-slate-100 pb-2 sm:gap-5">
            {(summary?.lastSixMonths ?? []).map((month) => (
              <div
                key={month.key}
                className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
                title={`${month.total} instalaciones`}
              >
                <span className="text-xs font-semibold text-slate-600">
                  {month.total}
                </span>
                <div className="flex h-36 w-full max-w-12 items-end overflow-hidden rounded-t-lg bg-slate-50">
                  <div
                    className={`w-full rounded-t-lg transition-all ${
                      month.key === monthFilter
                        ? "bg-gradient-to-t from-orange-600 to-orange-400"
                        : "bg-gradient-to-t from-sky-600 to-sky-400"
                    }`}
                    style={{
                      height: `${Math.max(
                        month.total > 0 ? 8 : 2,
                        (month.total / (summary?.maxMonthlyCount ?? 1)) * 100,
                      )}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-medium capitalize text-slate-500">
                  {month.label}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-orange-50 p-4">
              <p className="text-xs font-medium text-orange-700">
                MasOrange este mes
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {loading ? "—" : summary?.masOrangeThisMonth ?? 0}
              </p>
            </div>
            <div className="rounded-2xl bg-sky-50 p-4">
              <p className="text-xs font-medium text-sky-700">
                Instalaciones clásicas este mes
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {loading ? "—" : summary?.legacyThisMonth ?? 0}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Valores estimados
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            Liquidación de {summary?.selectedMonthLabel ?? "—"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Órdenes clásicas y precios de acometida MasOrange.
          </p>
          <div className="mt-5 space-y-3">
            <ValueCard
              label="Total para técnicos"
              value={summary?.monthlyTeamValue ?? 0}
              tone="emerald"
              loading={loading}
            />
            <ValueCard
              label="Total para la empresa"
              value={summary?.monthlyCompanyValue ?? 0}
              tone="blue"
              loading={loading}
            />
          </div>
          <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-500">
            Los importes se calculan a partir de los precios de las órdenes y
            las acometidas asociadas a las instalaciones del mes seleccionado.
          </p>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Rendimiento
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              Valor por técnico
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Principales técnicos por valor estimado en{" "}
              {summary?.selectedMonthLabel ?? "—"}.
            </p>
          </div>
          {loading ? (
            <LoadingRows />
          ) : summary?.topTechnicians.length ? (
            <div className="mt-5 space-y-4">
              {summary.topTechnicians.map((technician, index) => (
                <div key={technician.nombre}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-semibold text-slate-500">
                        {index + 1}
                      </span>
                      <span className="truncate font-medium text-slate-800">
                        {technician.nombre}
                      </span>
                      <span className="shrink-0 text-xs text-slate-400">
                        {technician.ordenes} OT
                      </span>
                    </div>
                    <span className="shrink-0 font-semibold text-slate-700">
                      {formatCurrency(technician.valor)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                      style={{
                        width: `${Math.max(
                          4,
                          (technician.valor /
                            (summary.maxTechnicianValue || 1)) *
                            100,
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState message="No hay importes asociados a técnicos en este mes." />
          )}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Distribución
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              Actividad por operador
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Órdenes MasOrange cerradas durante el mes seleccionado.
            </p>
          </div>
          {loading ? (
            <LoadingRows />
          ) : summary?.operators.length ? (
            <div className="mt-5 space-y-3">
              {summary.operators.slice(0, 6).map(([operator, count]) => {
                const total = summary.masOrangeThisMonth || 1;
                return (
                  <div key={operator}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="font-medium text-slate-700">
                        {operator}
                      </span>
                      <span className="text-slate-500">
                        {count} <span className="text-slate-400">OT</span>
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-400"
                        style={{
                          width: `${Math.max(4, (count / total) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState message="No hay actividad de MasOrange para este mes." />
          )}
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4">
            <SmallStat
              label="Operadores registrados"
              value={summary?.operatorCount ?? 0}
            />
            <SmallStat
              label="Técnicos registrados"
              value={summary?.technicianCount ?? 0}
            />
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-5 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
              Seguimiento
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-900">
              Últimos cierres
            </h2>
          </div>
          <Link
            to="/instalaciones-masorange"
            className="rounded-xl bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-700 transition hover:bg-orange-100"
          >
            Ver MasOrange
          </Link>
        </div>
        {loading ? (
          <div className="p-5">
            <LoadingRows />
          </div>
        ) : summary?.closures.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-semibold">OT / Serial</th>
                  <th className="px-5 py-3 font-semibold">Técnico</th>
                  <th className="px-5 py-3 font-semibold">Tipo</th>
                  <th className="px-5 py-3 font-semibold">Operador</th>
                  <th className="px-5 py-3 font-semibold">Fecha de cierre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.closures.map((closure) => (
                  <tr
                    key={closure.id}
                    className="transition hover:bg-slate-50/80"
                  >
                    <td className="whitespace-nowrap px-5 py-3.5 font-semibold text-slate-800">
                      {closure.ot}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">
                      {closure.tecnico}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-600">
                      {closure.tipo}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                        {closure.operador}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-500">
                      {formatDate(closure.fecha)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="Aún no hay instalaciones con fecha de cierre." />
        )}
      </section>
    </main>
  );
};

interface MetricCardProps {
  title: string;
  value: number | undefined;
  loading: boolean;
  note: string;
  tone: "sky" | "orange" | "emerald" | "violet";
  icon: string;
}

const metricTones = {
  sky: "bg-sky-50 text-sky-700 ring-sky-100",
  orange: "bg-orange-50 text-orange-700 ring-orange-100",
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
};

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  loading,
  note,
  tone,
  icon,
}) => (
  <article className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg">
    <div className="flex items-start justify-between gap-3">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-bold ring-1 ${metricTones[tone]}`}
      >
        {icon}
      </span>
    </div>
    <p className="mt-4 text-3xl font-bold tracking-tight text-slate-900">
      {loading ? (
        <span className="inline-block h-9 w-16 animate-pulse rounded-lg bg-slate-100" />
      ) : (
        (value ?? 0).toLocaleString("es-ES")
      )}
    </p>
    <p className="mt-1 text-xs text-slate-400">{note}</p>
  </article>
);

const ValueCard: React.FC<{
  label: string;
  value: number;
  tone: "emerald" | "blue";
  loading: boolean;
}> = ({ label, value, tone, loading }) => (
  <div
    className={`rounded-2xl border p-4 ${
      tone === "emerald"
        ? "border-emerald-100 bg-emerald-50/70"
        : "border-blue-100 bg-blue-50/70"
    }`}
  >
    <p
      className={`text-xs font-medium ${
        tone === "emerald" ? "text-emerald-700" : "text-blue-700"
      }`}
    >
      {label}
    </p>
    <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">
      {loading ? "—" : formatCurrency(value)}
    </p>
  </div>
);

const QuickLink: React.FC<{ to: string; label: string }> = ({ to, label }) => (
  <Link
    to={to}
    className="rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-medium text-white/90 transition hover:border-white/30 hover:bg-white/20"
  >
    {label} <span aria-hidden="true">→</span>
  </Link>
);

const SmallStat: React.FC<{ label: string; value: number }> = ({
  label,
  value,
}) => (
  <div className="rounded-xl bg-slate-50 px-3 py-2.5">
    <p className="text-xs text-slate-500">{label}</p>
    <p className="mt-1 text-lg font-semibold text-slate-800">{value}</p>
  </div>
);

const LoadingRows: React.FC = () => (
  <div className="mt-5 space-y-4" aria-label="Cargando datos">
    {[1, 2, 3].map((item) => (
      <div key={item} className="space-y-2">
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
        <div className="h-2 animate-pulse rounded-full bg-slate-100" />
      </div>
    ))}
  </div>
);

const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <p className="mt-5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
    {message}
  </p>
);
