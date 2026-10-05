import React, { useEffect, useState } from "react";
import * as XLSX from "xlsx";
import { api } from "../api/client";

interface InstalacionMasOrange {
  id: number;
  ot: string;
  operador: string;
  tipo: string;
  fecha_cierre: string | null;
  tecnico_asignado: string;
  equipo_serial: string;
  desco: boolean;
  desco_serial: string;
  tarjetas_sim: boolean;
  seriales_tarjetas_sim: string[];
  acometida_id: number | null;
}

interface Equipo {
  id_equipos: number;
  nombre: string;
  numero_serie_equipo: string;
}

interface Acometida {
  id: number;
  acometida: string;
  valor_tecnico: string | null;
  valor_empresa: string | null;
}

const normalizeHeader = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const getCell = (row: Record<string, unknown>, names: string[]) => {
  const acceptedHeaders = new Set(names.map(normalizeHeader));
  const header = Object.keys(row).find((key) =>
    acceptedHeaders.has(normalizeHeader(key)),
  );
  return header ? String(row[header] ?? "").trim() : "";
};

const parseDate = (value: string): string | null => {
  if (!value) return null;

  const excelSerial = Number(value);
  if (Number.isInteger(excelSerial) && excelSerial > 20000 && excelSerial < 80000) {
    const parsed = XLSX.SSF.parse_date_code(excelSerial);
    if (parsed) {
      return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(
        parsed.d,
      ).padStart(2, "0")}`;
    }
  }

  const dayFirst = value.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dayFirst) {
    const [, day, month, year] = dayFirst;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
};

export const InstalacionesMasOrangePage: React.FC = () => {
  const [instalaciones, setInstalaciones] = useState<InstalacionMasOrange[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<InstalacionMasOrange | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [acometidas, setAcometidas] = useState<Acometida[]>([]);
  const [catalogosCargados, setCatalogosCargados] = useState(false);
  const [form, setForm] = useState({
    ot: "",
    operador: "",
    tipo: "",
    fecha_cierre: "",
    tecnico_asignado: "",
    equipo_serial: "",
    desco: false,
    desco_serial: "",
    tarjetas_sim: false,
    seriales_tarjetas_sim: [] as string[],
    acometida_id: "",
  });

  const loadInstalaciones = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get("/instalaciones-masorange/");
      setInstalaciones(
        (response.data?.results ?? response.data) as InstalacionMasOrange[],
      );
    } catch (err) {
      console.error("Error cargando instalaciones MasOrange", err);
      setError("No se pudieron cargar las instalaciones MasOrange.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInstalaciones();
    const loadCatalogs = async () => {
      try {
        const [equiposResponse, acometidasResponse] = await Promise.all([
          api.get("/equipos/"),
          api.get("/acometidas/"),
        ]);
        setEquipos(
          (equiposResponse.data?.results ?? equiposResponse.data) as Equipo[],
        );
        setAcometidas(
          (acometidasResponse.data?.results ??
            acometidasResponse.data) as Acometida[],
        );
        setCatalogosCargados(true);
      } catch (err) {
        console.error("Error cargando equipos y acometidas MasOrange", err);
        setError("No se pudieron cargar el inventario y las acometidas.");
      }
    };
    loadCatalogs();
  }, []);

  const filteredInstalaciones = instalaciones.filter((item) => {
    const term = search.trim().toLowerCase();
    return (
      !term ||
      item.ot.toLowerCase().includes(term) ||
      item.operador.toLowerCase().includes(term) ||
      item.tipo.toLowerCase().includes(term) ||
      item.tecnico_asignado.toLowerCase().includes(term)
    );
  });

  const handleExport = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      filteredInstalaciones.map(({ ot, operador, tipo, fecha_cierre, tecnico_asignado }) => ({
        OT: ot,
        Operador: operador,
        Tipo: tipo,
        Fecha_cierre: fecha_cierre ?? "",
        Tecnico_asignado: tecnico_asignado,
      })),
    );
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Instalaciones");
    XLSX.writeFile(workbook, "instalaciones-masorange.xlsx");
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      ot: "",
      operador: "",
      tipo: "",
      fecha_cierre: "",
      tecnico_asignado: "",
      equipo_serial: "",
      desco: false,
      desco_serial: "",
      tarjetas_sim: false,
      seriales_tarjetas_sim: [],
      acometida_id: "",
    });
    setError(null);
    setShowForm(true);
  };

  const openEdit = (item: InstalacionMasOrange) => {
    setEditing(item);
    setForm({
      ot: item.ot,
      operador: item.operador,
      tipo: item.tipo,
      fecha_cierre: item.fecha_cierre ?? "",
      tecnico_asignado: item.tecnico_asignado,
      equipo_serial: item.equipo_serial ?? "",
      desco: item.desco ?? false,
      desco_serial: item.desco_serial ?? "",
      tarjetas_sim: item.tarjetas_sim ?? false,
      seriales_tarjetas_sim: item.seriales_tarjetas_sim ?? [],
      acometida_id: item.acometida_id ? String(item.acometida_id) : "",
    });
    setError(null);
    setShowForm(true);
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!catalogosCargados) {
      setError("Espera a que carguen el inventario y las acometidas.");
      return;
    }
    const equipo = equipos.find(
      (item) =>
        item.numero_serie_equipo.trim().toLowerCase() ===
        form.equipo_serial.trim().toLowerCase(),
    );
    if (!equipo) {
      setError(
        `El equipo con serial "${form.equipo_serial.trim()}" no existe en equipos.`,
      );
      return;
    }
    if (form.desco) {
      const equipoDesco = equipos.find(
        (item) =>
          item.numero_serie_equipo.trim().toLowerCase() ===
          form.desco_serial.trim().toLowerCase(),
      );
      if (!form.desco_serial.trim() || !equipoDesco) {
        setError(
          `El serial DESCO "${form.desco_serial.trim()}" no existe en equipos.`,
        );
        return;
      }
    }
    if (
      form.tarjetas_sim &&
      (form.seriales_tarjetas_sim.length === 0 ||
        form.seriales_tarjetas_sim.some((serial) => !serial.trim()))
    ) {
      setError("Completa el serial de cada tarjeta SIM.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        equipo_serial: equipo.numero_serie_equipo,
        desco_serial: form.desco ? form.desco_serial.trim() : "",
        seriales_tarjetas_sim: form.tarjetas_sim
          ? form.seriales_tarjetas_sim.map((serial) => serial.trim())
          : [],
        acometida_id: form.acometida_id
          ? Number(form.acometida_id)
          : null,
        fecha_cierre: form.fecha_cierre || null,
      };
      if (editing) {
        await api.put(`/instalaciones-masorange/${editing.id}/`, payload);
      } else {
        await api.post("/instalaciones-masorange/", payload);
      }
      setShowForm(false);
      setEditing(null);
      await loadInstalaciones();
    } catch (err) {
      console.error("Error guardando instalación MasOrange", err);
      const responseData = (
        err as { response?: { data?: Record<string, unknown> } }
      ).response?.data;
      setError(
        responseData
          ? Object.values(responseData).flat().join(" ")
          : "No se pudo guardar la instalación.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: InstalacionMasOrange) => {
    if (!window.confirm(`¿Eliminar la instalación OT ${item.ot}?`)) return;
    try {
      await api.delete(`/instalaciones-masorange/${item.id}/`);
      await loadInstalaciones();
    } catch (err) {
      console.error("Error eliminando instalación MasOrange", err);
      setError("No se pudo eliminar la instalación.");
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setError(null);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!firstSheet) {
        throw new Error("El archivo no contiene hojas con datos.");
      }

      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(
        firstSheet,
        { defval: "", raw: false },
      );
      if (rows.length === 0) {
        throw new Error("La primera hoja no contiene registros.");
      }

      const imported: InstalacionMasOrange[] = [];
      const rowErrors: string[] = [];
      for (const [index, row] of rows.entries()) {
        const ot = getCell(row, ["ot"]);
        const operador = getCell(row, ["operador"]);
        const tipo = getCell(row, ["tipo"]);
        const rawDate = getCell(row, ["fecha_cierre", "fecha cierre"]);
        const tecnicoAsignado = getCell(row, [
          "tecnico_asignado",
          "tecnico asignado",
        ]);
        const fechaCierre = parseDate(rawDate);

        if (!ot || !operador || !tipo || !tecnicoAsignado) {
          rowErrors.push(
            `Fila ${index + 2}: se requieren OT, Operador, Tipo y Técnico asignado.`,
          );
          continue;
        }
        if (rawDate && !fechaCierre) {
          rowErrors.push(`Fila ${index + 2}: la fecha de cierre no es válida.`);
          continue;
        }

        try {
          const response = await api.post("/instalaciones-masorange/", {
            ot,
            operador,
            tipo,
            fecha_cierre: fechaCierre,
            tecnico_asignado: tecnicoAsignado,
          });
          imported.push(response.data as InstalacionMasOrange);
        } catch (err) {
          console.error(`Error importando instalación en fila ${index + 2}`, err);
          rowErrors.push(`Fila ${index + 2}: no se pudo guardar la OT ${ot}.`);
        }
      }

      await loadInstalaciones();
      if (rowErrors.length > 0) {
        setError(
          `Se importaron ${imported.length} de ${rows.length} filas. ${rowErrors.slice(0, 5).join(" ")}`,
        );
      }
    } catch (err) {
      console.error("Error importando Excel de instalaciones MasOrange", err);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo importar el archivo Excel.",
      );
    } finally {
      setImporting(false);
      event.target.value = "";
    }
  };

  return (
    <div className="animate-fade-in space-y-4 p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-semibold">Instalaciones MasOrange</h1>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar OT, operador, tipo o técnico..."
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={handleExport}
            className="rounded border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            Exportar Excel
          </button>
          <label className="cursor-pointer rounded bg-primary-500 px-4 py-2 text-center text-sm font-medium text-white hover:bg-primary-400">
            {importing ? "Importando..." : "Importar Excel"}
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImport}
              disabled={importing}
              className="hidden"
            />
          </label>
          <button
            type="button"
            onClick={openCreate}
            className="rounded bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-400"
          >
            Nueva instalación
          </button>
        </div>
      </div>
      <p className="text-sm text-slate-500">
        El nombre del archivo puede variar. La primera hoja debe incluir las
        columnas OT, Operador, Tipo, Fecha_cierre y Tecnico_asignado.
      </p>
      {error && <p className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="overflow-x-auto rounded border border-slate-200 bg-white shadow">
        {loading ? (
          <p className="p-4 text-sm text-slate-500">Cargando instalaciones...</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                {["OT", "Operador", "Tipo", "Fecha de cierre", "Técnico asignado", "Equipo", "Acciones"].map(
                  (heading) => (
                    <th key={heading} className="px-4 py-2 text-left font-medium text-slate-700">
                      {heading}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {filteredInstalaciones.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-2">{item.ot}</td>
                  <td className="px-4 py-2">{item.operador}</td>
                  <td className="px-4 py-2">{item.tipo}</td>
                  <td className="px-4 py-2">{item.fecha_cierre ?? ""}</td>
                  <td className="px-4 py-2">{item.tecnico_asignado}</td>
                  <td className="px-4 py-2">{item.equipo_serial || "—"}</td>
                  <td className="space-x-3 px-4 py-2 text-right">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="text-primary-700 hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="text-red-600 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {filteredInstalaciones.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-slate-500">
                    No hay instalaciones para mostrar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="masorange-form-title"
            className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg bg-white p-5 shadow-xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 id="masorange-form-title" className="text-lg font-semibold">
                {editing ? `Editar OT ${editing.ot}` : "Nueva instalación MasOrange"}
              </h2>
              <button
                type="button"
                aria-label="Cerrar formulario"
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  setError(null);
                }}
                className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                {(
                  [
                    ["ot", "OT"],
                    ["operador", "Operador"],
                    ["tipo", "Tipo"],
                    ["tecnico_asignado", "Técnico asignado"],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field}>
                    <label
                      htmlFor={`masorange-${field}`}
                      className="mb-1 block text-xs font-medium text-slate-700"
                    >
                      {label}
                    </label>
                    <input
                      id={`masorange-${field}`}
                      required
                      value={form[field]}
                      onChange={(event) =>
                        setForm({ ...form, [field]: event.target.value })
                      }
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>
                ))}
                <div>
                  <label
                    htmlFor="masorange-fecha"
                    className="mb-1 block text-xs font-medium text-slate-700"
                  >
                    Fecha de cierre
                  </label>
                  <input
                    id="masorange-fecha"
                    type="date"
                    value={form.fecha_cierre}
                    onChange={(event) =>
                      setForm({ ...form, fecha_cierre: event.target.value })
                    }
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label
                    htmlFor="masorange-equipo"
                    className="mb-1 block text-xs font-medium text-slate-700"
                  >
                    Equipo (serial de equipos)
                  </label>
                  <input
                    id="masorange-equipo"
                    required
                    list="masorange-equipment-serials"
                    value={form.equipo_serial}
                    onChange={(event) =>
                      setForm({ ...form, equipo_serial: event.target.value })
                    }
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                  <datalist id="masorange-equipment-serials">
                    {equipos.map((equipo) => (
                      <option
                        key={equipo.id_equipos}
                        value={equipo.numero_serie_equipo}
                      >
                        {equipo.nombre}
                      </option>
                    ))}
                  </datalist>
                  {form.equipo_serial.trim() && catalogosCargados && (
                    <p
                      role="status"
                      className={`mt-1 text-xs ${
                        equipos.some(
                          (equipo) =>
                            equipo.numero_serie_equipo.toLowerCase() ===
                            form.equipo_serial.trim().toLowerCase(),
                        )
                          ? "text-emerald-700"
                          : "text-red-600"
                      }`}
                    >
                      {equipos.some(
                        (equipo) =>
                          equipo.numero_serie_equipo.toLowerCase() ===
                          form.equipo_serial.trim().toLowerCase(),
                      )
                        ? "Equipo encontrado en el inventario."
                        : "Este serial no existe en equipos."}
                    </p>
                  )}
                </div>
              </div>

              <section className="space-y-4 rounded border border-slate-200 bg-slate-50 p-4">
                <h3 className="text-sm font-semibold text-slate-800">
                  Equipo adicional
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="masorange-desco"
                      className="mb-1 block text-xs font-medium text-slate-700"
                    >
                      ¿Incluye DESCO?
                    </label>
                    <select
                      id="masorange-desco"
                      value={form.desco ? "si" : "no"}
                      onChange={(event) => {
                        const answer = event.target.value === "si";
                        setForm({
                          ...form,
                          desco: answer,
                          desco_serial: answer ? form.desco_serial : "",
                        });
                      }}
                      className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="no">No</option>
                      <option value="si">Sí</option>
                    </select>
                  </div>
                  {form.desco && (
                    <div>
                      <label
                        htmlFor="masorange-desco-serial"
                        className="mb-1 block text-xs font-medium text-slate-700"
                      >
                        Serial del DESCO
                      </label>
                      <input
                        id="masorange-desco-serial"
                        required
                        list="masorange-equipment-serials"
                        value={form.desco_serial}
                        onChange={(event) =>
                          setForm({ ...form, desco_serial: event.target.value })
                        }
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                      {form.desco_serial.trim() && catalogosCargados && (
                        <p
                          role="status"
                          className={`mt-1 text-xs ${
                            equipos.some(
                              (equipo) =>
                                equipo.numero_serie_equipo.toLowerCase() ===
                                form.desco_serial.trim().toLowerCase(),
                            )
                              ? "text-emerald-700"
                              : "text-red-600"
                          }`}
                        >
                          {equipos.some(
                            (equipo) =>
                              equipo.numero_serie_equipo.toLowerCase() ===
                              form.desco_serial.trim().toLowerCase(),
                          )
                            ? "DESCO encontrado en el inventario."
                            : "Este serial no existe en equipos."}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label
                      htmlFor="masorange-sim"
                      className="mb-1 block text-xs font-medium text-slate-700"
                    >
                      ¿Incluye tarjetas SIM?
                    </label>
                    <select
                      id="masorange-sim"
                      value={form.tarjetas_sim ? "si" : "no"}
                      onChange={(event) => {
                        const answer = event.target.value === "si";
                        setForm({
                          ...form,
                          tarjetas_sim: answer,
                          seriales_tarjetas_sim: answer
                            ? form.seriales_tarjetas_sim
                            : [],
                        });
                      }}
                      className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="no">No</option>
                      <option value="si">Sí</option>
                    </select>
                  </div>
                  {form.tarjetas_sim && (
                    <div>
                      <label
                        htmlFor="masorange-sim-count"
                        className="mb-1 block text-xs font-medium text-slate-700"
                      >
                        Cantidad de tarjetas SIM
                      </label>
                      <input
                        id="masorange-sim-count"
                        type="number"
                        min="1"
                        step="1"
                        value={form.seriales_tarjetas_sim.length}
                        onChange={(event) => {
                          const count = Math.max(
                            0,
                            Math.floor(Number(event.target.value) || 0),
                          );
                          setForm({
                            ...form,
                            seriales_tarjetas_sim: Array.from(
                              { length: count },
                              (_, index) =>
                                form.seriales_tarjetas_sim[index] ?? "",
                            ),
                          });
                        }}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </div>
                {form.tarjetas_sim &&
                  form.seriales_tarjetas_sim.map((serial, index) => (
                    <div key={index}>
                      <label
                        htmlFor={`masorange-sim-serial-${index}`}
                        className="mb-1 block text-xs font-medium text-slate-700"
                      >
                        Serial SIM {index + 1}
                      </label>
                      <input
                        id={`masorange-sim-serial-${index}`}
                        required
                        value={serial}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            seriales_tarjetas_sim:
                              form.seriales_tarjetas_sim.map((value, itemIndex) =>
                                itemIndex === index
                                  ? event.target.value
                                  : value,
                              ),
                          })
                        }
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  ))}

                <div>
                  <label
                    htmlFor="masorange-acometida"
                    className="mb-1 block text-xs font-medium text-slate-700"
                  >
                    Acometida y precios
                  </label>
                  <select
                    id="masorange-acometida"
                    value={form.acometida_id}
                    onChange={(event) =>
                      setForm({ ...form, acometida_id: event.target.value })
                    }
                    className="w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="">Sin acometida</option>
                    {acometidas.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.acometida} — Técnico: {item.valor_tecnico ?? "Sin precio"} |
                        Empresa: {item.valor_empresa ?? "Sin precio"}
                      </option>
                    ))}
                  </select>
                </div>
              </section>

              {error && (
                <p className="rounded bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                    setError(null);
                  }}
                  className="rounded border border-slate-300 px-4 py-2 text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving || !catalogosCargados}
                  className="rounded bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-400 disabled:opacity-50"
                >
                  {saving ? "Guardando..." : editing ? "Guardar cambios" : "Crear"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};
