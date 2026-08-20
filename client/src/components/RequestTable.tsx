import type { TransferRequest, RequestStatus } from "../types";
import { updateRequestStatus } from "../api";
import { FileText, Clock, CheckCircle2, Inbox } from "lucide-react";

interface Props {
  requests: TransferRequest[];
  onUpdated: () => void;
  isAdmin?: boolean;
}

const STATUS_BADGE: Record<RequestStatus, string> = {
  pending: "badge-warning",
  approved: "badge-success",
  denied: "badge-ghost",
};

export default function RequestTable({ requests, onUpdated, isAdmin = false }: Props) {
  async function handleStatusChange(id: number, status: string) {
    await updateRequestStatus(id, status);
    onUpdated();
  }

  function fullName(r: TransferRequest) {
    return [r.first_name, r.middle_name, r.last_name, r.suffix].filter(Boolean).join(" ");
  }

  if (requests.length === 0) {
    return (
      <div className="card bg-base-100 shadow-lg border border-base-300">
        <div className="card-body items-center text-center py-20">
          <div className="bg-base-200 p-5 rounded-2xl">
            <Inbox className="h-12 w-12 text-base-content/25" />
          </div>
          <h3 className="text-xl font-semibold text-base-content/60 mt-2">No Transfer Requests</h3>
          <p className="text-base text-base-content/40 max-w-xs">There are no transfer requests yet. Create one from the New Request tab.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-lg border border-base-300">
      <div className="card-body p-0">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-lg">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="card-title text-base-content">Transfer Requests</h2>
              <p className="text-sm text-base-content/50">{requests.length} total request{requests.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="flex gap-2">
            {requests.filter((r) => r.status === "pending").length > 0 && (
              <span className="badge badge-warning badge-sm gap-1">
                <Clock className="h-3 w-3" />
                {requests.filter((r) => r.status === "pending").length} pending
              </span>
            )}
          </div>
        </div>

        <div className="divider my-0 mx-6" />

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="table table-zebra">
            <thead>
              <tr>
                <th className="text-base-content/50 text-xs uppercase tracking-wider">ID</th>
                <th className="text-base-content/50 text-xs uppercase tracking-wider">Account #</th>
                <th className="text-base-content/50 text-xs uppercase tracking-wider">Personnel</th>
                <th className="text-base-content/50 text-xs uppercase tracking-wider hidden xl:table-cell">Email</th>
                <th className="text-base-content/50 text-xs uppercase tracking-wider">Rank</th>
                <th className="text-base-content/50 text-xs uppercase tracking-wider hidden md:table-cell">From</th>
                <th className="text-base-content/50 text-xs uppercase tracking-wider hidden md:table-cell">To</th>
                <th className="text-base-content/50 text-xs uppercase tracking-wider hidden xl:table-cell">Purpose</th>
                <th className="text-base-content/50 text-xs uppercase tracking-wider text-center">Status</th>
                <th className="text-base-content/50 text-xs uppercase tracking-wider">Date</th>
                {isAdmin && <th className="text-base-content/50 text-xs uppercase tracking-wider text-center">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req.id} className="hover">
                  <th className="font-mono text-sm text-base-content/40">#{req.id}</th>
                  <td className="text-base-content/60 font-mono text-sm">{req.account_number || "—"}</td>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="avatar placeholder">
                        <div className="bg-primary/10 text-primary rounded-full w-8 h-8">
                          <span className="text-xs font-bold">
                            {req.first_name[0]}{req.last_name[0]}
                          </span>
                        </div>
                      </div>
                      <div className="leading-tight">
                        <div className="font-medium">{fullName(req)}</div>
                        {req.middle_name && (
                          <div className="text-xs text-base-content/40">{req.first_name} {req.middle_name[0]}. {req.last_name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="text-base-content/60 text-base hidden xl:table-cell">{req.email}</td>
                  <td className="text-base-content/60">{req.rank || "\u2014"}</td>
                  <td className="text-base-content/60 max-w-[140px] truncate hidden md:table-cell">{req.station_from_name}</td>
                  <td className="text-base-content/60 max-w-[140px] truncate hidden md:table-cell">{req.station_to_name}</td>
                  <td className="text-base-content/60 hidden xl:table-cell">
                    <span className="badge badge-ghost badge-sm">{req.purpose_of_request}</span>
                  </td>
                  <td className="text-center">
                    <span className={`badge badge-sm ${STATUS_BADGE[req.status]}`}>
                      {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                    </span>
                  </td>
                  <td className="text-base-content/50 whitespace-nowrap text-sm">
                    {new Date(req.created_at).toLocaleDateString()}
                  </td>
                  {isAdmin && (
                    <td>
                      {req.status === "pending" ? (
                        <button
                          onClick={() => handleStatusChange(req.id, "approved")}
                          className="btn btn-success btn-xs gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-1"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Approve
                        </button>
                      ) : (
                        <span className="text-base-content/30 text-xs">-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
