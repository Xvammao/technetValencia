import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../api/client';

interface Orden {
  id_orden: number;
  tipo_orden: string;
  puntos_orden: string | null;
  valor_orden_tecnico: string | null;
  valor_orden_empresa: string | null;
}

export const OrdenesPage: React.FC = () => {
  const [ordenes, setOrdenes] = useState<Orden[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [tipo, setTipo] = useState('');
  const [puntos, setPuntos] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [valorTec, setValorTec] = useState('');
  const [valorEmp, setValorEmp] = useState('');
  const [editing, setEditing] = useState<Orden | null>(null);
  const [search, setSearch] = useState('');

  const loadOrdenes = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/ordenes/');
      const data = (response.data?.results ?? response.data) as Orden[];
      setOrdenes(data);
    } catch (err) {
      console.error('Error cargando órdenes', err);
      setError('No se pudieron cargar las órdenes.');
    } finally {
      setLoading(false);
    }
  };

  const filteredOrdenes = ordenes.filter((orden) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    return (
      orden.id_orden.toString().includes(term) ||
      orden.tipo_orden.toLowerCase().includes(term) ||
      (orden.puntos_orden ?? '').toString().toLowerCase().includes(term)
    );
  });

  const handleExportExcel = () => {
    const rows = filteredOrdenes.map((orden) => ({
      ID: orden.id_orden,
      'Tipo de orden': orden.tipo_orden,
      Puntos: orden.puntos_orden,
      'Valor técnico': orden.valor_orden_tecnico,
      'Valor empresa': orden.valor_orden_empresa,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Ordenes');
    XLSX.writeFile(workbook, 'ordenes.xlsx');
  };

  useEffect(() => {
    loadOrdenes();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const payload = {
        tipo_orden: tipo,
        puntos_orden: puntos || null,
        valor_orden_tecnico: valorTec || null,
        valor_orden_empresa: valorEmp || null,
      };

      if (editing) {
        await api.put(`/ordenes/${editing.id_orden}/`, payload);
      } else {
        await api.post('/ordenes/', payload);
      }
      setTipo('');
      setPuntos('');
      setValorTec('');
      setValorEmp('');
      await loadOrdenes();
      setEditing(null);
      setShowForm(false);
    } catch (err) {
      console.error('Error guardando orden', err);
      setError('No se pudo guardar la orden.');
    } finally {
      setSaving(false);
    }
  };

  const startCreate = () => {
    setEditing(null);
    setTipo('');
    setPuntos('');
    setValorTec('');
    setValorEmp('');
    setShowForm(true);
  };

  const startEdit = (orden: Orden) => {
    setEditing(orden);
    setTipo(orden.tipo_orden);
    setPuntos(orden.puntos_orden ?? '');
    setValorTec(orden.valor_orden_tecnico ?? '');
    setValorEmp(orden.valor_orden_empresa ?? '');
    setShowForm(true);
  };

  const handleDelete = async (orden: Orden) => {
    if (!window.confirm(`¿Eliminar la orden #${orden.id_orden}?`)) return;

    try {
      await api.delete(`/ordenes/${orden.id_orden}/`);
      await loadOrdenes();
    } catch (err) {
      console.error('Error eliminando orden', err);
      setError('No se pudo eliminar la orden.');
    }
  };

  return (
    <div className="p-4 animate-fade-in space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Órdenes</h1>
        {!showForm && (
          <div className="flex flex-1 flex-col gap-2 md:flex-row md:items-center md:justify-end">
            <input
              type="text"
              placeholder="Buscar por ID, tipo o puntos..."
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
              Nueva orden
            </button>
          </div>
        )}
      </div>

      {!showForm && (
        <div className="overflow-hidden rounded border border-slate-800 bg-slate-950/60 shadow">
          {loading && <p className="p-4 text-sm text-slate-300">Cargando órdenes...</p>}
          {error && !loading && <p className="p-4 text-sm text-red-400">{error}</p>}
          {!loading && !error && (
            <table className="min-w-full text-sm">
              <thead className="bg-slate-900/80">
                <tr>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">ID</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">Tipo</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">Puntos</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">Valor técnico</th>
                  <th className="px-4 py-2 text-left font-medium text-slate-300">Valor empresa</th>
                  <th className="px-4 py-2 text-right font-medium text-slate-300">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrdenes.map((orden) => (
                  <tr key={orden.id_orden} className="border-t border-slate-800 hover:bg-slate-900/70">
                    <td className="px-4 py-2 text-slate-100">{orden.id_orden}</td>
                    <td className="px-4 py-2 text-slate-100">{orden.tipo_orden}</td>
                    <td className="px-4 py-2 text-slate-100">{orden.puntos_orden}</td>
                    <td className="px-4 py-2 text-slate-100">{orden.valor_orden_tecnico ?? '-'}</td>
                    <td className="px-4 py-2 text-slate-100">{orden.valor_orden_empresa ?? '-'}</td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => startEdit(orden)}
                        className="rounded border border-slate-700 px-3 py-1 text-xs text-slate-200 hover:bg-slate-800"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(orden)}
                        className="rounded border border-red-700 px-3 py-1 text-xs text-red-200 hover:bg-red-800/70"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {ordenes.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-center text-slate-400">
                      No hay órdenes registradas.
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
          <h2 className="mb-3 text-lg font-medium">{editing ? 'Editar orden' : 'Nueva orden'}</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="tipo-ord">
                Tipo de orden
              </label>
              <input
                id="tipo-ord"
                type="text"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="puntos-ord">
                Puntos (opcional)
              </label>
              <input
                id="puntos-ord"
                type="number"
                step="0.01"
                value={puntos}
                onChange={(e) => setPuntos(e.target.value)}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="valor-tec-ord">
                Valor de la orden para el técnico (opcional)
              </label>
              <textarea
                id="valor-tec-ord"
                value={valorTec}
                onChange={(e) => setValorTec(e.target.value)}
                rows={2}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-300" htmlFor="valor-emp-ord">
                Valor de la orden para la empresa (opcional)
              </label>
              <textarea
                id="valor-emp-ord"
                value={valorEmp}
                onChange={(e) => setValorEmp(e.target.value)}
                rows={2}
                className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
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
