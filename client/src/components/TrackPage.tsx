import type { FormEvent } from "react";
import type { TransferRequest } from "../types";
import {
  Search,
  Hash,
  Lock,
  AlertCircle,
  MapPin,
  ArrowRight,
  CheckCircle2,
  XCircle,
  FileCheck,
  CalendarClock,
  History,
  Fingerprint,
} from "lucide-react";

interface TrackPageProps {
  accountNumber: string;
  onAccountNumberChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
  loading: boolean;
  error: string;
  results: TransferRequest[] | null;
}

const PURPOSE_STYLES: Record<string, { badge: string; label: string }> = {
  "Transfer of Unit Assignment": { badge: "bg-primary/10 text-primary border-primary/20", label: "Transfer" },
  "New FSIS Account": { badge: "bg-secondary/10 text-secondary border-secondary/20", label: "New eRequest" },
  "Update Rank": { badge: "bg-accent/10 text-accent border-accent/20", label: "Update Rank" },
  "Update Name": { badge: "bg-info/10 text-info border-info/20", label: "Update Name" },
  "Update Email": { badge: "bg-warning/10 text-warning border-warning/20", label: "Update Email" },
};

function fullName(req: TransferRequest): string {
  return [req.first_name, req.middle_name, req.last_name, req.suffix].filter(Boolean).join(" ");
}

function displayName(req: TransferRequest): string {
  return [req.rank, fullName(req)].filter(Boolean).join(" ");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function StatusBadge({ status }: { status: TransferRequest["status"] }) {
  const styles =
    status === "pending"
      ? "bg-warning/15 text-warning border-warning/25"
      : status === "approved"
        ? "bg-success/15 text-success border-success/25"
        : "bg-error/15 text-error border-error/25";
  const dot = status === "pending" ? "bg-warning" : status === "approved" ? "bg-success" : "bg-error";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold border shrink-0 ${styles}`}>
      <span className="relative flex w-1.5 h-1.5" aria-hidden="true">
        {status === "pending" && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${dot} opacity-60`} />}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dot}`} />
      </span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export function StatusStepper({ status }: { status: TransferRequest["status"] }) {
  const resolved = status !== "pending";
  const finalLabel = status === "approved" ? "Approved" : status === "denied" ? "Denied" : "Status";
  const isApproved = status === "approved";
  const isDenied = status === "denied";

  const steps = [
    { label: "Submitted", state: "done" as const },
    { label: "On Process", state: resolved ? ("done" as const) : ("active" as const) },
    { label: finalLabel, state: resolved ? ("done" as const) : ("upcoming" as const) },
  ];

  return (
    <ol className="flex items-start px-1 sm:px-2 pt-1" aria-label={`Request status: ${status}`}>
      {steps.map((step, i) => {
        const isFinal = i === steps.length - 1;
        let node: JSX.Element;
        if (step.state === "done" && isFinal && isDenied) {
          node = (
            <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-error text-error-content shadow-sm">
              <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </span>
          );
        } else if (step.state === "done" && isFinal && isApproved) {
          node = (
            <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-success text-success-content shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </span>
          );
        } else if (step.state === "done") {
          node = (
            <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary text-primary-content shadow-sm">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" />
            </span>
          );
        } else if (step.state === "active") {
          node = (
            <span className="relative flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-warning bg-warning/10">
              <span className="relative flex w-2 h-2" aria-hidden="true">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-warning opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-warning" />
              </span>
            </span>
          );
        } else {
          node = (
            <span className="flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-base-300 bg-base-100">
              <span className="w-1.5 h-1.5 rounded-full bg-base-300" aria-hidden="true" />
            </span>
          );
        }
        const connectorFilled = i < steps.length - 1 && steps[i + 1].state !== "upcoming";
        const connectorColor = !connectorFilled
          ? "bg-base-200"
          : i === steps.length - 2 && isDenied
            ? "bg-error/40"
            : i === steps.length - 2 && isApproved
              ? "bg-success/40"
              : "bg-primary/40";
        const labelColor =
          step.state === "upcoming"
            ? "text-base-content/30"
            : isFinal && isDenied
              ? "text-error"
              : isFinal && isApproved
                ? "text-success"
                : step.state === "active"
                  ? "text-warning"
                  : "text-primary";
        return (
          <li key={step.label} className="flex items-start flex-1 last:flex-none min-w-0">
            <div className="flex flex-col items-center gap-1 shrink-0">
              {node}
              <span className={`text-[9px] sm:text-[11px] font-medium whitespace-nowrap ${labelColor}`}>{step.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`flex-1 h-0.5 mt-3 sm:mt-3.5 mx-1 rounded-full ${connectorColor}`} aria-hidden="true" />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function RequestedChanges({ req }: { req: TransferRequest }) {
  const rows: { label: string; from: string; to: string }[] = [];
  if (req.new_rank && req.new_rank !== req.rank) {
    rows.push({ label: "Rank", from: req.rank || "—", to: req.new_rank });
  }
  const newName = [req.new_first_name, req.new_middle_name, req.new_last_name, req.new_suffix].filter(Boolean).join(" ");
  if (newName && newName !== fullName(req)) {
    rows.push({ label: "Name", from: fullName(req), to: newName });
  }
  if (req.new_email && req.new_email !== req.email) {
    rows.push({ label: "Email", from: req.email || "—", to: req.new_email });
  }
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-info/20 bg-info/5 px-3 py-2.5 space-y-1.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-info/80">Requested changes</div>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2 text-xs min-w-0">
          <span className="text-base-content/40 w-12 shrink-0">{row.label}</span>
          <span className="text-base-content/45 line-through decoration-base-content/25 break-all">{row.from}</span>
          <ArrowRight className="h-3 w-3 text-info shrink-0" aria-hidden="true" />
          <span className="font-semibold break-all">{row.to}</span>
        </div>
      ))}
    </div>
  );
}

function ResultCard({ req, index }: { req: TransferRequest; index: number }) {
  const initials = `${req.first_name?.[0] ?? "?"}${req.last_name?.[0] ?? "?"}`.toUpperCase();
  const purpose = PURPOSE_STYLES[req.purpose_of_request];
  return (
    <li
      className="bg-base-100 rounded-2xl border border-base-300 shadow-sm overflow-hidden hover:shadow-md hover:border-base-300/80 transition-all duration-200 animate-[fadeUp_0.4s_ease-out_both]"
      style={{ animationDelay: `${index * 70}ms` }}
    >
      <div className="px-4 sm:px-6 py-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="from-primary/15 to-secondary/15 bg-gradient-to-br text-primary rounded-xl w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center shrink-0 border border-primary/10">
              <span className="text-xs sm:text-sm font-bold tracking-wide">{initials}</span>
            </div>
            <div className="min-w-0">
              <div className="font-semibold text-sm sm:text-base text-base-content break-all leading-tight">{displayName(req)}</div>
              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] sm:text-xs text-base-content/50">
                <Fingerprint className="h-3 w-3 shrink-0" aria-hidden="true" />
                <span className="font-mono">{req.account_number || "N/A"}</span>
                <span className="text-base-content/25" aria-hidden="true">·</span>
                <span>#{req.id}</span>
              </div>
            </div>
          </div>
          <StatusBadge status={req.status} />
        </div>

        <div className="border-y border-base-200/80 py-3">
          <StatusStepper status={req.status} />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${purpose ? purpose.badge : "bg-base-200 text-base-content/70 border-base-300"}`}>
            <FileCheck className="h-3 w-3" aria-hidden="true" />
            {req.purpose_of_request}
          </span>
          {req.rank && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-base-200/70 text-base-content/70 border border-base-300">
              {req.rank}
            </span>
          )}
          {req.designation && (
            <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-medium bg-base-200/70 text-base-content/70 border border-base-300">
              {req.designation}
            </span>
          )}
        </div>

        {(req.station_from_name || req.station_to_name) && (
          <div className="flex items-center gap-2 bg-base-200/50 rounded-xl px-3 py-2 min-w-0">
            <MapPin className="h-3.5 w-3.5 text-base-content/35 shrink-0" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-medium break-all">{req.station_from_name || "—"}</span>
            <ArrowRight className="h-3.5 w-3.5 text-secondary shrink-0" aria-hidden="true" />
            <span className="text-xs sm:text-sm font-medium break-all">{req.station_to_name || "—"}</span>
          </div>
        )}

        <RequestedChanges req={req} />

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 pt-1 text-[10px] sm:text-xs text-base-content/45">
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="h-3 w-3" aria-hidden="true" />
            Submitted {formatDate(req.created_at)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <History className="h-3 w-3" aria-hidden="true" />
            Updated {formatDate(req.updated_at)}
          </span>
        </div>
      </div>
    </li>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-base-100 rounded-2xl border border-base-300 p-4 sm:p-6 space-y-4" aria-hidden="true">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-base-200 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-36 rounded bg-base-200 animate-pulse" />
            <div className="h-2.5 w-24 rounded bg-base-200 animate-pulse" />
          </div>
        </div>
        <div className="h-6 w-20 rounded-full bg-base-200 animate-pulse" />
      </div>
      <div className="h-8 rounded-lg bg-base-200/70 animate-pulse mx-6" />
      <div className="flex gap-2">
        <div className="h-6 w-28 rounded-lg bg-base-200 animate-pulse" />
        <div className="h-6 w-16 rounded-lg bg-base-200 animate-pulse" />
      </div>
    </div>
  );
}

export default function TrackPage({ accountNumber, onAccountNumberChange, onSubmit, loading, error, results }: TrackPageProps) {
  const hasSearched = results !== null || loading;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-2 pt-2 animate-[fadeUp_0.4s_ease-out_both]">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-base-100/70 backdrop-blur border border-base-300 text-xs font-medium text-base-content/60">
          <Search className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Request Tracker
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-base-content">
          Track a <span className="text-primary">Request</span>
        </h1>
        <p className="text-sm text-base-content/50 max-w-md mx-auto">
          Enter your account number to follow your request through every step in real time.
        </p>
      </div>

      <div className="relative bg-base-100 rounded-2xl border border-base-300 shadow-sm overflow-hidden animate-[fadeUp_0.4s_ease-out_both] [animation-delay:80ms]">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/0 via-secondary/70 to-primary/0" aria-hidden="true" />
        <div className="p-4 sm:p-6">
          <form onSubmit={onSubmit} className="space-y-3">
            <label htmlFor="track-account" className="text-sm font-medium text-base-content/70 flex items-center gap-1.5">
              <Hash className="h-3.5 w-3.5 text-primary/60" aria-hidden="true" />
              Account Number
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/30 pointer-events-none" aria-hidden="true" />
                <input
                  id="track-account"
                  type="text"
                  value={accountNumber}
                  onChange={(e) => onAccountNumberChange(e.target.value)}
                  placeholder="A12345"
                  autoComplete="off"
                  spellCheck={false}
                  className="input input-bordered w-full pl-10 font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary gap-2 shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:hover:translate-y-0"
              >
                {loading ? <span className="loading loading-spinner loading-xs" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
                {loading ? "Searching…" : "Track Request"}
              </button>
            </div>
            <p className="text-[10px] sm:text-xs text-base-content/40 flex items-center gap-1">
              <Lock className="h-3 w-3" aria-hidden="true" />
              Your account number serves as your tracking credential
            </p>
          </form>
          {error && (
            <div role="alert" aria-live="polite" className="alert alert-warning mt-4 py-2 gap-2 text-xs sm:text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>

      {!hasSearched && !error && (
        <div className="text-center py-12 animate-[fadeUp_0.4s_ease-out_both] [animation-delay:160ms]">
          <div className="relative inline-flex mb-4">
            <div className="absolute -top-2 -right-2 w-3 h-3 rounded-full bg-secondary/30" aria-hidden="true" />
            <div className="absolute -bottom-1 -left-3 w-2 h-2 rounded-full bg-primary/30" aria-hidden="true" />
            <div className="inline-flex p-5 bg-base-200 rounded-3xl">
              <Search className="h-9 w-9 text-base-content/20" aria-hidden="true" />
            </div>
          </div>
          <p className="text-sm text-base-content/40 max-w-xs mx-auto">
            Enter your account number above to see the live status of your requests.
          </p>
        </div>
      )}

      {loading && (
        <div className="space-y-3" role="status" aria-label="Searching requests">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {results && results.length > 0 && (
        <div className="space-y-3 animate-[fadeUp_0.4s_ease-out_both]" aria-live="polite">
          <h2 className="text-sm font-semibold text-base-content/70 px-1">
            {results.length} request{results.length !== 1 ? "s" : ""} found
          </h2>
          <ul className="space-y-3">
            {results.map((req, i) => (
              <ResultCard key={req.id} req={req} index={i} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
