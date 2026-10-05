import React, { useEffect, useState } from "react";
import { api } from "../api/client";

interface Acometida {
  id: number;
  acometida: string;
  valor_tecnico: string | null;
  valor_empresa: string | null;
}

export const AxcometidasPage: React.FC = () => {
  const [items, setItems] = useState<Acometida[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Acometida | null>(null);
  const [form, setForm] = useState({
    acometida: "",
    valor_tecnico: "",
    valor_empresa: "",
  });

  const loadItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/acometidas/");
      setItems((response.data?.results ?? response.data) as Acometida[]);
    } catch (err) {
      console.error("Error cargando acometidas", err);
      setError("No se pudieron cargar los registros de acometidas.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const filteredItems = items.filter((item) =>
    [item.acometida, item.valor_tecnico ?? "", item.valor_empresa ?? ""]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );

  const startCreate = () => {
    setEditing(null);
    setForm({ acometida: "", valor_tecnico: "", valor_empresa: "" });
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await api.put(`/acometidas/${editing.id}/`, form);
      } else {
        await api.post("/acometidas/", form);
      }
      setEditing(null);
      setForm({ acometida: "", valor_tecnico: "", valor_empresa: "" });
      await loadItems();
    } catch (err) {
      console.error("Error guardando acometida", err);
      setError("No se pudo guardar el registro. Revisa los datos.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Acometida) => {
    if (!window.confirm(`¿Eliminar la acometida "${item.acometida}"?`)) return;
    try {
      await api.delete(`/acometidas/${item.id}/`);
      await loadItems();
    } catch (err) {
      console.error("Error eliminando acometida", err);
      setError("No se pudo eliminar la acometida.");
    }
  };

  return (
    <div className="animate-fade-in space-y-4 p-4">
      <h1 className="text-2xl font-semibold">Axcometidas</h1>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <form
        onSubmit={handleSubmit}
        className="grid gap-3 rounded border border-slate-200 bg-white p-4 shadow md:grid-cols-4"
      >
        <input
          required
          aria-label="Acometida"
          placeholder="Acometida"
          value={form.acometida}
          onChange={(event) => setForm({ ...form, acometida: event.target.value })}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          aria-label="Valor técnico"
          placeholder="Valor técnico"
          value={form.valor_tecnico}
          onChange={(event) => setForm({ ...form, valor_tecnico: event.target.value })}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          aria-label="Valor empresa"
          placeholder="Valor empresa"
          value={form.valor_empresa}
          onChange={(event) => setForm({ ...form, valor_empresa: event.target.value })}
          className="rounded border border-slate-300 px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-400 disabled:opacity-50"
          >
            {saving ? "Guardando..." : editing ? "Guardar cambios" : "Añadir"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={startCreate}
              className="rounded border border-slate-300 px-3 py-2 text-sm"
            >
              Cancelar
            </button>
          )}
        </div>
      </form>
      <div className="flex justify-end">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar acometida o valor..."
          className="w-full max-w-xs rounded border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </div>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white shadow">
        {loading ? (
          <p className="p-4 text-sm text-slate-500">Cargando acometidas...</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                {["Acometida", "Valor técnico", "Valor empresa", "Acciones"].map((heading) => (
                  <th key={heading} className="px-4 py-2 text-left font-medium text-slate-700">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{item.acometida}</td>
                  <td className="px-4 py-2">{item.valor_tecnico ?? ""}</td>
                  <td className="px-4 py-2">{item.valor_empresa ?? ""}</td>
                  <td className="space-x-3 px-4 py-2 text-right">
                    <button
                      type="button"
                      className="text-primary-700 hover:underline"
                      onClick={() => {
                        setEditing(item);
                        setForm({
                          acometida: item.acometida,
                          valor_tecnico: item.valor_tecnico ?? "",
                          valor_empresa: item.valor_empresa ?? "",
                        });
                        setError(null);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      className="text-red-600 hover:underline"
                      onClick={() => handleDelete(item)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-slate-500">
                    No hay acometidas para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
