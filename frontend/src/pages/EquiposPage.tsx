import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api/client';

interface Equipo {
  id_equipos: number;
  nombre: string;
  numero_serie_equipo: string;
  tecnico: string;
  // operador puede venir como id numérico, string o incluso objeto con id_operador
  operador: number | string | { id_operador: number } | null;
}

interface Tecnico {
  id_tecnico: number;
  nombre_tecnico: string;
  id_tecnico_empresa: string;
}

interface Operador {
  id_operador: number;
  nombre_operador: string;
}

export const EquiposPage: React.FC = () => {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [editing, setEditing] = useState<Equipo | null>(null);
  const [formNombre, setFormNombre] = useState('');
  const [formSerie, setFormSerie] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [seriesInstalaciones, setSeriesInstalaciones] = useState<string[]>([]);
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [formTecnico, setFormTecnico] = useState('');
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [formOperador, setFormOperador] = useState('');
  const [importOperadorId, setImportOperadorId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const loadEquipos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/equipos/');
      const data = (response.data?.results ?? response.data) as Equipo[];
      setEquipos(data);
    } catch (err) {
      console.error('Error cargando equipos', err);
      setError('No se pudieron cargar los equipos.');
    } finally {
      setLoading(false);
    }
  };

  const loadOperadores = async () => {
    try {
      const response = await api.get('/operador/');
      const data = (response.data?.results ?? response.data) as Operador[];
      setOperadores(data);
    } catch (err) {
      console.error('Error cargando operadores para equipos', err);
    }
  };

  const loadTecnicos = async () => {
    try {
      const response = await api.get('/tecnicos/');
      const data = (response.data?.results ?? response.data) as Tecnico[];
      setTecnicos(data);
    } catch (err) {
      console.error('Error cargando tecnicos para equipos', err);
    }
  };

  const loadSeriesInstalaciones = async () => {
    try {
      const response = await api.get('/instalaciones/');
      const data = (response.data?.results ?? response.data) as Array<{
        numero_serie_equipo: string;
      }>;
      const series = data
        .map((inst) => inst.numero_serie_equipo?.trim())
        .filter((s): s is string => !!s);
      setSeriesInstalaciones(series);
    } catch (err) {
      console.error('Error cargando series de instalaciones para filtrar equipos', err);
    }
  };

  const filteredEquipos = equipos.filter((equipo) => {
    const seriesSet = new Set(
      seriesInstalaciones.map((s) => s.toLowerCase().trim())
    );

    // Si el N.º de serie del equipo ya existe en instalaciones, no mostrarlo
    if (
      equipo.numero_serie_equipo &&
      seriesSet.has(equipo.numero_serie_equipo.toLowerCase().trim())
    ) {
      return false;
    }

    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      equipo.id_equipos.toString().includes(term) ||
      equipo.nombre.toLowerCase().includes(term) ||
      equipo.numero_serie_equipo.toLowerCase().includes(term) ||
      equipo.tecnico.toLowerCase().includes(term)
    );
  });

  const totalPages = Math.max(1, Math.ceil(filteredEquipos.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedEquipos = filteredEquipos.slice(startIndex, startIndex + pageSize);

  const handleExportExcel = () => {
    const rows = filteredEquipos.map((equipo) => ({
      ID: equipo.id_equipos,
      Nombre: equipo.nombre,
      'N.º serie': equipo.numero_serie_equipo,
      Tecnico: equipo.tecnico,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Equipos');
    XLSX.writeFile(workbook, 'equipos.xlsx');
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!importOperadorId) {
      window.alert('Antes de importar el Excel, selecciona a qué operador se asignarán los equipos.');
      e.target.value = '';
      return;
    }

    setImporting(true);
    setError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

      let createdCount = 0;

      for (const row of rows) {
        // Normalizar claves de la fila (encabezados de columnas) para hacer la búsqueda
        const normalizedRow: Record<string, any> = {};
        Object.entries(row).forEach(([key, value]) => {
          const normalizedKey = key
            .toString()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // quitar tildes
            .toLowerCase()
            .trim();
          normalizedRow[normalizedKey] = value;
        });

        const nombre = (
          normalizedRow['nombre'] ??
          normalizedRow['nombre equipo'] ??
          normalizedRow['producto'] ??
          ''
        )
          .toString()
          .trim();

        const serie = (
          normalizedRow['num serie'] ??
          normalizedRow['nº serie'] ??
          normalizedRow['n° serie'] ??
          normalizedRow['numero de serie'] ??
          normalizedRow['serie'] ??
          ''
        )
          .toString()
          .trim();

        if (!nombre || !serie) {
          continue;
        }

        try {
          await api.post('/equipos/', {
            nombre,
            numero_serie_equipo: serie,
            tecnico: 'stock',
            operador: Number(importOperadorId),
          });
          createdCount += 1;
        } catch (rowErr) {
          console.error('Error creando equipo desde Excel', rowErr, row);
        }
      }

      await loadEquipos();
      e.target.value = '';

      if (createdCount === 0) {
        setError(
          'No se creó ningún equipo desde el Excel. Verifica que las columnas de nombre y número de serie tengan encabezados válidos (por ejemplo: "Nombre", "Num Serie").'
        );
      }
    } catch (err) {
      console.error('Error importando Excel de equipos', err);
      setError('No se pudo importar el archivo Excel. Verifica el formato.');
    } finally {
      setImporting(false);
    }
  };

  useEffect(() => {
    loadEquipos();
    loadSeriesInstalaciones();
    loadTecnicos();
    loadOperadores();
  }, []);

  const resetForm = () => {
    setEditing(null);
    setFormNombre('');
    setFormSerie('');
    setFormTecnico('');
    setFormOperador('');
    setCurrentPage(1);
  };

  const startCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (equipo: Equipo) => {
    setEditing(equipo);
    setFormNombre(equipo.nombre);
    setFormSerie(equipo.numero_serie_equipo);
    setFormTecnico(equipo.tecnico || '');
    setFormOperador(equipo.operador ? String(equipo.operador) : '');
    setShowForm(true);
  };

  const handleDelete = async (equipo: Equipo) => {
    if (!window.confirm(`¿Eliminar el equipo "${equipo.nombre}"?`)) return;

    try {
      await api.delete(`/equipos/${equipo.id_equipos}/`);
      await loadEquipos();
    } catch (err) {
      console.error('Error eliminando equipo', err);
      setError('No se pudo eliminar el equipo.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editing) {
        await api.put(`/equipos/${editing.id_equipos}/`, {
          nombre: formNombre,
          numero_serie_equipo: formSerie,
          tecnico: formTecnico,
          operador: formOperador || null,
        });
      } else {
        await api.post('/equipos/', {
          nombre: formNombre,
          numero_serie_equipo: formSerie,
          tecnico: formTecnico,
          operador: formOperador || null,
        });
      }

      await loadEquipos();
      resetForm();
      setShowForm(false);
    } catch (err) {
      console.error('Error guardando equipo', err);
      setError('No se pudo guardar el equipo. Revisa los datos.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 animate-fade-in space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Equipos</h1>
        {!showForm && (
          <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center md:justify-end">
            <input
              type="text"
              placeholder="Buscar por ID, nombre, N.º serie o técnico..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-xs rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button
              type="button"
              onClick={handleExportExcel}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
            >
              Exportar Excel
            </button>
            <select
              value={importOperadorId}
              onChange={(e) => setImportOperadorId(e.target.value)}
              className="w-full max-w-xs rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">Operador para equipos importados...</option>
              {operadores.map((operador) => (
                <option key={operador.id_operador} value={operador.id_operador}>
                  {operador.nombre_operador}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer">
              <span>{importing ? 'Importando...' : 'Importar Excel'}</span>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleExcelImport}
                disabled={importing}
              />
            </label>
            <button
              type="button"
              onClick={startCreate}
              className="rounded bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-400 transition-transform hover:-translate-y-0.5"
            >
              Nuevo equipo
            </button>
          </div>
        )}
      </div>

      {!showForm && (
        <div className="overflow-hidden rounded border border-slate-200 bg-white shadow animate-fade-in">
          {loading && <p className="p-4 text-sm text-slate-500">Cargando equipos...</p>}
          {error && !loading && <p className="p-4 text-sm text-red-500">{error}</p>}
          {!loading && !error && (
            <>
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">ID</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Nombre</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">N.º serie</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Tecnico</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Operador</th>
                    <th className="px-4 py-2 text-right font-medium text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEquipos.map((equipo) => (
                    <tr
                      key={equipo.id_equipos}
                      className="border-t border-slate-200 transition-colors hover:bg-slate-50"
                    >
                      <td className="px-4 py-2 text-slate-800">{equipo.id_equipos}</td>
                      <td className="px-4 py-2 text-slate-800">{equipo.nombre}</td>
                      <td className="px-4 py-2 text-slate-800">{equipo.numero_serie_equipo}</td>
                      <td className="px-4 py-2 text-slate-800">{equipo.tecnico}</td>
                      <td className="px-4 py-2 text-slate-800">
                        {(() => {
                          // Caso 1: el backend ya devuelve directamente el nombre del operador como string
                          if (typeof equipo.operador === 'string' && equipo.operador.trim()) {
                            const parsed = Number(equipo.operador);
                            // Si NO es un número válido, lo tomamos como nombre tal cual
                            if (isNaN(parsed)) {
                              return equipo.operador;
                            }
                          }

                          // Caso 2: el backend devuelve objeto con nombre_operador
                          if (equipo.operador && typeof equipo.operador === 'object') {
                            const anyOperador = equipo.operador as any;
                            if (typeof anyOperador.nombre_operador === 'string' && anyOperador.nombre_operador.trim()) {
                              return anyOperador.nombre_operador;
                            }
                          }

                          // Caso 3: resolver por ID numérico usando la lista de operadores
                          let opId: number | null = null;
                          if (typeof equipo.operador === 'number') {
                            opId = equipo.operador;
                          } else if (typeof equipo.operador === 'string' && equipo.operador) {
                            const parsed = Number(equipo.operador);
                            opId = isNaN(parsed) ? null : parsed;
                          } else if (equipo.operador && typeof equipo.operador === 'object') {
                            const maybeId = (equipo.operador as any).id_operador;
                            if (typeof maybeId === 'number') opId = maybeId;
                          }

                          const op = opId != null ? operadores.find((o) => o.id_operador === opId) : undefined;
                          return op ? op.nombre_operador : '';
                        })()}
                      </td>
                      <td className="px-4 py-2 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => startEdit(equipo)}
                          className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(equipo)}
                          className="rounded border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {equipos.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-center text-slate-500">
                        No hay equipos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {filteredEquipos.length > pageSize && (
                <div className="flex items-center justify-center gap-1 border-t border-slate-200 bg-slate-50 px-3 py-2 text-xs">
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
            </>
          )}
        </div>
      )}

      {showForm && (
        <div className="rounded border border-slate-200 bg-white p-4 shadow animate-fade-in">
          <h2 className="mb-3 text-lg font-medium">
            {editing ? 'Editar equipo' : 'Nuevo equipo'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="nombre">
                Nombre
              </label>
              <input
                id="nombre"
                type="text"
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="tecnico">
                Tecnico
              </label>
              <select
                id="tecnico"
                value={formTecnico}
                onChange={(e) => setFormTecnico(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Sin tecnico asignado</option>
                {tecnicos.map((tecnico) => (
                  <option key={tecnico.id_tecnico} value={tecnico.nombre_tecnico}>
                    {tecnico.nombre_tecnico} ({tecnico.id_tecnico_empresa})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="operador">
                Operador
              </label>
              <select
                id="operador"
                value={formOperador}
                onChange={(e) => setFormOperador(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              >
                <option value="">Sin operador asignado</option>
                {operadores.map((operador) => (
                  <option key={operador.id_operador} value={operador.id_operador}>
                    {operador.nombre_operador}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="serie">
                Número de serie
              </label>
              <input
                id="serie"
                type="text"
                value={formSerie}
                onChange={(e) => setFormSerie(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
              >
                Volver a la lista
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
              )}
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
