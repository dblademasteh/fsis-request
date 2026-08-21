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
          <div className="flex rounded-lg border border-base-300 overflow-hidden self-start sm:self-auto">
            {(["all", "pending", "approved"] as FilterStatus[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-2 min-h-[36px] text-xs font-medium transition-colors ${
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
              <div key={req.id} className="px-4 sm:px-6 py-3 sm:py-4 hover:bg-base-200/50 transition-colors duration-150">
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
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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
