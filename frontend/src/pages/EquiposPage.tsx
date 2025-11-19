import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api/client';

interface Equipo {
  id_equipos: number;
  nombre: string;
  numero_serie_equipo: string;
  tecnico: string;
}

interface Tecnico {
  id_tecnico: number;
  nombre_tecnico: string;
  id_tecnico_empresa: string;
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
      equipo.numero_serie_equipo.toLowerCase().includes(term)
    );
  });

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

    setImporting(true);
    setError(null);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' });

      for (const row of rows) {
        const nombre = (row['Nombre'] ?? '').toString().trim();
        const serie = (row['Num Serie'] ?? '').toString().trim();

        if (!nombre || !serie) {
          continue;
        }

        try {
          await api.post('/equipos/', {
            nombre,
            numero_serie_equipo: serie,
            tecnico: '',
          });
        } catch (rowErr) {
          console.error('Error creando equipo desde Excel', rowErr, row);
        }
      }

      await loadEquipos();
      e.target.value = '';
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
  }, []);

  const resetForm = () => {
    setEditing(null);
    setFormNombre('');
    setFormSerie('');
    setFormTecnico('');
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
        });
      } else {
        await api.post('/equipos/', {
          nombre: formNombre,
          numero_serie_equipo: formSerie,
          tecnico: formTecnico,
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
              placeholder="Buscar por ID, nombre o N.º serie..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full max-w-xs rounded border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button
              type="button"
              onClick={handleExportExcel}
              className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
            >
              Exportar Excel
            </button>
            <label className="flex items-center gap-2 rounded border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800 cursor-pointer">
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
        <div className="overflow-hidden rounded border border-slate-800 bg-slate-950/60 shadow animate-fade-in">
          {loading && <p className="p-4 text-sm text-slate-300">Cargando equipos...</p>}
          {error && !loading && <p className="p-4 text-sm text-red-400">{error}</p>}
          {!loading && !error && (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">ID</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">Nombre</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">N.º serie</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">Tecnico</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-300">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredEquipos.map((equipo) => (
                  <tr
                    key={equipo.id_equipos}
                    className="border-t border-slate-800 transition-colors hover:bg-slate-900/70"
                  >
                    <td className="px-4 py-2 text-slate-100">{equipo.id_equipos}</td>
                    <td className="px-4 py-2 text-slate-100">{equipo.nombre}</td>
                    <td className="px-4 py-2 text-slate-100">{equipo.numero_serie_equipo}</td>
                    <td className="px-4 py-2 text-slate-100">{equipo.tecnico}</td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => startEdit(equipo)}
                        className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(equipo)}
                        className="rounded border border-red-700 px-3 py-1 text-xs text-red-200 hover:bg-red-800/70"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {equipos.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-4 text-center text-slate-400">
                      No hay equipos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showForm && (
        <div className="rounded border border-slate-800 bg-slate-950/70 p-4 shadow animate-fade-in">
          <h2 className="mb-3 text-lg font-medium">
            {editing ? 'Editar equipo' : 'Nuevo equipo'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="nombre">
                Nombre
              </label>
              <input
                id="nombre"
                type="text"
                value={formNombre}
                onChange={(e) => setFormNombre(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="tecnico">
                Tecnico
              </label>
              <select
                id="tecnico"
                value={formTecnico}
                onChange={(e) => setFormTecnico(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
              <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="serie">
                Número de serie
              </label>
              <input
                id="serie"
                type="text"
                value={formSerie}
                onChange={(e) => setFormSerie(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
                className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
              >
                Volver a la lista
              </button>
              {editing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
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
