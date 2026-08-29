import { useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import type { Personnel } from "../types";
import { RANK_OPTIONS, DESIGNATION_OPTIONS } from "../types";
import { importPersonnel, deletePersonnel, createPersonnel, updatePersonnel } from "../api";
import { ConfirmModal } from "./ConfirmModal";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { Users, Upload, Trash2, Search, FileText, AlertCircle, CheckCircle2, X, Download, Pencil, UserPlus } from "lucide-react";

interface Props {
  personnel: Personnel[];
  onUpdated: () => void;
}

const CSV_HEADERS = ["first_name", "middle_name", "last_name", "suffix", "rank", "designation", "account_number", "email", "station"];

type PersonnelForm = {
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  rank: string;
  designation: string;
  account_number: string;
  email: string;
  station: string;
};

const EMPTY_FORM: PersonnelForm = {
  first_name: "",
  middle_name: "",
  last_name: "",
  suffix: "",
  rank: "",
  designation: "",
  account_number: "",
  email: "",
  station: "",
};

export default function PersonnelManager({ personnel, onUpdated }: Props) {
  const [search, setSearch] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: "", show: false });
  const [deleteTarget, setDeleteTarget] = useState<{ show: boolean; p: Personnel | null }>({ show: false, p: null });
  const [preview, setPreview] = useState<Omit<Personnel, "id" | "created_at">[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Personnel | null>(null);
  const [form, setForm] = useState<PersonnelForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const showToast = useCallback((msg: string) => {
    setToast({ msg, show: true });
    setTimeout(() => setToast({ msg: "", show: false }), 3000);
  }, []);

  const showError = useCallback((msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 3000);
  }, []);

  const openCreate = useCallback(() => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((p: Personnel) => {
    setEditing(p);
    setForm({
      first_name: p.first_name || "",
      middle_name: p.middle_name || "",
      last_name: p.last_name || "",
      suffix: p.suffix || "",
      rank: p.rank || "",
      designation: p.designation || "",
      account_number: p.account_number || "",
      email: p.email || "",
      station: p.station || "",
    });
    setFormError(null);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditing(null);
    setFormError(null);
  }, []);

  useFocusTrap(modalOpen, modalRef, closeModal);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) {
      setFormError("First name and last name are required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const payload = {
      first_name: form.first_name.trim(),
      middle_name: form.middle_name.trim() || null,
      last_name: form.last_name.trim(),
      suffix: form.suffix.trim() || null,
      rank: form.rank || null,
      designation: form.designation || null,
      account_number: form.account_number.trim() || null,
      email: form.email.trim() || null,
      station: form.station || null,
    };
    try {
      if (editing) {
        await updatePersonnel(editing.id, payload);
        showToast(`Updated ${payload.first_name} ${payload.last_name}.`);
      } else {
        await createPersonnel(payload);
        showToast(`Added ${payload.first_name} ${payload.last_name}.`);
      }
      closeModal();
      onUpdated();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save personnel. Please try again.");
    } finally {
      setSaving(false);
    }
  };

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
        showError("No valid rows found. Check your CSV format.");
        return;
      }
      setPreview(rows);
      setError(null);
    };
    reader.readAsText(file);
    e.target.value = "";
  }, []);

  const handleImport = async () => {
    if (!preview) return;
    setImporting(true);
    try {
      const result = await importPersonnel(preview);
      showToast(`Successfully imported ${result.imported} personnel records.`);
      setPreview(null);
      onUpdated();
    } catch {
      showError("Failed to import personnel. Please try again.");
    } finally {
      setImporting(false);
    }
  };

  const requestDelete = useCallback((p: Personnel) => {
    setDeleteTarget({ show: true, p });
  }, []);

  const cancelDelete = useCallback(() => {
    setDeleteTarget({ show: false, p: null });
  }, []);

  const handleDelete = async () => {
    const p = deleteTarget.p;
    if (!p) return;
    try {
      await deletePersonnel(p.id);
      showToast(`Deleted ${[p.first_name, p.last_name].filter(Boolean).join(" ")}.`);
      onUpdated();
    } catch {
      showError("Failed to delete personnel. Please try again.");
    } finally {
      cancelDelete();
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
          <div className="flex items-stretch gap-2 self-start sm:self-auto w-full sm:w-auto max-sm:grid max-sm:grid-cols-2">
            <button onClick={downloadTemplate} className="btn btn-outline btn-sm gap-2 justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1">
              <Download className="h-4 w-4 shrink-0" />
              <span className="truncate">Template</span>
            </button>
            <button onClick={() => fileRef.current?.click()} className="btn btn-outline btn-sm gap-2 justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1">
              <Upload className="h-4 w-4 shrink-0" />
              <span className="truncate">Import CSV</span>
            </button>
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleFileChange} />
            <button onClick={openCreate} className="btn btn-primary btn-sm gap-2 justify-center max-sm:col-span-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1">
              <UserPlus className="h-4 w-4 shrink-0" />
              <span className="truncate">Add Personnel</span>
            </button>
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

      {/* Error Alert */}
      {error && (
        <div role="alert" className="mx-4 sm:mx-6 mt-4 px-3 py-2 rounded-xl bg-error/10 text-error border border-error/20 text-xs sm:text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
        </div>
      )}

      {/* Toast */}
      {toast.show && createPortal(
        <div role="alert" aria-live="polite" className="fixed top-4 right-4 z-[60] alert alert-success py-2 px-4 text-sm gap-3 shadow-lg animate-[slideIn_0.2s_ease-out]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{toast.msg}</span>
        </div>,
        document.body
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
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(p)}
                  className="btn btn-ghost btn-xs text-base-content/50 hover:text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                  aria-label="Edit personnel"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => requestDelete(p)}
                  className="btn btn-ghost btn-xs text-error/60 hover:text-error hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-1"
                  aria-label="Delete personnel"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Create / Edit Modal */}
      {modalOpen && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="personnel-modal-title" onClick={closeModal}>
          <div ref={modalRef} className="modal-box max-w-lg bg-base-100 border border-base-300 rounded-2xl p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-200">
              <div className="flex items-center gap-2.5">
                <div className="bg-secondary/10 p-2 rounded-lg">
                  {editing ? <Pencil className="h-4 w-4 text-secondary" /> : <UserPlus className="h-4 w-4 text-secondary" />}
                </div>
                <h3 id="personnel-modal-title" className="font-semibold text-base text-base-content">
                  {editing ? "Edit Personnel" : "Add Personnel"}
                </h3>
              </div>
              <button onClick={closeModal} className="btn btn-ghost btn-xs btn-circle" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSave} className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="form-control">
                <span className="label-text text-xs font-medium text-base-content/60 mb-1">First Name *</span>
                <input
                  type="text"
                  value={form.first_name}
                  onChange={(e) => setForm({ ...form, first_name: e.target.value })}
                  placeholder="Juan"
                  autoFocus
                  className="input input-bordered input-sm w-full bg-base-200 focus:bg-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </label>

              <label className="form-control">
                <span className="label-text text-xs font-medium text-base-content/60 mb-1">Middle Name</span>
                <input
                  type="text"
                  value={form.middle_name}
                  onChange={(e) => setForm({ ...form, middle_name: e.target.value })}
                  placeholder="Dela"
                  className="input input-bordered input-sm w-full bg-base-200 focus:bg-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </label>

              <label className="form-control">
                <span className="label-text text-xs font-medium text-base-content/60 mb-1">Last Name *</span>
                <input
                  type="text"
                  value={form.last_name}
                  onChange={(e) => setForm({ ...form, last_name: e.target.value })}
                  placeholder="Cruz"
                  className="input input-bordered input-sm w-full bg-base-200 focus:bg-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </label>

              <label className="form-control">
                <span className="label-text text-xs font-medium text-base-content/60 mb-1">Suffix</span>
                <input
                  type="text"
                  value={form.suffix}
                  onChange={(e) => setForm({ ...form, suffix: e.target.value })}
                  placeholder="Jr, III..."
                  className="input input-bordered input-sm w-full bg-base-200 focus:bg-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </label>

              <label className="form-control">
                <span className="label-text text-xs font-medium text-base-content/60 mb-1">Rank</span>
                <select
                  value={form.rank}
                  onChange={(e) => setForm({ ...form, rank: e.target.value })}
                  className="select select-bordered select-sm w-full bg-base-200 focus:bg-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">— Select rank —</option>
                  {RANK_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </label>

              <label className="form-control">
                <span className="label-text text-xs font-medium text-base-content/60 mb-1">Designation</span>
                <select
                  value={form.designation}
                  onChange={(e) => setForm({ ...form, designation: e.target.value })}
                  className="select select-bordered select-sm w-full bg-base-200 focus:bg-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="">— Select designation —</option>
                  {DESIGNATION_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </label>

              <label className="form-control">
                <span className="label-text text-xs font-medium text-base-content/60 mb-1">Account Number</span>
                <input
                  type="text"
                  value={form.account_number}
                  onChange={(e) => setForm({ ...form, account_number: e.target.value })}
                  placeholder="2024-0001"
                  className="input input-bordered input-sm w-full bg-base-200 focus:bg-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary font-mono"
                />
              </label>

              <label className="form-control">
                <span className="label-text text-xs font-medium text-base-content/60 mb-1">Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="juan.cruz@bfp.gov.ph"
                  className="input input-bordered input-sm w-full bg-base-200 focus:bg-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </label>

              <label className="form-control sm:col-span-2">
                <span className="label-text text-xs font-medium text-base-content/60 mb-1">Station</span>
                <input
                  type="text"
                  value={form.station}
                  onChange={(e) => setForm({ ...form, station: e.target.value })}
                  placeholder="Tuguegarao City Fire Station"
                  className="input input-bordered input-sm w-full bg-base-200 focus:bg-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </label>

              {formError && (
                <div className="sm:col-span-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-error/10 text-error border border-error/20 text-xs">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="sm:col-span-2 flex items-center justify-end gap-2 pt-2 border-t border-base-200 mt-1">
                <button type="button" onClick={closeModal} className="btn btn-ghost btn-sm" disabled={saving}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm gap-1.5 min-w-28" disabled={saving}>
                  {saving ? (
                    <>
                      <span className="loading loading-spinner loading-xs" />
                      Saving...
                    </>
                  ) : editing ? (
                    "Save Changes"
                  ) : (
                    "Add Personnel"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Delete Confirmation (global modal) */}
      <ConfirmModal
        show={deleteTarget.show}
        title="Delete Personnel"
        message={`Are you sure you want to delete ${[deleteTarget.p?.first_name, deleteTarget.p?.last_name].filter(Boolean).join(" ") || "this record"}? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
}
