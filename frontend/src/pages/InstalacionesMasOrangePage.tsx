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
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

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
                {["OT", "Operador", "Tipo", "Fecha de cierre", "Técnico asignado"].map(
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
                </tr>
              ))}
              {filteredInstalaciones.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-500">
                    No hay instalaciones para mostrar.
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
