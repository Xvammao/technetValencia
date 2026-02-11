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

  const [editing, setEditing] = useState<Tecnico | null>(null);
  const [nombre, setNombre] = useState('');
  const [codigo, setCodigo] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

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

  const totalPages = Math.max(1, Math.ceil(filteredTecnicos.length / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedTecnicos = filteredTecnicos.slice(startIndex, startIndex + pageSize);

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

  const resetForm = () => {
    setEditing(null);
    setNombre('');
    setCodigo('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editing) {
        await api.put(`/tecnicos/${editing.id_tecnico}/`, {
          nombre_tecnico: nombre,
          id_tecnico_empresa: codigo,
        });
      } else {
        await api.post('/tecnicos/', {
          nombre_tecnico: nombre,
          id_tecnico_empresa: codigo,
        });
      }

      resetForm();
      setShowForm(false);
      await loadTecnicos();
    } catch (err) {
      console.error('Error guardando técnico', err);
      setError('No se pudo guardar el técnico.');
    } finally {
      setSaving(false);
    }
  };

  const startCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const startEdit = (tec: Tecnico) => {
    setEditing(tec);
    setNombre(tec.nombre_tecnico);
    setCodigo(tec.id_tecnico_empresa);
    setShowForm(true);
  };

  const handleDelete = async (tec: Tecnico) => {
    if (!window.confirm(`¿Eliminar el técnico "${tec.nombre_tecnico}"?`)) return;

    try {
      await api.delete(`/tecnicos/${tec.id_tecnico}/`);
      await loadTecnicos();
    } catch (err) {
      console.error('Error eliminando técnico', err);
      setError('No se pudo eliminar el técnico.');
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
              className="w-full max-w-xs rounded border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
            <button
              type="button"
              onClick={handleExportExcel}
              className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
            >
              Exportar Excel
            </button>
            <button
              type="button"
              onClick={startCreate}
              className="rounded bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-400 transition-transform hover:-translate-y-0.5"
            >
              Nuevo técnico
            </button>
          </div>
        )}
      </div>

      {!showForm && (
        <div className="overflow-hidden rounded border border-slate-200 bg-white shadow">
          {loading && <p className="p-4 text-sm text-slate-500">Cargando técnicos...</p>}
          {error && !loading && <p className="p-4 text-sm text-red-500">{error}</p>}
          {!loading && !error && (
            <>
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">ID</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Nombre</th>
                    <th className="px-4 py-2 text-left font-medium text-slate-700">Código empresa</th>
                    <th className="px-4 py-2 text-right font-medium text-slate-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTecnicos.map((tec) => (
                    <tr key={tec.id_tecnico} className="border-t border-slate-200 hover:bg-slate-50">
                      <td className="px-4 py-2 text-slate-800">{tec.id_tecnico}</td>
                      <td className="px-4 py-2 text-slate-800">{tec.nombre_tecnico}</td>
                      <td className="px-4 py-2 text-slate-800">{tec.id_tecnico_empresa}</td>
                      <td className="px-4 py-2 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => startEdit(tec)}
                          className="rounded border border-slate-300 px-3 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(tec)}
                          className="rounded border border-red-200 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                  {tecnicos.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-4 text-center text-slate-500">
                        No hay técnicos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {filteredTecnicos.length > pageSize && (
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
        <div className="rounded border border-slate-200 bg-white p-4 shadow">
          <h2 className="mb-3 text-lg font-medium">
            {editing ? 'Editar técnico' : 'Nuevo técnico'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="nombre-tec">
                Nombre del técnico
              </label>
              <input
                id="nombre-tec"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700" htmlFor="codigo-tec">
                Código de técnico en la empresa
              </label>
              <input
                id="codigo-tec"
                type="text"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value)}
                className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <div className="flex justify-end gap-2 pt-2">
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
