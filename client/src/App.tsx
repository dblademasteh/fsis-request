import { useState, useEffect, useCallback, useRef } from "react";
import type { FireStation, TransferRequest, Personnel } from "./types";
import { fetchStations, fetchRequests, trackRequests, fetchPersonnel, loginUser } from "./api";
import { playNewRequest, playApproved, playDenied } from "./sounds";
import { requestNotificationPermission, showDeviceNotification, createNotification, type AppNotification } from "./notifications";
import { Plus, Search, ShieldCheck, Home, CheckCircle2, AlertCircle, Hash, Lock, LogOut, User, KeyRound, Eye, EyeOff, Moon, Sun, Users, FileText, Shield, Fingerprint, Bell, Info } from "lucide-react";
import LandingPage from "./components/LandingPage";
import HowItWorksPage from "./components/HowItWorksPage";
import RequestForm from "./components/RequestForm";
import { RequestCategories } from "./components/RequestCategories";
import TrackPage from "./components/TrackPage";
import RequestTable from "./components/RequestTable";
import PersonnelManager from "./components/PersonnelManager";
import NotificationPanel from "./components/NotificationPanel";
import NotificationBellButton from "./components/NotificationBellButton";

type Page = "landing" | "submit" | "track" | "admin" | "how" | "submit_category";

function AdminTabs({ requests, personnel, loadRequests, loadPersonnel }: { requests: TransferRequest[]; personnel: Personnel[]; loadRequests: () => void; loadPersonnel: () => void }) {
  const [tab, setTab] = useState<"requests" | "personnel">("requests");

  return (
    <div className="space-y-4 animate-[fadeUp_0.4s_ease-out_both] [animation-delay:80ms]">
      <div className="flex items-center gap-2 bg-base-100 rounded-xl border border-base-300 p-1">
        <button
          onClick={() => setTab("requests")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
            tab === "requests" ? "bg-primary text-primary-content shadow-sm" : "text-base-content/60 hover:text-base-content hover:bg-base-200"
          }`}
        >
          <FileText className="h-4 w-4" />
          Transfer Requests
        </button>
        <button
          onClick={() => setTab("personnel")}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
            tab === "personnel" ? "bg-primary text-primary-content shadow-sm" : "text-base-content/60 hover:text-base-content hover:bg-base-200"
          }`}
        >
          <Users className="h-4 w-4" />
          Personnel
        </button>
      </div>
      {tab === "requests" && <RequestTable requests={requests} onUpdated={loadRequests} isAdmin />}
      {tab === "personnel" && <PersonnelManager personnel={personnel} onUpdated={loadPersonnel} />}
    </div>
  );
}

export default function App() {
  const [stations, setStations] = useState<FireStation[]>([]);
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const requestsRef = useRef<TransferRequest[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [page, setPage] = useState<Page>("landing");
  const [isAdminAuth, setIsAdminAuth] = useState(() => !!localStorage.getItem("fsis_auth_token"));
  const [_authToken, setAuthToken] = useState<string | null>(() => localStorage.getItem("fsis_auth_token"));

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginShowPassword, setLoginShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const loginInputRef = useRef<HTMLInputElement>(null);

  const [trackAccountNumber, setTrackAccountNumber] = useState("");
  const [trackResults, setTrackResults] = useState<TransferRequest[] | null>(null);
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState("");
  const [selectedPurpose, setSelectedPurpose] = useState<string>("");

  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const stored = localStorage.getItem("fsis_dark_mode");
    if (stored !== null) return stored === "true";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  const [dpaAccepted, setDpaAccepted] = useState(() => localStorage.getItem("fsis_dpa_accepted") === "true");
  const [userAccountNumber, setUserAccountNumber] = useState(() => localStorage.getItem("fsis_account_number") || "");
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [accountInput, setAccountInput] = useState("");
  const [accountError, setAccountError] = useState("");
  const prevApprovedIds = useRef<Set<number>>(new Set());
  const hasInitializedPolling = useRef(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const prevRequestIds = useRef<Set<number>>(new Set());

  useEffect(() => {
    requestNotificationPermission();
  }, []);

  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", darkMode ? "bfp-dark" : "bfp");
    localStorage.setItem("fsis_dark_mode", String(darkMode));
  }, [darkMode]);

  const loadStations = useCallback(async () => {
    try { setStations(await fetchStations()); } catch { console.error("Failed to load stations"); }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const data = await fetchRequests();
      if (hasInitializedPolling.current) {
        // Detect new requests (admin)
        if (isAdminAuth) {
          for (const r of data) {
            if (!prevRequestIds.current.has(r.id)) {
              const notif = createNotification("new_request", r.first_name, r.last_name, r.purpose_of_request);
              setNotifications((prev) => [notif, ...prev].slice(0, 50));
              showDeviceNotification("New Request Received", `${r.first_name} ${r.last_name} submitted a ${r.purpose_of_request.toLowerCase()} request.`);
              playNewRequest();
            }
          }
        }
        // Detect approved/denied for this user
        if (userAccountNumber) {
          for (const r of data) {
            if (r.account_number === userAccountNumber) {
              const wasSeen = prevRequestIds.current.has(r.id);
              if (wasSeen) {
                const prevReq = requestsRef.current.find((req) => req.id === r.id);
                if (prevReq && prevReq.status === "pending" && r.status === "approved") {
                  const purposeMsg = r.purpose_of_request;
                  const notif = createNotification("approved", r.first_name, r.last_name, purposeMsg);
                  setNotifications((prev) => [notif, ...prev].slice(0, 50));
                  showDeviceNotification("Request Approved", purposeMsg === "Transfer of Unit Assignment" ? `${r.first_name}'s ${purposeMsg.toLowerCase()} request has been approved.` : (purposeMsg === "New FSIS Account" ? `New e Request account approved for ${r.first_name} ${r.last_name}. Password reset email sent.` : `Your ${purposeMsg.toLowerCase()} request has been approved.`));
                  playApproved();
                }
                if (prevReq && prevReq.status === "pending" && r.status === "denied") {
                  const notif = createNotification("denied", r.first_name, r.last_name);
                  setNotifications((prev) => [notif, ...prev].slice(0, 50));
                  showDeviceNotification("Request Denied", "Your transfer request has been denied.");
                  playDenied();
                }
              }
            }
          }
        }
      }
      const allIds = new Set(data.map((r) => r.id));
      prevRequestIds.current = allIds;
      const approvedIds = new Set(data.filter((r) => r.status === "approved").map((r) => r.id));
      prevApprovedIds.current = approvedIds;
      setRequests(data);
      hasInitializedPolling.current = true;
    } catch {
      console.error("Failed to load requests");
    }
  }, [isAdminAuth, userAccountNumber]);

  useEffect(() => { requestsRef.current = requests; }, [requests]);

  const loadPersonnel = useCallback(async () => {
    try { setPersonnel(await fetchPersonnel()); } catch { console.error("Failed to load personnel"); }
  }, []);

  useEffect(() => { loadStations(); loadRequests(); loadPersonnel(); }, [loadStations, loadRequests, loadPersonnel]);

  useEffect(() => {
    const interval = setInterval(() => { loadRequests(); }, 15000);
    return () => clearInterval(interval);
  }, [loadRequests]);

  useEffect(() => {
    if (showLoginModal && loginInputRef.current) {
      loginInputRef.current.focus();
    }
  }, [showLoginModal]);

  const me = personnel.find((p) => p.account_number === userAccountNumber);
  const isLoggedIn = !!me && !!userAccountNumber;
  const myDisplayName = isLoggedIn ? [...(me.rank ? [me.rank] : []), me.first_name, me.last_name].filter(Boolean).join(" ") : "";

  useEffect(() => {
    if (dpaAccepted && !isLoggedIn) {
      setShowAccountModal(true);
    }
  }, [dpaAccepted, isLoggedIn]);

  const logoutUser = () => {
    localStorage.removeItem("fsis_account_number");
    localStorage.removeItem("fsis_dpa_accepted");
    setUserAccountNumber("");
    setDpaAccepted(false);
  };

  const landingNotifWidget = (
    <div className="relative" data-notif-wrapper>
      <div data-notif-trigger>
        <NotificationBellButton count={unreadCount} onClick={() => setShowNotifPanel(!showNotifPanel)} />
      </div>
      {showNotifPanel && (
        <div className="absolute right-0 top-full mt-2 z-50">
          <NotificationPanel notifications={notifications} onMarkAllRead={markAllRead} onClear={clearNotifications} />
        </div>
      )}
    </div>
  );

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackAccountNumber.trim()) return;
    localStorage.setItem("fsis_account_number", trackAccountNumber.trim());
    setUserAccountNumber(trackAccountNumber.trim());
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

  // Auto-load saved account number when entering track page
  useEffect(() => {
    if (page === "track") {
      const saved = localStorage.getItem("fsis_account_number");
      if (saved && !trackAccountNumber) {
        setTrackAccountNumber(saved);
      }
    }
  }, [page]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const { token } = await loginUser(loginUsername, loginPassword);
      localStorage.setItem("fsis_auth_token", token);
      setAuthToken(token);
      setIsAdminAuth(true);
      setShowLoginModal(false);
      setLoginUsername("");
      setLoginPassword("");
      setPage("admin");
    } catch (err: any) {
      setLoginError(err.message || "Invalid username or password. Please check your credentials and try again.");
    }
  };

  const openAdminLogin = () => { isAdminAuth ? setPage("admin") : setShowLoginModal(true); };
  const logoutAdmin = () => {
    localStorage.removeItem("fsis_auth_token");
    setIsAdminAuth(false);
    setAuthToken(null);
    setPage("landing");
  };

  const handleRequestCreated = (accountNum?: string) => {
    if (accountNum && !userAccountNumber) {
      localStorage.setItem("fsis_account_number", accountNum);
      setUserAccountNumber(accountNum);
    }
    loadRequests();
    setSubmitSuccess(true);
    setTimeout(() => {
      setSubmitSuccess(false);
      setPage("track");
    }, 3000);
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

      {/* Top Bar — Desktop only */}
      {page !== "landing" && (
        <nav className="hidden sm:block bg-base-100 border-b border-base-300 sticky top-0 z-20 shadow-sm" role="navigation" aria-label="Main navigation" style={{ paddingTop: "env(safe-area-inset-top)" }}>
          <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage("landing")}
                  className="flex items-center gap-2 px-4 py-2 text-base font-medium text-base-content/50 hover:text-base-content rounded-lg hover:bg-base-200 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                >
                  <Home className="h-5 w-5" />
                  <span>Home</span>
                </button>
                <div className="w-px h-6 bg-base-300 mx-1" />
                {[
                  { id: "submit_category" as Page, icon: Plus, label: "New Request" },
                  { id: "track" as Page, icon: Search, label: "Track" },
                  { id: "how" as Page, icon: Info, label: "How it Works" },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setPage(id)}
                    className={`flex items-center gap-2 px-5 py-2 text-base font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                      page === id
                        ? "bg-primary text-primary-content shadow-sm"
                        : "text-base-content/60 hover:text-base-content hover:bg-base-200"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
                <button
                  onClick={openAdminLogin}
                  className={`flex items-center gap-2 px-5 py-2 text-base font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                    page === "admin"
                      ? "bg-primary text-primary-content shadow-sm"
                      : "text-base-content/60 hover:text-base-content hover:bg-base-200"
                  }`}
                >
                  <ShieldCheck className="h-5 w-5" />
                  Admin
                  {isAdminAuth && <span className="badge badge-xs badge-success border-none">Auth</span>}
                </button>
              </div>
              <div className="flex items-center gap-1 relative" data-notif-wrapper>
                <div data-notif-trigger>
                  <NotificationBellButton count={unreadCount} onClick={() => setShowNotifPanel(!showNotifPanel)} />
                </div>
                {showNotifPanel && (
                  <div className="absolute right-0 top-full mt-2 z-50">
                    <NotificationPanel notifications={notifications} onMarkAllRead={markAllRead} onClear={clearNotifications} />
                  </div>
                )}
                <button
                  onClick={() => setDarkMode(!darkMode)}
                  className="flex items-center gap-2 px-3 py-2 text-base font-medium rounded-lg text-base-content/60 hover:text-base-content hover:bg-base-200 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                  aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
                >
                  {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Bottom Nav — Mobile only */}
      {page !== "landing" && (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-base-100 border-t border-base-300 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]" role="navigation" aria-label="Main navigation" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex items-center justify-around py-1.5 px-2">
              {[
                { id: "submit_category" as Page, icon: Plus, label: "New Request" },
                { id: "track" as Page, icon: Search, label: "Track" },
                { id: "how" as Page, icon: Info, label: "Guide" },
                { id: "admin" as Page, icon: ShieldCheck, label: "Admin" },
              ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => id === "admin" ? openAdminLogin() : setPage(id)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 min-w-[60px] ${
                  page === id
                    ? "text-primary"
                    : "text-base-content/50 active:text-base-content"
                }`}
                aria-label={label}
              >
                <div className={`p-1.5 rounded-xl transition-all duration-200 ${
                  page === id ? "bg-primary/10" : ""
                }`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium leading-none">{label}</span>
                {id === "admin" && isAdminAuth && (
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-success rounded-full" />
                )}
              </button>
            ))}
            <div className="relative" data-notif-wrapper>
              <button
                onClick={() => setShowNotifPanel(!showNotifPanel)}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-base-content/50 active:text-base-content transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 min-w-[60px]"
                aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
              >
                <div className="relative p-1.5">
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-[14px] flex items-center justify-center bg-error text-error-content text-[8px] font-bold rounded-full px-0.5">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium leading-none">Alerts</span>
              </button>
              {showNotifPanel && (
                <div className="absolute bottom-full right-0 mb-2 z-50">
                  <NotificationPanel notifications={notifications} onMarkAllRead={markAllRead} onClear={clearNotifications} />
                </div>
              )}
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-base-content/50 active:text-base-content transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 min-w-[60px]"
              aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              <div className="p-1.5">
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </div>
              <span className="text-[10px] font-medium leading-none">{darkMode ? "Light" : "Dark"}</span>
            </button>
          </div>
        </nav>
      )}

      {/* Main */}
      {page === "landing" ? (
        <LandingPage
          latestRequest={
            userAccountNumber
              ? requests
                  .filter((r) => r.account_number === userAccountNumber)
                  .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ?? null
              : null
          }
          displayName={myDisplayName}
          onLogoutUser={logoutUser}
          notifWidget={landingNotifWidget}
          dpaAccepted={dpaAccepted}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
onSubmit={() => setPage("submit_category")}
          onTrack={() => setPage("track")}
          onAdminLogin={openAdminLogin}
          onShowPrivacy={() => setShowPrivacyModal(true)}
          onHowItWorks={() => setPage("how")}
        />
      ) : (
      <main id="main-content" className="flex-1 max-w-6xl mx-auto w-full px-3 sm:px-4 md:px-6 lg:px-8 pt-4 sm:pt-6 md:pt-8 pb-24 sm:pb-8 md:pb-8 scroll-mt-14">
        {/* Success Toast */}
        {submitSuccess && (
          <div className="fixed top-4 right-4 z-50 bg-success text-success-content px-5 py-3 rounded-xl shadow-lg flex items-center gap-2 animate-[slideIn_0.2s_ease-out]" role="status" aria-live="polite">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium text-sm">Request submitted successfully!</span>
          </div>
        )}

        {/* Submit - Categories */}
        {page === "submit_category" && (
          <div className="max-w-2xl mx-auto">
            <RequestCategories onSelect={(purpose) => {
              if (purpose) {
                setSelectedPurpose(purpose);
                setPage("submit");
              } else {
                setPage("landing");
              }
            }} />
          </div>
        )}

        {/* Submit - Form */}
        {page === "submit" && (
          <div className="max-w-2xl mx-auto">
            <RequestForm stations={stations} personnel={personnel} onCreated={handleRequestCreated} preselectedPurpose={selectedPurpose} />
          </div>
        )}

        {/* How it works */}
        {page === "how" && (
          <HowItWorksPage onBack={() => setPage("landing")} onSubmit={() => setPage("submit_category")} />
        )}

        {/* Track */}
        {page === "track" && (
          <TrackPage
            accountNumber={trackAccountNumber}
            onAccountNumberChange={setTrackAccountNumber}
            onSubmit={handleTrack}
            loading={trackLoading}
            error={trackError}
            results={trackResults}
          />
        )}

        {/* Admin */}
        {page === "admin" && isAdminAuth && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-[fadeUp_0.4s_ease-out_both]">
              <div className="flex items-center gap-3">
                <div className="bg-accent/10 p-2.5 rounded-xl">
                  <ShieldCheck className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-base-content">Admin Dashboard</h2>
                  <p className="text-xs sm:text-sm text-base-content/50">Manage and process incoming requests</p>
                </div>
              </div>
              <button onClick={logoutAdmin} className="btn btn-ghost btn-sm gap-2 text-error self-start sm:self-auto">
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>

            <AdminTabs requests={requests} personnel={personnel} loadRequests={loadRequests} loadPersonnel={loadPersonnel} />
          </div>
        )}
      </main>
      )}


      {/* Footer */}
      <footer className={`border-t border-base-300 bg-base-100 mt-auto py-4 ${page !== "landing" ? "max-sm:pb-[calc(72px+env(safe-area-inset-bottom))]" : ""}`}>
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 text-xs text-base-content/60 text-center">
          <span>&copy; {new Date().getFullYear()} Bureau of Fire Protection Region II</span>
          <span className="hidden sm:inline">|</span>
          <span>Developed by: <span className="text-base-content/70 font-medium">FO3 Rani Bryan O. Pasinos</span></span>
        </div>
      </footer>

      {/* Admin Login Modal */}
      {showLoginModal && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="login-title">
          <div className="modal-box max-w-sm p-5 sm:p-6">
            <form onSubmit={handleAdminLogin} className="space-y-4">
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

      {/* Data Privacy Notice Modal */}
      {(!dpaAccepted || showPrivacyModal) && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="privacy-title">
          <div className="modal-box max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield className="h-5 w-5 text-primary" />
              </div>
              <h3 id="privacy-title" className="text-lg font-bold text-base-content">Data Privacy Notice</h3>
            </div>

            <div className="space-y-4 text-sm text-base-content/70 leading-relaxed">
              <div>
                <h4 className="font-semibold text-base-content mb-1">Republic Act No. 10173</h4>
                <p className="text-xs text-base-content/50">Data Privacy Act of 2012 and its Implementing Rules and Regulations</p>
              </div>

              <div>
                <h4 className="font-semibold text-base-content mb-1">Collection of Personal Information</h4>
                <p>
                  The Bureau of Fire Protection Region II collects personal information through this Unified BFP R2 eRequest Form
                  for the purpose of processing personnel transfer requests, account updates, and related administrative actions.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-base-content mb-1">Information Collected</h4>
                <p>The following personal information may be collected:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                  <li>Full name (first name, middle name, last name, suffix)</li>
                  <li>Rank and designation</li>
                  <li>Account number</li>
                  <li>Email address</li>
                  <li>Station assignment</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-base-content mb-1">Use of Information</h4>
                <p>
                  Your personal information is used solely for processing your transfer request and will not be shared with
                  third parties except as required by law or as necessary for the completion of the requested service.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-base-content mb-1">Data Security</h4>
                <p>
                  The BFP implements appropriate organizational, physical, and technical security measures to protect your
                  personal information against unauthorized access, accidental or unlawful destruction, alteration, or disclosure.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-base-content mb-1">Your Rights</h4>
                <p>Under the Data Privacy Act, you have the right to:</p>
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-xs">
                  <li>Be informed how your personal data is processed</li>
                  <li>Access copies of your personal data</li>
                  <li>Object to the processing of your personal data</li>
                  <li>Erase or restrict the processing of your personal data</li>
                  <li>Rectify any inaccurate personal data</li>
                  <li>Data portability</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold text-base-content mb-1">Data Retention</h4>
                <p>
                  Personal information is retained only for as long as necessary to fulfill the purpose for which it was
                  collected, or as required by applicable laws and regulations.
                </p>
              </div>

              <div>
                <h4 className="font-semibold text-base-content mb-1">Contact</h4>
                <p>
                  For questions or concerns regarding the processing of your personal data, you may contact the BFP Region II
                  Data Protection Officer through the official channels of the Bureau of Fire Protection Region II.
                </p>
              </div>
            </div>

            <div className="modal-action">
              {dpaAccepted ? (
                <button onClick={() => setShowPrivacyModal(false)} className="btn btn-ghost btn-sm">
                  Close
                </button>
              ) : (
                <button onClick={() => { localStorage.setItem("fsis_dpa_accepted", "true"); setDpaAccepted(true); }} className="btn btn-primary btn-sm">
                  I Understand
                </button>
              )}
            </div>
          </div>
          <div className="modal-backdrop bg-black/40" />
        </div>
      )}

      {/* Account Number Collection Modal */}
      {dpaAccepted && !userAccountNumber && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="account-title">
          <div className="modal-box max-w-sm">
            <div className="text-center mb-5">
              <div className="inline-flex p-3 bg-primary/10 rounded-2xl mb-3">
                <Fingerprint className="h-7 w-7 text-primary" />
              </div>
              <h3 id="account-title" className="text-lg font-bold text-base-content">Welcome</h3>
              <p className="text-xs text-base-content/50 mt-1">Enter your account number to get started. This will be used throughout your session.</p>
            </div>

            {accountError && (
              <div role="alert" className="alert alert-warning py-2 gap-2 text-xs mb-3">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>{accountError}</span>
              </div>
            )}

            <form onSubmit={(e) => {
              e.preventDefault();
              const val = accountInput.trim();
              if (!val) { setAccountError("Account number is required."); return; }
              localStorage.setItem("fsis_account_number", val);
              setUserAccountNumber(val);
              setShowAccountModal(false);
              setAccountError("");
            }} className="space-y-3">
              <div>
                <label htmlFor="account-num" className="text-xs font-medium text-base-content/70 flex items-center gap-1 mb-1">
                  <Hash className="h-3 w-3" />
                  Account Number <span className="text-error">*</span>
                </label>
                <input
                  id="account-num"
                  type="text"
                  value={accountInput}
                  onChange={(e) => { setAccountInput(e.target.value); setAccountError(""); }}
                  className="input input-bordered w-full"
                  placeholder="A12345"
                  autoFocus
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-sm btn-block gap-2">
                <Lock className="h-3.5 w-3.5" />
                Continue
              </button>
            </form>

            <div className="text-center mt-3">
              <button onClick={() => { setShowAccountModal(true); }} className="text-[10px] text-base-content/40 hover:text-base-content/60 transition-colors">
                Change account number
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-black/40" />
        </div>
      )}

      {/* Change Account Number Modal */}
      {dpaAccepted && userAccountNumber && showAccountModal && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="change-account-title">
          <div className="modal-box max-w-sm">
            <div className="text-center mb-4">
              <div className="inline-flex p-3 bg-primary/10 rounded-2xl mb-3">
                <Fingerprint className="h-6 w-6 text-primary" />
              </div>
              <h3 id="change-account-title" className="text-lg font-bold text-base-content">Change Account Number</h3>
              <p className="text-xs text-base-content/50 mt-1">Current: <span className="font-mono font-medium text-base-content">{userAccountNumber}</span></p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const val = accountInput.trim();
              if (!val) { setAccountError("Account number is required."); return; }
              localStorage.setItem("fsis_account_number", val);
              setUserAccountNumber(val);
              setShowAccountModal(false);
              setAccountInput("");
              setAccountError("");
            }} className="space-y-3">
              <div>
                <label htmlFor="change-account-num" className="text-xs font-medium text-base-content/70 flex items-center gap-1 mb-1">
                  <Hash className="h-3 w-3" />
                  New Account Number <span className="text-error">*</span>
                </label>
                <input
                  id="change-account-num"
                  type="text"
                  value={accountInput}
                  onChange={(e) => { setAccountInput(e.target.value); setAccountError(""); }}
                  className="input input-bordered w-full"
                  placeholder="A12345"
                  autoFocus
                  required
                />
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setShowAccountModal(false); setAccountInput(""); setAccountError(""); }} className="btn btn-ghost btn-sm flex-1">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm flex-1 gap-2">
                  <Lock className="h-3.5 w-3.5" />
                  Update
                </button>
              </div>
            </form>
          </div>
          <div className="modal-backdrop bg-black/40" onClick={() => { setShowAccountModal(false); setAccountInput(""); setAccountError(""); }} />
        </div>
      )}
    </div>
  );
}
