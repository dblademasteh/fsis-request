import { useState, useRef, useCallback } from "react";
import type { Personnel } from "../types";
import { importPersonnel, deletePersonnel } from "../api";
import { Users, Upload, Trash2, Search, FileText, AlertCircle, CheckCircle2, X, Download } from "lucide-react";

interface Props {
  personnel: Personnel[];
  onUpdated: () => void;
}

const CSV_HEADERS = ["first_name", "middle_name", "last_name", "suffix", "rank", "designation", "account_number", "email", "station"];

export default function PersonnelManager({ personnel, onUpdated }: Props) {
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; message: string } | null>(null);
  const [preview, setPreview] = useState<Omit<Personnel, "id" | "created_at">[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = personnel.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      `${p.first_name} ${p.middle_name || ""} ${p.last_name} ${p.suffix || ""}`.toLowerCase().includes(q) ||
      p.account_number?.toLowerCase().includes(q) ||
      p.email?.toLowerCase().includes(q) ||
      p.rank?.toLowerCase().includes(q) ||
      p.station?.toLowerCase().includes(q) ||
      p.designation?.toLowerCase().includes(q)
    );
  });

  function parseCSV(text: string): Omit<Personnel, "id" | "created_at">[] {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, "_"));
    const rows: Omit<Personnel, "id" | "created_at">[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(",").map((v) => v.trim());
      if (values.length < 3) continue;

      const row: Record<string, string> = {};
      headers.forEach((h, idx) => {
        row[h] = values[idx] || "";
      });

      if (!row.first_name && !row.last_name) continue;

      rows.push({
        first_name: row.first_name || "",
        middle_name: row.middle_name || null,
        last_name: row.last_name || "",
        suffix: row.suffix || null,
        rank: row.rank || null,
        designation: row.designation || null,
        account_number: row.account_number || null,
        email: row.email || null,
        station: row.station || null,
      });
    }

    return rows;
  }

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) {
        setImportResult({ success: false, message: "No valid rows found. Check your CSV format." });
        return;
      }
      setPreview(rows);
      setImportResult(null);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    setImportResult(null);
    try {
      const result = await importPersonnel(preview);
      setImportResult({ success: true, message: `Successfully imported ${result.imported} personnel records.` });
      setPreview(null);
      onUpdated();
    } catch {
      setImportResult({ success: false, message: "Failed to import personnel. Please try again." });
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this personnel record?")) return;
    try {
      await deletePersonnel(id);
      onUpdated();
    } catch {
      setImportResult({ success: false, message: "Failed to delete personnel. Please try again." });
      setTimeout(() => setImportResult(null), 3000);
    }
  };

  const downloadTemplate = () => {
    const csv = [CSV_HEADERS.join(","), "Juan,Dela,Cruz Jr,SFO3,Inspector,2024-0001,juan.cruz@bfp.gov.ph,Tuguegarao City Fire Station"].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "personnel_template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-base-100 rounded-2xl border border-base-300 overflow-hidden animate-[fadeUp_0.35s_ease-out_both]">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-base-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-secondary/10 p-2 sm:p-2.5 rounded-xl">
              <Users className="h-4 w-4 sm:h-5 sm:w-5 text-secondary" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-base-content">Personnel Directory</h2>
              <p className="text-xs sm:text-sm text-base-content/50">{personnel.length} personnel record{personnel.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button onClick={downloadTemplate} className="btn btn-outline btn-xs sm:btn-sm gap-1.5 sm:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1">
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Template</span>
            </button>
            <button onClick={() => fileRef.current?.click()} className="btn btn-primary btn-xs sm:btn-sm gap-1.5 sm:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1">
              <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Import CSV</span>
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/40" />
          <input
            type="text"
            placeholder="Search by name, rank, account #, station..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input input-bordered w-full pl-9 bg-base-200 focus:bg-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
          />
        </div>
      </div>

      {/* Import Result */}
      {importResult && (
        <div className={`mx-6 mt-4 px-4 py-3 rounded-xl flex items-center gap-2 text-sm ${importResult.success ? "bg-success/10 text-success border border-success/20" : "bg-error/10 text-error border border-error/20"}`}>
          {importResult.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
          <span className="flex-1">{importResult.message}</span>
          <button onClick={() => setImportResult(null)} className="p-1 hover:opacity-70"><X className="h-3.5 w-3.5" /></button>
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="mx-6 mt-4 bg-secondary/5 border border-secondary/20 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-secondary/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium text-base-content">Preview: {preview.length} records to import</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setPreview(null)} className="btn btn-ghost btn-xs">Cancel</button>
              <button onClick={handleImport} disabled={importing} className="btn btn-primary btn-xs gap-1">
                {importing ? <span className="loading loading-spinner loading-xs" /> : <Upload className="h-3 w-3" />}
                Confirm Import
              </button>
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            <div className="overflow-x-auto">
              <table className="table table-xs">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Rank</th>
                    <th>Account #</th>
                    <th>Station</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.slice(0, 10).map((row, i) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap">{[row.first_name, row.middle_name, row.last_name, row.suffix].filter(Boolean).join(" ")}</td>
                      <td className="whitespace-nowrap">{row.rank || "\u2014"}</td>
                      <td className="font-mono text-xs whitespace-nowrap">{row.account_number || "\u2014"}</td>
                      <td className="truncate max-w-[120px] sm:max-w-[150px]">{row.station || "\u2014"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {preview.length > 10 && (
              <div className="text-center py-2 text-xs text-base-content/40">...and {preview.length - 10} more records</div>
            )}
          </div>
        </div>
      )}

      {/* Personnel List */}
      {personnel.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="bg-base-200 p-4 rounded-2xl">
            <Users className="h-10 w-10 text-base-content/15" />
          </div>
          <p className="text-sm text-base-content/40">No personnel records yet. Import a CSV to get started.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <Search className="h-8 w-8 text-base-content/15 mx-auto mb-2" />
          <p className="text-sm text-base-content/40">No results match your search.</p>
        </div>
      ) : (
        <div className="divide-y divide-base-200">
          {filtered.map((p) => (
            <div key={p.id} className="px-4 sm:px-6 py-2.5 sm:py-3 hover:bg-base-200/50 transition-colors duration-150 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-secondary/10 text-secondary rounded-xl w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center shrink-0">
                  <span className="text-[10px] sm:text-xs font-bold">{p.first_name[0]}{p.last_name[0]}</span>
                </div>
                <div className="min-w-0">
                  <div className="font-medium text-xs sm:text-sm text-base-content truncate">
                    {[p.first_name, p.middle_name, p.last_name, p.suffix].filter(Boolean).join(" ")}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-3 gap-y-0.5 text-[10px] sm:text-xs text-base-content/45">
                    {p.rank && <span>{p.rank}</span>}
                    {p.designation && <span>{p.designation}</span>}
                    {p.account_number && <span className="font-mono">{p.account_number}</span>}
                    {p.station && <span className="truncate max-w-[100px] sm:max-w-[180px]">{p.station}</span>}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleDelete(p.id)}
                className="btn btn-ghost btn-xs text-error/60 hover:text-error hover:bg-error/10 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-1"
                aria-label="Delete personnel"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
