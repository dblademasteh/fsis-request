import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, PlayCircle, Plus, Pencil, Trash2, ExternalLink, Clock, AlertCircle, X, Link2, Loader2, Inbox } from "lucide-react";
import type { Tutorial } from "../types";
import { fetchTutorials, createTutorial, updateTutorial, deleteTutorial } from "../api";
import { ConfirmModal } from "./ConfirmModal";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface VideoTutorialsPageProps {
  onBack: () => void;
  isAdmin: boolean;
}

interface TutorialForm {
  title: string;
  description: string;
  youtube_url: string;
  duration: string;
}

const EMPTY_FORM: TutorialForm = { title: "", description: "", youtube_url: "", duration: "" };

// Extract a YouTube video ID from various URL formats
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  let m = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{6,})/);
  if (m) return m[1];
  m = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{6,})/);
  if (m) return m[1];
  m = trimmed.match(/\/embed\/([a-zA-Z0-9_-]{6,})/);
  if (m) return m[1];
  m = trimmed.match(/\/shorts\/([a-zA-Z0-9_-]{6,})/);
  if (m) return m[1];
  if (/^[a-zA-Z0-9_-]{6,}$/.test(trimmed)) return trimmed;
  return null;
}

export default function VideoTutorialsPage({ onBack, isAdmin }: VideoTutorialsPageProps) {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Tutorial | null>(null);
  const [form, setForm] = useState<TutorialForm>(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ show: boolean; t: Tutorial | null }>({ show: false, t: null });
  const [toast, setToast] = useState<{ msg: string; show: boolean }>({ msg: "", show: false });
  const modalRef = useRef<HTMLDivElement>(null);

  const loadTutorials = useCallback(async () => {
    try {
      const data = await fetchTutorials();
      setTutorials(data);
      setLoadError("");
    } catch {
      setLoadError("Failed to load tutorials. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTutorials();
  }, [loadTutorials]);

  useFocusTrap(modalOpen, modalRef, () => setModalOpen(false));

  const showToast = (msg: string) => {
    setToast({ msg, show: true });
    setTimeout(() => setToast({ msg: "", show: false }), 3000);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  };

  const openEdit = (t: Tutorial) => {
    setEditing(t);
    setForm({
      title: t.title,
      description: t.description || "",
      youtube_url: t.youtube_url,
      duration: t.duration || "",
    });
    setFormError("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditing(null);
    setFormError("");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!form.title.trim()) {
      setFormError("Title is required.");
      return;
    }
    if (!form.youtube_url.trim()) {
      setFormError("YouTube URL is required.");
      return;
    }
    if (!extractYouTubeId(form.youtube_url)) {
      setFormError("Invalid YouTube URL. Please provide a valid YouTube link.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        youtube_url: form.youtube_url.trim(),
        duration: form.duration.trim() || undefined,
      };
      if (editing) {
        await updateTutorial(editing.id, payload);
        showToast("Tutorial updated.");
      } else {
        await createTutorial(payload);
        showToast("Tutorial added.");
      }
      closeModal();
      await loadTutorials();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save tutorial. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const t = deleteTarget.t;
    if (!t) return;
    try {
      await deleteTutorial(t.id);
      showToast("Tutorial deleted.");
      await loadTutorials();
    } catch {
      setFormError("Failed to delete tutorial. Please try again.");
    } finally {
      setDeleteTarget({ show: false, t: null });
    }
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pb-8">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-base-content/50 hover:text-base-content transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to home
      </button>

      <div className="text-center space-y-1 mt-2 mb-6 animate-[fadeUp_0.4s_ease-out_both]">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-base-100/70 backdrop-blur border border-base-300 text-xs font-medium text-base-content/60">
          <PlayCircle className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Video Tutorials
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-base-content">
          Learn how to use <span className="text-primary">eRequest</span>
        </h1>
        <p className="text-sm text-base-content/50 max-w-md mx-auto">
          Short video guides to help you file and track your requests with ease.
        </p>
        {isAdmin && (
          <div className="pt-2">
            <button
              onClick={openCreate}
              className="btn btn-primary btn-sm gap-1.5 shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Tutorial
            </button>
          </div>
        )}
      </div>

      {toast.show && (
        <div role="alert" aria-live="polite" className="fixed top-4 right-4 z-[60] alert alert-success py-2 px-4 text-sm gap-3 shadow-lg animate-[slideIn_0.2s_ease-out]">
          <PlayCircle className="h-4 w-4 shrink-0" />
          <span>{toast.msg}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 animate-[fadeUp_0.4s_ease-out_both]">
          <Loader2 className="h-8 w-8 text-primary/40 animate-spin" aria-hidden="true" />
          <p className="text-sm text-base-content/40">Loading tutorials...</p>
        </div>
      ) : loadError ? (
        <div role="alert" className="flex flex-col items-center justify-center py-16 gap-3 animate-[fadeUp_0.4s_ease-out_both]">
          <AlertCircle className="h-8 w-8 text-error/50" aria-hidden="true" />
          <p className="text-sm text-base-content/50">{loadError}</p>
          <button onClick={loadTutorials} className="btn btn-outline btn-sm mt-1">Try again</button>
        </div>
      ) : tutorials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 animate-[fadeUp_0.4s_ease-out_both]">
          <div className="bg-base-200 p-4 rounded-2xl">
            <Inbox className="h-10 w-10 text-base-content/15" aria-hidden="true" />
          </div>
          <p className="text-sm text-base-content/40">No tutorials yet.</p>
          {isAdmin && (
            <button onClick={openCreate} className="btn btn-primary btn-sm gap-1.5 mt-1">
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add the first tutorial
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {tutorials.map((t, idx) => (
            <div
              key={t.id}
              className="group relative bg-base-100 rounded-2xl border border-base-300 shadow-sm overflow-hidden hover:shadow-md hover:border-base-300/80 hover:-translate-y-0.5 transition-all duration-200 animate-[fadeUp_0.5s_ease-out_both]"
              style={{ animationDelay: `${idx * 70}ms` }}
            >
              {/* Video embed */}
              <div className="relative aspect-video bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${t.youtube_id}`}
                  title={t.title}
                  className="absolute inset-0 w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  loading="lazy"
                />
                {t.duration && (
                  <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-medium pointer-events-none">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {t.duration}
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-semibold text-base-content leading-snug">{t.title}</h2>
                  <a
                    href={t.youtube_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-base-content/30 hover:text-primary shrink-0 mt-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    aria-label={`Open ${t.title} on YouTube`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                  </a>
                </div>
                {t.description && (
                  <p className="mt-1 text-xs text-base-content/50 leading-relaxed">{t.description}</p>
                )}
                {isAdmin && (
                  <div className="mt-3 pt-3 border-t border-base-200 flex items-center gap-1.5">
                    <button
                      onClick={() => openEdit(t)}
                      className="btn btn-ghost btn-xs gap-1 text-base-content/50 hover:text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                    >
                      <Pencil className="h-3 w-3" aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteTarget({ show: true, t })}
                      className="btn btn-ghost btn-xs gap-1 text-error/60 hover:text-error hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-1"
                    >
                      <Trash2 className="h-3 w-3" aria-hidden="true" />
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && tutorials.length > 0 && (
        <p className="mt-6 text-center text-xs text-base-content/40 animate-[fadeUp_0.5s_ease-out_both] [animation-delay:280ms]">
          More tutorials coming soon. For assistance, contact the BFP Region II Data Protection Officer.
        </p>
      )}

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="tutorial-modal-title" onClick={closeModal}>
          <div ref={modalRef} className="modal-box max-w-lg bg-base-100 border border-base-300 rounded-2xl p-0 overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-base-200">
              <div className="flex items-center gap-2.5">
                <div className="bg-primary/10 p-2 rounded-lg">
                  {editing ? <Pencil className="h-4 w-4 text-primary" /> : <Plus className="h-4 w-4 text-primary" />}
                </div>
                <h3 id="tutorial-modal-title" className="font-semibold text-base text-base-content">
                  {editing ? "Edit Tutorial" : "Add Tutorial"}
                </h3>
              </div>
              <button onClick={closeModal} className="btn btn-ghost btn-xs btn-circle" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-5 py-4 space-y-3">
              <label className="form-control">
                <span className="label-text text-xs font-medium text-base-content/60 mb-1">Title *</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Submitting a Transfer Request"
                  autoFocus
                  className="input input-bordered input-sm w-full bg-base-200 focus:bg-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </label>

              <label className="form-control">
                <span className="label-text text-xs font-medium text-base-content/60 mb-1">YouTube URL *</span>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-base-content/40 pointer-events-none" aria-hidden="true" />
                  <input
                    type="text"
                    value={form.youtube_url}
                    onChange={(e) => setForm({ ...form, youtube_url: e.target.value })}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="input input-bordered input-sm w-full pl-9 bg-base-200 focus:bg-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <span className="text-[10px] text-base-content/40 mt-1">Paste any YouTube link (watch, youtu.be, shorts, or embed).</span>
              </label>

              <label className="form-control">
                <span className="label-text text-xs font-medium text-base-content/60 mb-1">Description</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short description of the tutorial"
                  rows={2}
                  className="textarea textarea-bordered textarea-sm w-full bg-base-200 focus:bg-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary resize-none"
                />
              </label>

              <label className="form-control">
                <span className="label-text text-xs font-medium text-base-content/60 mb-1">Duration (optional)</span>
                <input
                  type="text"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  placeholder="e.g. 2:30"
                  className="input input-bordered input-sm w-full bg-base-200 focus:bg-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </label>

              {formError && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-error/10 text-error border border-error/20 text-xs">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-base-200 mt-1">
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
                    "Add Tutorial"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        show={deleteTarget.show}
        title="Delete Tutorial"
        message={`Are you sure you want to delete "${deleteTarget.t?.title || "this tutorial"}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget({ show: false, t: null })}
      />
    </div>
  );
}
