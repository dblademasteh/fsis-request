import { useState, useEffect, useCallback, useRef } from "react";
import type { FireStation, TransferRequest } from "./types";
import { fetchStations, fetchRequests, trackRequests } from "./api";
import { Plus, Search, ShieldCheck, Home, Clock, CheckCircle2, AlertCircle, Hash, Lock, LogOut, User, KeyRound, Eye, EyeOff } from "lucide-react";
import RequestForm from "./components/RequestForm";
import RequestTable from "./components/RequestTable";

type Page = "landing" | "submit" | "track" | "admin";

const ADMIN_USER = "admin";
const ADMIN_PASS = "@dmin123!";

export default function App() {
  const [stations, setStations] = useState<FireStation[]>([]);
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [page, setPage] = useState<Page>("landing");
  const [isAdminAuth, setIsAdminAuth] = useState(false);

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const loginInputRef = useRef<HTMLInputElement>(null);

  const [trackAccountNumber, setTrackAccountNumber] = useState("");
  const [trackResults, setTrackResults] = useState<TransferRequest[] | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");

  const [submitSuccess, setSubmitSuccess] = useState(false);

  const loadStations = useCallback(async () => {
    try { setStations(await fetchStations()); } catch { console.error("Failed to load stations"); }
  }, []);

  const loadRequests = useCallback(async () => {
    try { setRequests(await fetchRequests()); } catch { console.error("Failed to load requests"); }
  }, []);

  useEffect(() => { loadStations(); loadRequests(); }, [loadStations, loadRequests]);

  useEffect(() => {
    if (showLoginModal && loginInputRef.current) {
      loginInputRef.current.focus();
    }
  }, [showLoginModal]);

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackAccountNumber.trim()) return;
    setTrackLoading(true);
    setTrackError("");
    setTrackResults(null);
    try {
      const results = await trackRequests(trackAccountNumber.trim());
      setTrackResults(results);
      if (results.length === 0) setTrackError("No requests found for this account number.");
    } catch {
      setTrackError("Failed to track requests. Please try again.");
    } finally {
      setTrackLoading(false);
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (loginUsername === ADMIN_USER && loginPassword === ADMIN_PASS) {
      setIsAdminAuth(true);
      setShowLoginModal(false);
      setLoginUsername("");
      setLoginPassword("");
      setPage("admin");
    } else {
      setLoginError("Invalid username or password. Please check your credentials and try again.");
    }
  };

  const openAdminLogin = () => { isAdminAuth ? setPage("admin") : setShowLoginModal(true); };
  const logoutAdmin = () => { setIsAdminAuth(false); setPage("landing"); };

  const handleRequestCreated = () => {
    loadRequests();
    setSubmitSuccess(true);
    setTimeout(() => {
      setSubmitSuccess(false);
      setPage("track");
    }, 1500);
  };

  const closeLoginModal = () => {
    setShowLoginModal(false);
    setLoginError("");
    setLoginUsername("");
    setLoginPassword("");
  };

  return (
    <div className="min-h-screen bg-base-200 flex flex-col">
      {/* Skip to content */}
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-primary focus:text-primary-content focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/50">
        Skip to main content
      </a>

      {/* Header */}
      <header className="bg-primary text-primary-content relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute -top-32 -left-32 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between py-4 border-b border-primary-content/10">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="BFP Logo" loading="lazy" className="h-14 w-14 object-contain mix-blend-multiply rounded-full" />
              <div>
                <h1 className="text-lg md:text-xl font-bold tracking-tight leading-tight">Bureau of Fire Protection</h1>
                <p className="text-xs text-primary-content/60">Fire Station Transfer Request System &mdash; Region II</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden sm:flex items-center gap-5 text-sm">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-warning" />
                  <span className="font-semibold">{pendingCount}</span>
                  <span className="text-primary-content/60">pending</span>
                </div>
                <div className="w-px h-4 bg-primary-content/20" />
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                  <span className="font-semibold">{approvedCount}</span>
                  <span className="text-primary-content/60">approved</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      {page !== "landing" && (
        <nav className="bg-base-100 border-b border-base-300 sticky top-0 z-20 shadow-sm" role="navigation" aria-label="Main navigation">
          <div className="max-w-6xl mx-auto px-4">
            <div className="flex items-center justify-center gap-2 py-2">
              <button
                onClick={() => setPage("landing")}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-base-content/50 hover:text-base-content rounded-lg hover:bg-base-200 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
              >
                <Home className="h-4 w-4" />
                <span className="hidden sm:inline">Home</span>
              </button>
              <div className="w-px h-5 bg-base-300 mx-0.5" />
              {[
                { id: "submit" as Page, icon: Plus, label: "New Request" },
                { id: "track" as Page, icon: Search, label: "Track" },
              ].map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => setPage(id)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                    page === id
                      ? "bg-primary text-primary-content shadow-sm"
                      : "text-base-content/60 hover:text-base-content hover:bg-base-200"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
              <button
                onClick={openAdminLogin}
                className={`flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                  page === "admin"
                    ? "bg-primary text-primary-content shadow-sm"
                    : "text-base-content/60 hover:text-base-content hover:bg-base-200"
                }`}
              >
                <ShieldCheck className="h-4 w-4" />
                Admin
                {isAdminAuth && <span className="badge badge-xs badge-success border-none">Auth</span>}
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Main */}
      <main id="main-content" className="flex-1 max-w-6xl mx-auto w-full px-4 py-8 scroll-mt-14">
        {/* Success Toast */}
        {submitSuccess && (
          <div className="fixed top-4 right-4 z-50 bg-success text-success-content px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-[slideIn_0.2s_ease-out]" role="status" aria-live="polite">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium text-sm">Request submitted successfully!</span>
          </div>
        )}

        {/* Landing */}
        {page === "landing" && (
          <div className="max-w-4xl mx-auto space-y-12">
            <div className="text-center space-y-3 pt-4">
              <h2 className="text-3xl font-bold text-base-content tracking-tight">Welcome</h2>
              <p className="text-base text-base-content/50 max-w-md mx-auto">Select an action below to submit or track a transfer request</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[
                { icon: Plus, bgClass: "bg-primary/10", iconClass: "text-primary", hoverBorder: "hover:border-primary/30", glowClass: "bg-primary/5", title: "Submit Request", desc: "Create a new transfer, update, or account request", action: () => setPage("submit") },
                { icon: Search, bgClass: "bg-secondary/10", iconClass: "text-secondary", hoverBorder: "hover:border-secondary/30", glowClass: "bg-secondary/5", title: "Track Request", desc: "Check the status of your submitted requests", action: () => setPage("track") },
                { icon: ShieldCheck, bgClass: "bg-accent/10", iconClass: "text-accent", hoverBorder: "hover:border-accent/30", glowClass: "bg-accent/5", title: "Admin Panel", desc: "Manage and process incoming transfer requests", action: openAdminLogin },
              ].map(({ icon: Icon, bgClass, iconClass, hoverBorder, glowClass, title, desc, action }) => (
                <button key={title} onClick={action} className={`group relative bg-base-100 rounded-2xl p-8 text-left border border-base-300 ${hoverBorder} shadow-sm hover:shadow-lg transition-all duration-200 cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`}>
                  <div className={`absolute top-0 right-0 w-32 h-32 ${glowClass} rounded-full -translate-y-16 translate-x-16 group-hover:scale-150 transition-transform duration-300`} />
                  <div className="relative">
                    <div className={`inline-flex p-3 rounded-xl ${bgClass} mb-4`}>
                      <Icon className={`h-6 w-6 ${iconClass}`} />
                    </div>
                    <h3 className="text-lg font-semibold text-base-content mb-1.5">{title}</h3>
                    <p className="text-sm text-base-content/50 leading-relaxed">{desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Submit */}
        {page === "submit" && (
          <div className="max-w-2xl mx-auto">
            <RequestForm stations={stations} onCreated={handleRequestCreated} />
          </div>
        )}

        {/* Track */}
        {page === "track" && (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-base-100 rounded-2xl border border-base-300 shadow-sm overflow-hidden">
              <div className="px-6 py-5 border-b border-base-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-secondary/10 rounded-lg">
                    <Search className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-base-content">Track Your Request</h2>
                    <p className="text-sm text-base-content/50">Enter your account number to view request status</p>
                  </div>
                </div>
              </div>
              <div className="p-6">
                <form onSubmit={handleTrack} className="flex gap-3">
                  <div className="relative flex-1">
                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/30" />
                    <input
                      type="text"
                      value={trackAccountNumber}
                      onChange={(e) => setTrackAccountNumber(e.target.value)}
                      placeholder="e.g. 2024-0001"
                      className="input input-bordered w-full pl-10"
                      required
                    />
                  </div>
                  <button type="submit" disabled={trackLoading} className="btn btn-primary gap-2">
                    {trackLoading ? <span className="loading loading-spinner loading-sm" /> : <Search className="h-4 w-4" />}
                    Search
                  </button>
                </form>
                {trackError && (
                  <div role="alert" aria-live="polite" className="alert alert-warning mt-4 gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span className="text-sm">{trackError}</span>
                  </div>
                )}
              </div>
            </div>

            {trackResults === null && (
              <div className="text-center py-8">
                <p className="text-sm text-base-content/40">Enter your account number above to search for your request.</p>
              </div>
            )}

            {trackResults && trackResults.length > 0 && (
              <div className="space-y-3">
                {trackResults.map((req) => (
                  <div key={req.id} className="bg-base-100 rounded-2xl border border-base-300 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 flex items-center justify-between border-b border-base-200">
                      <div className="flex items-center gap-3">
                        <div className="avatar placeholder">
                          <div className="bg-primary/10 text-primary rounded-full w-10 h-10">
                            <span className="text-sm font-bold">{req.first_name[0]}{req.last_name[0]}</span>
                          </div>
                        </div>
                        <div>
                          <div className="font-semibold text-base-content">
                            {[req.first_name, req.middle_name, req.last_name, req.suffix].filter(Boolean).join(" ")}
                          </div>
                          <div className="text-sm text-base-content/50">Account: {req.account_number || "N/A"}</div>
                        </div>
                      </div>
                      <span className={`badge badge-sm ${req.status === "pending" ? "badge-warning" : "badge-success"}`}>
                        {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                      </span>
                    </div>
                    <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-base-content/40 text-xs mb-0.5">Purpose</div>
                        <div className="font-medium">{req.purpose_of_request}</div>
                      </div>
                      <div>
                        <div className="text-base-content/40 text-xs mb-0.5">Rank</div>
                        <div className="font-medium">{req.rank || "\u2014"}</div>
                      </div>
                      <div>
                        <div className="text-base-content/40 text-xs mb-0.5">From</div>
                        <div className="font-medium">{req.station_from_name}</div>
                      </div>
                      <div>
                        <div className="text-base-content/40 text-xs mb-0.5">To</div>
                        <div className="font-medium">{req.station_to_name}</div>
                      </div>
                    </div>
                    <div className="px-6 py-3 bg-base-200/50 flex justify-between text-xs text-base-content/50">
                      <span>Submitted: {new Date(req.created_at).toLocaleDateString()}</span>
                      <span>{req.email}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Admin */}
        {page === "admin" && isAdminAuth && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-base-content">Admin Dashboard</h2>
              <button onClick={logoutAdmin} className="btn btn-ghost btn-sm gap-2 text-error">
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
            <RequestTable requests={requests} onUpdated={loadRequests} isAdmin />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-base-300 bg-base-100">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-base-content/50">
          <span>&copy; {new Date().getFullYear()} Bureau of Fire Protection Region II</span>
          <span>Developed by <span className="text-base-content/60 font-medium">FO3 Rani Bryan O. Pasinos</span></span>
        </div>
      </footer>

      {/* Admin Login Modal */}
      {showLoginModal && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="login-title">
          <div className="modal-box max-w-sm">
            <form onSubmit={handleAdminLogin} className="space-y-5">
              <div className="text-center">
                <div className="inline-flex p-3 bg-accent/10 rounded-2xl mb-3">
                  <Lock className="h-6 w-6 text-accent" />
                </div>
                <h3 id="login-title" className="text-lg font-bold text-base-content">Admin Login</h3>
                <p className="text-sm text-base-content/50 mt-1">Enter your credentials to continue</p>
              </div>

              {loginError && (
                <div role="alert" aria-live="assertive" className="alert alert-error py-2 gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {loginError}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="login-username" className="text-sm font-medium text-base-content flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-base-content/40" />
                  Username
                </label>
                <input
                  ref={loginInputRef}
                  id="login-username"
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="Enter username"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="text-sm font-medium text-base-content flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5 text-base-content/40" />
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={loginShowPassword ? "text" : "password"}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="input input-bordered w-full pr-10"
                    placeholder="Enter password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setLoginShowPassword(!loginShowPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-base-content/40 hover:text-base-content rounded-md transition-colors"
                    aria-label={loginShowPassword ? "Hide password" : "Show password"}
                  >
                    {loginShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="modal-action gap-2">
                <button type="button" onClick={closeLoginModal} className="btn btn-ghost btn-sm">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm gap-2">
                  <Lock className="h-3.5 w-3.5" />
                  Login
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop bg-black/40" onClick={closeLoginModal} />
        </div>
      )}
    </div>
  );
}
