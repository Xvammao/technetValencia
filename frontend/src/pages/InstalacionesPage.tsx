import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api/client';

interface Instalacion {
  id_instalaciones: number;
  numero_serie_equipo: string;
  numero_de_orden: string;
  fecha_cierre: string | null;
  id_tecnico_empresa: string;
  nombre_tecnico: string;
  descripcion: string | null;
  tipo: string | null;
  tipo_orden: string | null;
}

interface OrdenResumen {
  id_orden: number;
  tipo_orden: string;
  valor_orden_tecnico: string | null;
  valor_orden_empresa: string | null;
}

export const InstalacionesPage: React.FC = () => {
  const [instalaciones, setInstalaciones] = useState<Instalacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [importing, setImporting] = useState(false);

  const [serie, setSerie] = useState('');
  const [orden, setOrden] = useState('');
  const [fechaCierre, setFechaCierre] = useState('');
  const [idTecnicoEmpresa, setIdTecnicoEmpresa] = useState('');
  const [nombreTecnico, setNombreTecnico] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [tipo, setTipo] = useState('');
  const [tipoOrden, setTipoOrden] = useState('');

  const [editing, setEditing] = useState<Instalacion | null>(null);

  const [ordenes, setOrdenes] = useState<OrdenResumen[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const loadInstalaciones = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/instalaciones/');
      const data = (response.data?.results ?? response.data) as Instalacion[];
      setInstalaciones(data);
    } catch (err) {
      console.error('Error cargando instalaciones', err);
      setError('No se pudieron cargar las instalaciones.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    // Aplanar las instalaciones filtradas para exportar
    const rows = filteredInstalaciones.map((inst) => ({
      'N.º serie equipo': inst.numero_serie_equipo,
      'N.º orden': inst.numero_de_orden,
      'Nombre técnico': inst.nombre_tecnico,
      'Tipo orden': inst.tipo_orden ?? '',
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Instalaciones');
    XLSX.writeFile(workbook, 'instalaciones.xlsx');
  };

  const loadOrdenes = async () => {
    try {
      const response = await api.get('/ordenes/');
      const data = (response.data?.results ?? response.data) as OrdenResumen[];
      setOrdenes(data);
    } catch (err) {
      console.error('Error cargando órdenes para instalaciones', err);
    }
  };

  useEffect(() => {
    loadInstalaciones();
    loadOrdenes();
  }, []);

  const startCreate = () => {
    setEditing(null);
    setSerie('');
    setOrden('');
    setFechaCierre('');
    setIdTecnicoEmpresa('');
    setNombreTecnico('');
    setDescripcion('');
    setTipo('');
    setTipoOrden('');
    setShowForm(true);
  };

  const startEdit = (inst: Instalacion) => {
    setEditing(inst);
    setSerie(inst.numero_serie_equipo);
    setOrden(inst.numero_de_orden);
    setFechaCierre(inst.fecha_cierre ?? '');
    setIdTecnicoEmpresa(inst.id_tecnico_empresa);
    setNombreTecnico(inst.nombre_tecnico);
    setDescripcion(inst.descripcion ?? '');
    setTipo(inst.tipo ?? '');
    setTipoOrden(inst.tipo_orden ?? '');
    setShowForm(true);
  };

  const handleDelete = async (inst: Instalacion) => {
    if (!window.confirm(`¿Eliminar la instalación #${inst.id_instalaciones}?`)) return;

    try {
      await api.delete(`/instalaciones/${inst.id_instalaciones}/`);
      await loadInstalaciones();
    } catch (err) {
      console.error('Error eliminando instalación', err);
      setError('No se pudo eliminar la instalación.');
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

      // Cargar inventario de equipos para validar / eliminar según N.º de serie
      let equiposPorSerie = new Map<string, { id_equipos: number; nombre: string }>();
      try {
        const equiposRes = await api.get('/equipos/');
        const equiposData = (equiposRes.data?.results ?? equiposRes.data) as Array<{
          id_equipos: number;
          nombre: string;
          numero_serie_equipo: string;
        }>;
        equiposData.forEach((eq) => {
          if (eq.numero_serie_equipo) {
            equiposPorSerie.set(eq.numero_serie_equipo.trim(), {
              id_equipos: eq.id_equipos,
              nombre: eq.nombre,
            });
          }
        });
      } catch (equipErr) {
        console.error('No se pudo cargar el inventario de equipos para validar durante la importación', equipErr);
        equiposPorSerie = new Map();
      }

      const ordenesConEquipoInexistente: string[] = [];

      // Contador de duplicados por número de orden original
      const orderCounts: Record<string, number> = {};
      // Contador de duplicados por número de serie (restricción unique en modelo)
      const serieCounts: Record<string, number> = {};

      for (const row of rows) {
        // Leer valores crudos del Excel
        let numeroDeOrden = String(row['Administrativo'] || '').trim();
        const fechaCierreExcel = String(row['F.Cierre'] || '').trim();
        let idTecnicoEmp = String(row['Instalador'] || '').trim();
        let nombreTec = String(row['Nombre'] || '').trim();
        const descripcionInst = String(row['Descripción'] || '').trim();
        const numSerieOriginal = String(row['Num Serie'] || '').trim();
        let numSerie = numSerieOriginal;
        let tipoInst = String(row['Tipo'] || '').trim();
        let tipoOrdenExcel = String(row['Actuación'] || '').trim();

        // Si faltan campos clave, rellenar con 'NA' para no perder filas
        if (!numeroDeOrden) numeroDeOrden = 'NA';
        if (!idTecnicoEmp) idTecnicoEmp = 'NA';
        if (!nombreTec) nombreTec = 'NA';
        if (!numSerie) numSerie = 'NA';

        // Gestionar duplicados de número de orden: mismo valor en varias filas del Excel
        const originalOrderKey = numeroDeOrden;
        const currentOrderCount = orderCounts[originalOrderKey] ?? 0;
        if (currentOrderCount > 0) {
          // A partir del segundo duplicado, agregar sufijo _DUPLI + consecutivo
          numeroDeOrden = `${originalOrderKey}_DUPLI${currentOrderCount}`;
        }
        orderCounts[originalOrderKey] = currentOrderCount + 1;

        // Gestionar duplicados de número de serie (campo unique en modelo)
        const originalSerieKey = numSerie;
        const currentSerieCount = serieCounts[originalSerieKey] ?? 0;
        if (currentSerieCount > 0) {
          numSerie = `${originalSerieKey}_DUPLI${currentSerieCount}`;
        }
        serieCounts[originalSerieKey] = currentSerieCount + 1;

        // Respetar max_length del modelo Django para evitar errores de validación
        if (numeroDeOrden.length > 100) numeroDeOrden = numeroDeOrden.slice(0, 100);
        if (numSerie.length > 100) numSerie = numSerie.slice(0, 100);
        if (idTecnicoEmp.length > 50) idTecnicoEmp = idTecnicoEmp.slice(0, 50);
        if (nombreTec.length > 150) nombreTec = nombreTec.slice(0, 150);
        if (tipoInst.length > 100) tipoInst = tipoInst.slice(0, 100);
        if (tipoOrdenExcel.length > 100) tipoOrdenExcel = tipoOrdenExcel.slice(0, 100);

        let fechaCierreApi: string | null = null;
        if (fechaCierreExcel) {
          const parsedDate = new Date(fechaCierreExcel);
          if (!isNaN(parsedDate.getTime())) {
            fechaCierreApi = parsedDate.toISOString().slice(0, 10);
          }
        }

        // Validar existencia de equipo en inventario según N.º de serie original
        if (numSerieOriginal) {
          const equipo = equiposPorSerie.get(numSerieOriginal.trim());
          if (equipo) {
            try {
              await api.delete(`/equipos/${equipo.id_equipos}/`);
              // Eliminar para evitar borrar de nuevo si hay duplicados de serie
              equiposPorSerie.delete(numSerieOriginal.trim());
            } catch (delErr) {
              console.error('No se pudo eliminar el equipo del inventario durante la importación', delErr);
            }
          } else {
            ordenesConEquipoInexistente.push(
              `Orden ${numeroDeOrden}: el equipo con N.º de serie "${numSerieOriginal}" no existe en el inventario`
            );
          }
        }

        try {
          await api.post('/instalaciones/', {
            numero_serie_equipo: numSerie,
            numero_de_orden: numeroDeOrden,
            fecha_cierre: fechaCierreApi,
            id_tecnico_empresa: idTecnicoEmp,
            nombre_tecnico: nombreTec,
            descripcion: descripcionInst || null,
            tipo: tipoInst || null,
            tipo_orden: tipoOrdenExcel || null,
          });
        } catch (rowError) {
          console.error('Error creando instalación desde Excel para orden', numeroDeOrden, rowError);
        }
      }

      await loadInstalaciones();

      if (ordenesConEquipoInexistente.length > 0) {
        window.alert(
          'Durante la importación se detectaron instalaciones cuyo equipo no existe en el inventario:\n\n' +
            ordenesConEquipoInexistente.join('\n')
        );
      }
    } catch (err) {
      console.error('Error importando instalaciones desde Excel', err);
      setError('No se pudo importar el archivo Excel de instalaciones. Verifica el formato.');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        numero_serie_equipo: serie,
        numero_de_orden: orden,
        fecha_cierre: fechaCierre || null,
        id_tecnico_empresa: idTecnicoEmpresa,
        nombre_tecnico: nombreTecnico,
        descripcion: descripcion || null,
        tipo: tipo || null,
        tipo_orden: tipoOrden || null,
      };

      if (editing) {
        await api.put(`/instalaciones/${editing.id_instalaciones}/`, payload);
      } else {
        await api.post('/instalaciones/', payload);
      }
      setSerie('');
      setOrden('');
      setFechaCierre('');
      setIdTecnicoEmpresa('');
      setNombreTecnico('');
      setDescripcion('');
      setTipo('');
      setTipoOrden('');
      await loadInstalaciones();
      setEditing(null);
      setShowForm(false);
    } catch (err) {
      console.error('Error guardando instalación', err);
      setError('No se pudo guardar la instalación. Revisa los datos.');
    } finally {
      setSaving(false);
    }
  };

  const selectedOrden = tipoOrden
    ? ordenes.find((o) => o.tipo_orden === tipoOrden) ?? null
    : null;

  const filteredInstalaciones = instalaciones.filter((inst) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      inst.numero_serie_equipo.toLowerCase().includes(term) ||
      inst.numero_de_orden.toLowerCase().includes(term) ||
      inst.nombre_tecnico.toLowerCase().includes(term) ||
      (inst.tipo_orden ?? '').toLowerCase().includes(term)
    );
  });

  const totalGroups = Object.keys(
    filteredInstalaciones.reduce<Record<string, true>>((acc, inst) => {
      const baseOrden = inst.numero_de_orden.split('_DUPLI')[0];
      acc[baseOrden] = true;
      return acc;
    }, {})
  ).length;

  const totalPages = Math.max(1, Math.ceil(totalGroups / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  // Agrupar instalaciones filtradas por número de orden base (antes de sufijo _DUPLI)
  const groupedByOrden = filteredInstalaciones.reduce<Record<string, Instalacion[]>>((acc, inst) => {
    const baseOrden = inst.numero_de_orden.split('_DUPLI')[0];
    if (!acc[baseOrden]) acc[baseOrden] = [];
    acc[baseOrden].push(inst);
    return acc;
  }, {});

  const allGroupKeys = Object.keys(groupedByOrden).sort();
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedGroupKeys = allGroupKeys.slice(startIndex, startIndex + pageSize);

  const toggleGroup = (baseOrden: string) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [baseOrden]: !prev[baseOrden],
    }));
  };

  return (
    <div className="p-4 animate-fade-in space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Instalaciones</h1>
        {!showForm && (
          <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center md:justify-end">
            <input
              type="text"
              placeholder="Buscar por N.º serie, N.º orden, técnico o tipo orden..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-xs rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleExportExcel}
                className="rounded border border-slate-300 bg-white px-3 py-2 text-xs text-slate-700 hover:bg-slate-50"
              >
                Exportar Excel
              </button>
              <label className="inline-flex cursor-pointer items-center justify-center rounded border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow hover:bg-slate-50">
                <span>{importing ? 'Importando...' : 'Importar Excel'}</span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleImportExcel}
                  className="hidden"
                  disabled={importing}
                />
              </label>
              <button
                type="button"
                onClick={startCreate}
                className="rounded bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-400 transition-transform hover:-translate-y-0.5"
              >
                Nueva instalación
              </button>
            </div>
          </div>
        )}
      </div>

      {!showForm && (
        <div className="overflow-hidden rounded border border-slate-200 bg-white shadow">
          {loading && <p className="p-4 text-sm text-slate-500">Cargando instalaciones...</p>}
          {error && !loading && <p className="p-4 text-sm text-red-500">{error}</p>}
          {!loading && !error && (
            <table className="min-w-full text-xs md:text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-700">N.º serie equipo</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-700">N.º orden</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-700">Nombre técnico</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-700">Tipo orden</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedGroupKeys.map((baseOrden) => {
                  const items = groupedByOrden[baseOrden] ?? [];
                  const isOpen = expandedGroups[baseOrden] ?? false;

                  // Calcular suma de valores de la orden para técnico y empresa en este grupo
                  const { totalTec, totalEmp } = items.reduce(
                    (acc, inst) => {
                      if (!inst.tipo_orden) return acc;
                      const ordenDetalle = ordenes.find((o) => o.tipo_orden === inst.tipo_orden);
                      if (!ordenDetalle) return acc;

                      const parseMonto = (valor: string | null) => {
                        if (!valor) return 0;
                        const limpio = valor
                          .replace(/[^0-9,.-]/g, '')
                          .replace(/\.(?=\d{3}(?:\D|$))/g, '')
                          .replace(',', '.');
                        const n = parseFloat(limpio);
                        return isNaN(n) ? 0 : n;
                      };

                      acc.totalTec += parseMonto(ordenDetalle.valor_orden_tecnico);
                      acc.totalEmp += parseMonto(ordenDetalle.valor_orden_empresa);
                      return acc;
                    },
                    { totalTec: 0, totalEmp: 0 }
                  );

                  const formatMonto = (n: number) => {
                    return n.toLocaleString('es-ES', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });
                  };

                  return (
                    <React.Fragment key={baseOrden}>
                      <tr
                        className="bg-slate-50 cursor-pointer hover:bg-slate-100"
                        onClick={() => toggleGroup(baseOrden)}
                      >
                        <td colSpan={5} className="px-4 py-2 text-xs font-semibold text-primary-700">
                          <span className="mr-2 text-slate-600">{isOpen ? '▾' : '▸'}</span>
                          N.º orden: {baseOrden} ({items.length} instalación
                          {items.length > 1 ? 'es' : ''})
                          {totalTec > 0 || totalEmp > 0 ? (
                            <span className="ml-4 text-[11px] text-emerald-600">
                              Total técnico: ${formatMonto(totalTec)} | Total empresa: ${formatMonto(totalEmp)}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                      {isOpen &&
                        items.map((inst) => {
                          const ordenDetalle = inst.tipo_orden
                            ? ordenes.find((o) => o.tipo_orden === inst.tipo_orden) ?? null
                            : null;

                          return (
                            <React.Fragment key={inst.id_instalaciones}>
                              <tr className="border-t border-slate-200 hover:bg-slate-50">
                                <td className="px-4 py-2 text-slate-800">{inst.numero_serie_equipo}</td>
                                <td className="px-4 py-2 text-slate-800">{inst.numero_de_orden}</td>
                                <td className="px-4 py-2 text-slate-800">{inst.nombre_tecnico}</td>
                                <td className="px-4 py-2 text-slate-800">{inst.tipo_orden ?? '-'}</td>
                                <td className="px-4 py-2 text-right space-x-2">
                                  <button
                                    type="button"
                                    onClick={() => startEdit(inst)}
                                    className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDelete(inst)}
                                    className="rounded border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                                  >
                                    Eliminar
                                  </button>
                                </td>
                              </tr>
                              {ordenDetalle && (
                                <tr className="border-t border-slate-200 bg-slate-50">
                                  <td colSpan={5} className="px-6 py-2 text-xs text-slate-700">
                                    <div className="grid gap-2 md:grid-cols-2">
                                      <div>
                                        <span className="block font-medium text-slate-800">
                                          Valor de la orden para el técnico
                                        </span>
                                        <span className="block whitespace-pre-wrap text-slate-700">
                                          {ordenDetalle.valor_orden_tecnico ?? ''}
                                        </span>
                                      </div>
                                      <div>
                                        <span className="block font-medium text-slate-200">
                                          Valor de la orden para la empresa
                                        </span>
                                        <span className="block whitespace-pre-wrap text-slate-300">
                                          {ordenDetalle.valor_orden_empresa ?? ''}
                                        </span>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
                {instalaciones.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-4 text-center text-slate-500">
                      No hay instalaciones registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {!showForm && totalGroups > pageSize && (
        <div className="flex items-center justify-center gap-1 border border-slate-200 border-t-0 bg-slate-50 px-3 py-2 text-xs">
          <button
            type="button"
            className="rounded px-2 py-1 text-slate-600 hover:bg-slate-100 disabled:opacity-40"
            onClick={() => setCurrentPage(1)}
            disabled={safeCurrentPage === 1}
          >
            «
          </button>
          <button
            type="button"
            className="rounded px-2 py-1 text-slate-200 hover:bg-slate-800 disabled:opacity-40"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safeCurrentPage === 1}
          >
            ‹
          </button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
            <button
              key={page}
              type="button"
              onClick={() => setCurrentPage(page)}
              className={`min-w-[2rem] rounded px-2 py-1 text-xs ${
                page === safeCurrentPage
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              {page}
            </button>
          ))}
          <button
            type="button"
            className="rounded px-2 py-1 text-slate-200 hover:bg-slate-800 disabled:opacity-40"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safeCurrentPage === totalPages}
          >
            ›
          </button>
          <button
            type="button"
            className="rounded px-2 py-1 text-slate-200 hover:bg-slate-800 disabled:opacity-40"
            onClick={() => setCurrentPage(totalPages)}
            disabled={safeCurrentPage === totalPages}
          >
            »
          </button>
        </div>
      )}

      {showForm && (
        <div className="rounded border border-slate-200 bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-medium">{editing ? 'Editar instalación' : 'Nueva instalación'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="serie-inst">
                Número de serie del equipo
              </label>
              <input
                id="serie-inst"
                type="text"
                value={serie}
                onChange={(e) => setSerie(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="fecha-cierre">
                  Fecha de cierre (opcional)
                </label>
                <input
                  id="fecha-cierre"
                  type="date"
                  value={fechaCierre}
                  onChange={(e) => setFechaCierre(e.target.value)}
                  className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="id-tec-emp">
                  ID técnico empresa
                </label>
                <input
                  id="id-tec-emp"
                  type="text"
                  value={idTecnicoEmpresa}
                  onChange={(e) => setIdTecnicoEmpresa(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="nombre-tec">
                  Nombre técnico
                </label>
                <input
                  id="nombre-tec"
                  type="text"
                  value={nombreTecnico}
                  onChange={(e) => setNombreTecnico(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="tipo-inst">
                  Tipo (opcional)
                </label>
                <input
                  id="tipo-inst"
                  type="text"
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="tipo-orden-inst">
                Tipo de orden (opcional)
              </label>
              <select
                id="tipo-orden-inst"
                value={tipoOrden}
                onChange={(e) => setTipoOrden(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Sin tipo de orden</option>
                {ordenes.map((ord) => (
                  <option key={ord.id_orden} value={ord.tipo_orden}>
                    {ord.tipo_orden}
                  </option>
                ))}
              </select>
            </div>

            {selectedOrden && (
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Valor de la orden para el técnico
                  </label>
                  <textarea
                    value={selectedOrden.valor_orden_tecnico ?? ''}
                    readOnly
                    rows={2}
                    className="w-full cursor-default rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-300">
                    Valor de la orden para la empresa
                  </label>
                  <textarea
                    value={selectedOrden.valor_orden_empresa ?? ''}
                    readOnly
                    rows={2}
                    className="w-full cursor-default rounded border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm text-slate-300"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="desc-inst">
                Descripción (opcional)
              </label>
              <textarea
                id="desc-inst"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="orden-inst">
                Número de orden
              </label>
              <input
                id="orden-inst"
                type="text"
                value={orden}
                onChange={(e) => setOrden(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
              >
                Volver a la lista
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-primary-500 px-4 py-2 text-xs font-medium text-white shadow hover:bg-primary-400 disabled:opacity-60"
              >
                {saving ? 'Guardando...' : editing ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
