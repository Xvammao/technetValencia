import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api/client';

interface Tecnico {
  id_tecnico: number;
  nombre_tecnico: string;
  id_tecnico_empresa: string;
}

export const TecnicosPage: React.FC = () => {
  const [tecnicos, setTecnicos] = useState<Tecnico[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  const loadTecnicos = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/tecnicos/');
      const data = (response.data?.results ?? response.data) as Tecnico[];
      setTecnicos(data);
    } catch (err) {
      console.error('Error cargando técnicos', err);
      setError('No se pudieron cargar los técnicos.');
    } finally {
      setLoading(false);
    }
  };

  const filteredTecnicos = tecnicos.filter((tec) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      tec.id_tecnico.toString().includes(term) ||
      tec.nombre_tecnico.toLowerCase().includes(term) ||
      tec.id_tecnico_empresa.toLowerCase().includes(term)
    );
  });

  const handleExportExcel = () => {
    const rows = filteredTecnicos.map((tec) => ({
      ID: tec.id_tecnico,
      Nombre: tec.nombre_tecnico,
      'Código empresa': tec.id_tecnico_empresa,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Tecnicos');
    XLSX.writeFile(workbook, 'tecnicos.xlsx');
  };

  useEffect(() => {
    loadTecnicos();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await api.post('/tecnicos/', {
        nombre_tecnico: nombre,
        id_tecnico_empresa: codigo,
      });
      setNombre('');
      setCodigo('');
      await loadTecnicos();
    } catch (err) {
      console.error('Error creando técnico', err);
      setError('No se pudo crear el técnico.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 animate-fade-in space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Técnicos</h1>
        {!showForm && (
          <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center md:justify-end">
            <input
              type="text"
              placeholder="Buscar por ID, nombre o código..."
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
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="rounded bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-400 transition-transform hover:-translate-y-0.5"
            >
              Nuevo técnico
            </button>
          </div>
        )}
      </div>

      {!showForm && (
        <div className="overflow-hidden rounded border border-slate-800 bg-slate-950/60 shadow">
          {loading && <p className="p-4 text-sm text-slate-300">Cargando técnicos...</p>}
          {error && !loading && <p className="p-4 text-sm text-red-400">{error}</p>}
          {!loading && !error && (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">ID</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">Nombre</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">Código empresa</th>
                </tr>
              </thead>
              <tbody>
                {filteredTecnicos.map((tec) => (
                  <tr key={tec.id_tecnico} className="border-t border-slate-800 hover:bg-slate-900/70">
                    <td className="px-4 py-2 text-slate-100">{tec.id_tecnico}</td>
                    <td className="px-4 py-2 text-slate-100">{tec.nombre_tecnico}</td>
                    <td className="px-4 py-2 text-slate-100">{tec.id_tecnico_empresa}</td>
                  </tr>
                ))}
                {tecnicos.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-center text-slate-400">
                      No hay técnicos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      )}

      {showForm && (
        <div className="rounded border border-slate-800 bg-slate-950/70 p-4 shadow">
          <h2 className="mb-3 text-lg font-medium">Nuevo técnico</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="nombre-tec">
                Nombre del técnico
              </label>
              <input
                id="nombre-tec"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="codigo-tec">
                Código de técnico en la empresa
              </label>
              <input
                id="codigo-tec"
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
              >
                Volver a la lista
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded bg-primary-500 px-4 py-2 text-xs font-medium text-white shadow hover:bg-primary-400 disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
