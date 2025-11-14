import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api/client';

interface Operador {
  id_operador: number;
  nombre_operador: string;
}

export const OperadoresPage: React.FC = () => {
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [nombre, setNombre] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Operador | null>(null);
  const [search, setSearch] = useState('');

  const loadOperadores = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/operador/');
      const data = (response.data?.results ?? response.data) as Operador[];
      setOperadores(data);
    } catch (err) {
      console.error('Error cargando operadores', err);
      setError('No se pudieron cargar los operadores.');
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    const rows = filteredOperadores.map((op) => ({
      ID: op.id_operador,
      Nombre: op.nombre_operador,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Operadores');
    XLSX.writeFile(workbook, 'operadores.xlsx');
  };

  const filteredOperadores = operadores.filter((op) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      op.id_operador.toString().includes(term) ||
      op.nombre_operador.toLowerCase().includes(term)
    );
  });

  useEffect(() => {
    loadOperadores();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (editing) {
        await api.put(`/operador/${editing.id_operador}/`, { nombre_operador: nombre });
      } else {
        await api.post('/operador/', { nombre_operador: nombre });
      }
      setNombre('');
      await loadOperadores();
      setEditing(null);
      setShowForm(false);
    } catch (err) {
      console.error('Error guardando operador', err);
      setError('No se pudo guardar el operador.');
    } finally {
      setSaving(false);
    }
  };

  const startCreate = () => {
    setEditing(null);
    setNombre('');
    setShowForm(true);
  };

  const startEdit = (op: Operador) => {
    setEditing(op);
    setNombre(op.nombre_operador);
    setShowForm(true);
  };

  const handleDelete = async (op: Operador) => {
    if (!window.confirm(`¿Eliminar el operador "${op.nombre_operador}"?`)) return;

    try {
      await api.delete(`/operador/${op.id_operador}/`);
      await loadOperadores();
    } catch (err) {
      console.error('Error eliminando operador', err);
      setError('No se pudo eliminar el operador.');
    }
  };

  return (
    <div className="p-4 animate-fade-in space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Operadores</h1>
        {!showForm && (
          <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center md:justify-end">
            <input
              type="text"
              placeholder="Buscar por ID o nombre..."
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
              onClick={startCreate}
              className="rounded bg-primary-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-primary-400 transition-transform hover:-translate-y-0.5"
            >
              Nuevo operador
            </button>
          </div>
        )}
      </div>

      {!showForm && (
        <div className="overflow-hidden rounded border border-slate-800 bg-slate-950/60 shadow">
          {loading && <p className="p-4 text-sm text-slate-300">Cargando operadores...</p>}
          {error && !loading && <p className="p-4 text-sm text-red-400">{error}</p>}
          {!loading && !error && (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">ID</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">Nombre</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-300">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredOperadores.map((op) => (
                  <tr key={op.id_operador} className="border-t border-slate-800 hover:bg-slate-900/70">
                    <td className="px-4 py-2 text-slate-100">{op.id_operador}</td>
                    <td className="px-4 py-2 text-slate-100">{op.nombre_operador}</td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => startEdit(op)}
                        className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(op)}
                        className="rounded border border-red-700 px-3 py-1 text-xs text-red-200 hover:bg-red-800/70"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {operadores.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-4 py-4 text-center text-slate-400">
                      No hay operadores registrados.
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
          <h2 className="mb-3 text-lg font-medium">{editing ? 'Editar operador' : 'Nuevo operador'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="nombre-op">
                Nombre del operador
              </label>
              <input
                id="nombre-op"
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
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
