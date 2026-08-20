import { useState, useMemo } from "react";
import type { TransferRequest, RequestStatus } from "../types";
import { updateRequestStatus, deleteRequest } from "../api";
import { FileText, Clock, CheckCircle2, Inbox, User, Mail, ArrowRight, Calendar, Search, Trash2, XCircle, AlertCircle } from "lucide-react";

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

  async function handleStatusChange(id: number, status: string) {
    setActionError("");
    try {
      await updateRequestStatus(id, status);
      onUpdated();
    } catch (err) {
      setActionError(`Failed to ${status} request. Please try again.`);
      setTimeout(() => setActionError(""), 3000);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this request?")) return;
    setActionError("");
    try {
      await deleteRequest(id);
      onUpdated();
    } catch (err) {
      setActionError("Failed to delete request. Please try again.");
      setTimeout(() => setActionError(""), 3000);
    }
  }

  function fullName(r: TransferRequest) {
    return [r.first_name, r.middle_name, r.last_name, r.suffix].filter(Boolean).join(" ");
  }

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;
  const deniedCount = requests.filter((r) => r.status === "denied").length;

  if (requests.length === 0) {
    return (
      <div className="bg-base-100 rounded-2xl border border-base-300 overflow-hidden">
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
    <div className="bg-base-100 rounded-2xl border border-base-300 overflow-hidden">
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
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 sm:gap-2 bg-warning/10 border border-warning/20 rounded-lg px-2.5 sm:px-3 py-1.5">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-warning" />
              <span className="text-xs sm:text-sm font-semibold">{pendingCount}</span>
              <span className="text-[10px] sm:text-xs text-base-content/50">pending</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 bg-success/10 border border-success/20 rounded-lg px-2.5 sm:px-3 py-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success" />
              <span className="text-xs sm:text-sm font-semibold">{approvedCount}</span>
              <span className="text-[10px] sm:text-xs text-base-content/50">approved</span>
            </div>
            {deniedCount > 0 && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-error/10 border border-error/20 rounded-lg px-2.5 sm:px-3 py-1.5">
                <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-error" />
                <span className="text-xs sm:text-sm font-semibold">{deniedCount}</span>
                <span className="text-[10px] sm:text-xs text-base-content/50">denied</span>
              </div>
            )}
          </div>
        </div>

        {actionError && (
          <div role="alert" className="alert alert-error py-1.5 px-3 text-xs gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{actionError}</span>
          </div>
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
            {(["all", "pending", "approved", "denied"] as FilterStatus[]).map((f) => (
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
                        <h3 className="font-semibold text-sm sm:text-base text-base-content truncate">{fullName(req)}</h3>
                        <span className={`inline-flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-medium border ${style.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-0.5 text-xs sm:text-sm text-base-content/50">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          {req.rank || "\u2014"}
                        </span>
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
                            onClick={() => handleStatusChange(req.id, "approved")}
                            className="btn btn-success btn-xs sm:btn-sm gap-1 sm:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-1"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Approve</span>
                          </button>
                          <button
                            onClick={() => handleStatusChange(req.id, "denied")}
                            className="btn btn-error btn-xs sm:btn-sm gap-1 sm:gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-1"
                          >
                            <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            <span className="hidden sm:inline">Deny</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleDelete(req.id)}
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
    </div>
  );
}
