import { useState, useMemo } from "react";
import { createPortal } from "react-dom";
import type { TransferRequest, RequestStatus } from "../types";
import { updateRequestStatus, deleteRequest } from "../api";
import { showDeviceNotification } from "../notifications";
import { FileText, CheckCircle2, Inbox, Mail, ArrowRight, Calendar, Search, Trash2, AlertCircle, X, ExternalLink } from "lucide-react";
import { ConfirmModal } from "./ConfirmModal";

interface Props {
  requests: TransferRequest[];
  onUpdated: () => void;
  isAdmin?: boolean;
}

type FilterStatus = "all" | "pending" | "approved" | "denied";

const STATUS_STYLE: Record<RequestStatus, { badge: string; dot: string }> = {
  pending: { badge: "bg-warning/15 text-warning border-warning/20", dot: "bg-warning" },
  approved: { badge: "bg-success/15 text-success border-success/20", dot: "bg-success" },
  denied: { badge: "bg-error/15 text-error border-error/20", dot: "bg-error" },
};

export default function RequestTable({ requests, onUpdated, isAdmin = false }: Props) {
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [search, setSearch] = useState("");
  const [actionError, setActionError] = useState("");
  const [showCmsModal, setShowCmsModal] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);
  const detailRequest = requests.find((r) => r.id === detailId) || null;

  const filtered = useMemo(() => {
    let result = filter === "all" ? requests : requests.filter((r) => r.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((r) =>
        fullName(r).toLowerCase().includes(q) ||
        r.account_number?.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.rank?.toLowerCase().includes(q) ||
        r.purpose_of_request.toLowerCase().includes(q) ||
        r.station_from_name?.toLowerCase().includes(q) ||
        r.station_to_name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [requests, filter, search]);

  const [confirmState, setConfirmState] = useState<{ show: boolean; type: "approve" | "delete"; id: number }>({ show: false, type: "approve", id: 0 });
  const [actionToast, setActionToast] = useState<{ msg: string; show: boolean }>({ msg: "", show: false });

  const confirm = (type: "approve" | "delete", id: number) => setConfirmState({ show: true, type, id });
  const cancelConfirm = () => setConfirmState({ show: false, type: "approve", id: 0 });

  async function handleApprove(id: number) {
    const request = requests.find(r => r.id === id);
    setActionError("");
    try {
      await updateRequestStatus(id, "approved");
      onUpdated();
      if (request) {
        const purposeMessages: Record<string, string> = {
          "Transfer of Unit Assignment": `Transfer approved for ${request.first_name}. ${request.station_from_name} → ${request.station_to_name}`,
          "New FSIS Account": `New e Request account approved for ${request.first_name} ${request.last_name}. Password reset email sent.`,
          "Update Rank": `${request.first_name} ${request.last_name} rank updated to ${request.new_rank || request.rank}`,
          "Update Name": `Name updated for ${request.first_name} → ${request.new_first_name} ${request.new_last_name}`,
          "Update Email": `Email updated to ${request.new_email}`
        };
        const msg = purposeMessages[request.purpose_of_request] || `Request approved for ${request.first_name}`;
        setActionToast({ msg, show: true });
        setTimeout(() => setActionToast({ msg: "", show: false }), 3000);
        
        // Send notification to requestor
        if (request.account_number) {
          showDeviceNotification("Request Approved", msg);
        }
      }
    } catch (err) {
      setActionError("Failed to approve request. Please try again.");
      setTimeout(() => setActionError(""), 3000);
    }
  }

  function handleProcess() {
    window.open("https://cms.e-bfp.com", "_blank", "noopener,noreferrer");
  }

  async function handleDelete(id: number) {
    setActionError("");
    try {
      await deleteRequest(id);
      setActionToast({ msg: "Request deleted successfully", show: true });
      setTimeout(() => setActionToast({ msg: "", show: false }), 3000);
      onUpdated();
    } catch (err) {
      setActionError("Failed to delete request. Please try again.");
      setTimeout(() => setActionError(""), 3000);
    }
  }

  function fullName(r: TransferRequest) {
    return [r.first_name, r.middle_name, r.last_name, r.suffix].filter(Boolean).join(" ");
  }

  function displayName(r: TransferRequest) {
    return [r.rank, r.first_name, r.last_name, r.suffix].filter(Boolean).join(" ");
  }

  function detailChanges(r: TransferRequest): { label: string; from?: string | null; to?: string | null }[] {
    if (r.purpose_of_request === "Transfer of Unit Assignment") {
      return [{ label: "Station", from: r.station_from_name, to: r.station_to_name }];
    }
    if (r.purpose_of_request === "Update Rank") {
      return [{ label: "Rank", from: r.rank, to: r.new_rank }];
    }
    if (r.purpose_of_request === "Update Name") {
      return [
        { label: "First name", from: r.first_name, to: r.new_first_name },
        { label: "Middle name", from: r.middle_name, to: r.new_middle_name },
        { label: "Last name", from: r.last_name, to: r.new_last_name },
        { label: "Suffix", from: r.suffix, to: r.new_suffix },
      ];
    }
    if (r.purpose_of_request === "Update Email") {
      return [{ label: "Email", from: r.email, to: r.new_email }];
    }
    return [];
  }

  function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
    return (
      <div className="flex flex-col gap-0.5 min-w-0">
        <span className="text-[10px] uppercase tracking-wider text-base-content/40 font-semibold">{label}</span>
        <span className="text-sm text-base-content break-words">{value || "\u2014"}</span>
      </div>
    );
  }

  function ChangeRow({ label, from, to }: { label: string; from?: string | null; to?: string | null }) {
    return (
      <div className="flex items-start gap-2 sm:gap-3 text-sm">
        <span className="text-xs text-base-content/50 w-20 sm:w-24 shrink-0 pt-1">{label}</span>
        <span className="flex items-center gap-1.5 min-w-0 flex-wrap">
          <span className="bg-base-100 border border-base-300 rounded-md px-2 py-0.5 text-base-content/60 break-all">{from || "\u2014"}</span>
          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-base-content/40" />
          <span className="bg-primary/10 text-primary rounded-md px-2 py-0.5 font-medium break-all">{to || "\u2014"}</span>
        </span>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="bg-base-100 rounded-2xl border border-base-300 overflow-hidden animate-[fadeUp_0.35s_ease-out_both]">
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="bg-base-200 p-5 rounded-2xl">
            <Inbox className="h-12 w-12 text-base-content/20" />
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-base-content/60">No Transfer Requests</h3>
            <p className="text-sm text-base-content/40 max-w-xs mt-1">There are no transfer requests yet. Create one from the New Request tab.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-base-100 rounded-2xl border border-base-300 overflow-hidden animate-[fadeUp_0.35s_ease-out_both]">
      {/* Header */}
      <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-base-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 sm:p-2.5 rounded-xl">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-semibold text-base-content">Transfer Requests</h2>
              <p className="text-xs sm:text-sm text-base-content/50">{filtered.length} of {requests.length} request{requests.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
        </div>

        {actionError && (
          <div role="alert" className="alert alert-error py-1.5 px-3 text-xs gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{actionError}</span>
          </div>
        )}

        {actionToast.show && createPortal(
        <div role="alert" aria-live="polite" className="fixed top-4 right-4 z-50 alert alert-success py-2 px-4 text-sm gap-3 shadow-lg animate-[slideIn_0.2s_ease-out]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{actionToast.msg}</span>
        </div>,
        document.body
      )}

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/40" />
            <input
              type="text"
              placeholder="Search by name, account #, email, rank, station..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input input-bordered w-full pl-9 bg-base-200 focus:bg-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
            />
          </div>
          <div className="flex rounded-lg border border-base-300 overflow-x-auto self-start sm:self-auto">
            {(["all", "pending", "approved", "denied"] as FilterStatus[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 min-h-[36px] text-xs font-medium transition-colors whitespace-nowrap ${
                  filter === f
                    ? "bg-primary text-primary-content"
                    : "bg-base-200 text-base-content/60 hover:bg-base-300"
                }`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <Search className="h-10 w-10 text-base-content/15 mx-auto mb-3" />
          <p className="text-sm text-base-content/40">No results match your search.</p>
        </div>
      ) : (
        <div className="divide-y divide-base-200">
          {filtered.map((req) => {
            const style = STATUS_STYLE[req.status];
            return (
              <div
                key={req.id}
                onClick={() => setDetailId(req.id)}
                onKeyDown={(e) => { if (e.key === "Enter") setDetailId(req.id); }}
                tabIndex={0}
                role="button"
                aria-label={`View details for request #${req.id}`}
                className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-base-200/50 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Left: Avatar + Info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="bg-primary/10 text-primary rounded-xl w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center shrink-0">
                      <span className="text-xs sm:text-sm font-bold">{req.first_name[0]}{req.last_name[0]}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 sm:mb-1 flex-wrap">
                        <h3 className="font-semibold text-sm sm:text-base text-base-content truncate">{displayName(req)}</h3>
                        <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${style.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-0.5 text-xs sm:text-sm text-base-content/50">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          <span className="truncate max-w-[120px] sm:max-w-none">{req.email}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          {new Date(req.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  {isAdmin && (
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
{req.status === "pending" && (
                        <>
                          <button
                            onClick={() => confirm("approve", req.id)}
                            className="btn btn-success btn-xs sm:btn-sm gap-1 sm:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Approve</span>
                          </button>
                          <button
                            onClick={handleProcess}
                            className="btn btn-info btn-xs sm:btn-sm gap-1 sm:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-1"
                          >
                            <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Process</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => confirm("delete", req.id)}
                        className="btn btn-ghost btn-xs sm:btn-sm text-error/70 hover:text-error hover:bg-error/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-1"
                        aria-label="Delete request"
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  )}
                </div>

                {/* Transfer Details */}
                <div className="mt-2 sm:mt-3 ml-12 sm:ml-14 flex flex-wrap items-center gap-1.5 sm:gap-3 text-xs sm:text-sm">
                  <span className="inline-flex items-center gap-1 sm:gap-1.5 bg-base-200 rounded-lg px-2 sm:px-3 py-0.5 sm:py-1 text-base-content/60">
                    #{req.id}
                  </span>
                  <span className="inline-flex items-center gap-1 sm:gap-1.5 bg-base-200 rounded-lg px-2 sm:px-3 py-0.5 sm:py-1 text-base-content/60 font-mono text-[10px] sm:text-xs">
                    {req.account_number || "\u2014"}
                  </span>
                  <span className="inline-flex items-center gap-1 sm:gap-1.5 bg-secondary/10 text-secondary rounded-lg px-2 sm:px-3 py-0.5 sm:py-1 text-[10px] sm:text-xs font-medium">
                    {req.purpose_of_request}
                  </span>
                  {req.purpose_of_request === "Update Rank" && req.new_rank && (
                    <span className="inline-flex items-center gap-1 text-accent font-medium">
                      <span className="truncate max-w-[80px] sm:max-w-[120px]">{req.rank || "\u2014"}</span>
                      <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                      <span className="truncate max-w-[80px] sm:max-w-[120px]">{req.new_rank}</span>
                    </span>
                  )}
                  {(req.station_from_name || req.station_to_name) && (
                    <span className="inline-flex items-center gap-1 text-base-content/40">
                      <span className="truncate max-w-[80px] sm:max-w-[120px]">{req.station_from_name}</span>
                      <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 shrink-0" />
                      <span className="truncate max-w-[80px] sm:max-w-[120px]">{req.station_to_name}</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CMS Modal — portaled to body so ancestor transforms/overflow don't constrain it */}
      {showCmsModal && createPortal(
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-label="BFP CMS">
          <div className="modal-box max-w-4xl h-[85vh] p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-base-200">
              <span className="text-sm font-semibold text-base-content">BFP CMS</span>
              <button
                onClick={() => setShowCmsModal(false)}
                className="btn btn-ghost btn-xs btn-circle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close CMS"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <iframe
              src="https://cms.e-bfp.com"
              title="BFP CMS"
              className="w-full h-[calc(85vh-45px)] border-0"
            />
          </div>
          <div className="modal-backdrop bg-black/40" onClick={() => setShowCmsModal(false)} />
        </div>,
        document.body
      )}

      {/* Request Detail Modal */}
      {detailRequest && createPortal(
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-label={`Request details for #${detailRequest.id}`}>
          <div className="modal-box max-w-xl p-0 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-base-200">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="bg-primary/10 text-primary rounded-xl w-9 h-9 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold">{detailRequest.first_name[0]}{detailRequest.last_name[0]}</span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm text-base-content truncate">{displayName(detailRequest)}</h3>
                  <p className="text-[10px] text-base-content/50 font-mono">{detailRequest.account_number || "\u2014"}</p>
                </div>
              </div>
              <button
                onClick={() => setDetailId(null)}
                className="btn btn-ghost btn-xs btn-circle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                aria-label="Close details"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_STYLE[detailRequest.status].badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_STYLE[detailRequest.status].dot}`} />
                  {detailRequest.status.charAt(0).toUpperCase() + detailRequest.status.slice(1)}
                </span>
                <span className="inline-flex items-center bg-secondary/10 text-secondary rounded-lg px-2.5 py-0.5 text-xs font-medium">
                  {detailRequest.purpose_of_request}
                </span>
                <span className="inline-flex items-center gap-1 bg-base-200 rounded-lg px-2.5 py-0.5 text-[10px] sm:text-xs text-base-content/50">
                  <Calendar className="h-3 w-3" />
                  {new Date(detailRequest.created_at).toLocaleDateString()}
                </span>
              </div>

              <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
                <DetailRow label="Email" value={detailRequest.email} />
                <DetailRow label="Rank" value={detailRequest.rank} />
                <DetailRow label="Designation" value={detailRequest.designation} />
                {detailRequest.purpose_of_request === "New FSIS Account" && (
                  <DetailRow label="Fire Station" value={detailRequest.station_from_name} />
                )}
              </dl>

              {detailChanges(detailRequest).length > 0 && (
                <div className="rounded-lg border border-base-300 bg-base-200/40 p-3 space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40">Requested Changes</p>
                  {detailChanges(detailRequest).map((c) => (
                    <ChangeRow key={c.label} {...c} />
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 py-2.5 border-t border-base-200 flex flex-wrap justify-between gap-x-4 text-[10px] text-base-content/40">
              <span>Created {new Date(detailRequest.created_at).toLocaleString()}</span>
              <span>Updated {new Date(detailRequest.updated_at).toLocaleString()}</span>
            </div>
          </div>
          <div className="modal-backdrop bg-black/40" onClick={() => setDetailId(null)} />
        </div>,
        document.body
      )}

      <ConfirmModal
        show={confirmState.show}
        title={confirmState.type === "delete" ? "Delete Request" : "Approve Request"}
        message={`Are you sure you want to ${confirmState.type === "delete" ? "delete this request for " + requests.find(r => r.id === confirmState.id)?.first_name + " " + requests.find(r => r.id === confirmState.id)?.last_name : "approve this request for " + requests.find(r => r.id === confirmState.id)?.purpose_of_request?.toLowerCase()}?`}
        onConfirm={() => {
          if (confirmState.type === "approve") handleApprove(confirmState.id);
          else handleDelete(confirmState.id);
          cancelConfirm();
        }}
        onCancel={cancelConfirm}
      />
    </div>
  );
}
