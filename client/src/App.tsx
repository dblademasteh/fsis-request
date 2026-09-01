import { useState, useEffect, useCallback, useRef } from "react";
import type { FireStation, TransferRequest, Personnel, AppSettings } from "./types";
import { fetchStations, fetchRequests, trackRequests, fetchPersonnel, loginUser, fetchSettings, updateSettings, uploadLogo, createStation, updateStation, deleteStation } from "./api";
import { playNewRequest, playApproved, playDenied } from "./sounds";
import { requestNotificationPermission, showDeviceNotification, createNotification, type AppNotification } from "./notifications";
import { Plus, Search, ShieldCheck, CheckCircle2, AlertCircle, Hash, Lock, LogOut, User, KeyRound, Eye, EyeOff, Moon, Sun, Users, Shield, Fingerprint, Bell, Info, PlayCircle, ChevronDown, MoreHorizontal, Home, Settings, Save, Loader2, MapPin, Trash2, Pencil } from "lucide-react";
import LandingPage from "./components/LandingPage";
import HowItWorksPage from "./components/HowItWorksPage";
import VideoTutorialsPage from "./components/VideoTutorialsPage";
import RequestForm from "./components/RequestForm";
import { RequestCategories } from "./components/RequestCategories";
import TrackPage from "./components/TrackPage";
import RequestTable from "./components/RequestTable";
import PersonnelManager from "./components/PersonnelManager";
import NotificationPanel from "./components/NotificationPanel";
import NotificationBellButton from "./components/NotificationBellButton";
import { AppLogo } from "./components/AppLogo";
import { useFocusTrap } from "./hooks/useFocusTrap";

type Page = "landing" | "submit" | "track" | "admin" | "admin_settings" | "how" | "submit_category" | "videos";

function AdminTabs({ requests, loadRequests }: { requests: TransferRequest[]; loadRequests: () => void }) {
  return (
    <div className="animate-[fadeUp_0.4s_ease-out_both] [animation-delay:80ms]">
      <RequestTable requests={requests} onUpdated={loadRequests} isAdmin />
    </div>
  );
}

export default function App() {
  const [stations, setStations] = useState<FireStation[]>([]);
  const [requests, setRequests] = useState<TransferRequest[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const requestsRef = useRef<TransferRequest[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [personnelLoaded, setPersonnelLoaded] = useState(false);
  const [showSplash, setShowSplash] = useState(true);
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
  const loginModalRef = useRef<HTMLDivElement>(null);
  const privacyModalRef = useRef<HTMLDivElement>(null);

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
  const pendingUserPage = useRef<Page | null>(null);
  const prevApprovedIds = useRef<Set<number>>(new Set());
  const [appSettingsForm, setAppSettingsForm] = useState<{ app_name: string; logo_url: string; logo_data?: string }>({ app_name: "", logo_url: "" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [saveDialog, setSaveDialog] = useState<{ open: boolean; ok: boolean; message: string } | null>(null);
  const [stationFormOpen, setStationFormOpen] = useState(false);
  const [stationResult, setStationResult] = useState<{ open: boolean; ok: boolean; message: string } | null>(null);
  const [stationSearch, setStationSearch] = useState("");
  const [stationForm, setStationForm] = useState<{ id: number | null; station_name: string; municipality: string; province: string }>({ id: null, station_name: "", municipality: "", province: "Cagayan Valley" });
  const [stationSaving, setStationSaving] = useState(false);
  const hasInitializedPolling = useRef(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showResourcesDropdown, setShowResourcesDropdown] = useState(false);
  const [showAdminDropdown, setShowAdminDropdown] = useState(false);
  const resourcesDropdownRef = useRef<HTMLDivElement>(null);
  const resourcesDropdownMobileRef = useRef<HTMLDivElement>(null);
  const adminDropdownRef = useRef<HTMLDivElement>(null);
  const notifWrapperRef = useRef<HTMLDivElement>(null);
  const prevRequestIds = useRef<Set<number>>(new Set());

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (showResourcesDropdown) {
        const desktopContains = resourcesDropdownRef.current?.contains(e.target as Node);
        const mobileContains = resourcesDropdownMobileRef.current?.contains(e.target as Node);
        if (!desktopContains && !mobileContains) {
          setShowResourcesDropdown(false);
        }
      }
      if (showAdminDropdown && adminDropdownRef.current && !adminDropdownRef.current.contains(e.target as Node)) {
        setShowAdminDropdown(false);
      }
      if (showNotifPanel && notifWrapperRef.current && !notifWrapperRef.current.contains(e.target as Node)) {
        setShowNotifPanel(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showResourcesDropdown, showNotifPanel, showAdminDropdown, resourcesDropdownRef, resourcesDropdownMobileRef, adminDropdownRef]);

  const loadSettings = useCallback(async () => {
    try {
      const s = await fetchSettings();
      setSettings(s);
      setAppSettingsForm({ app_name: s.app_name, logo_url: s.logo_url || "" });
    } catch {
      console.error("Failed to load settings");
    }
  }, []);

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
    try {
      setPersonnel(await fetchPersonnel());
    } catch {
      console.error("Failed to load personnel");
    } finally {
      setPersonnelLoaded(true);
    }
  }, []);

  useEffect(() => { loadStations(); loadRequests(); loadPersonnel(); loadSettings(); }, [loadStations, loadRequests, loadPersonnel, loadSettings]);

  useEffect(() => {
    const interval = setInterval(() => { loadRequests(); }, 15000);
    return () => clearInterval(interval);
  }, [loadRequests]);

  useEffect(() => {
    if (showLoginModal && loginInputRef.current) {
      loginInputRef.current.focus();
    }
  }, [showLoginModal]);

  // Scroll to top whenever the active page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [page]);

  useFocusTrap(showLoginModal, loginModalRef, () => {
    setShowLoginModal(false);
    setLoginError("");
    setLoginUsername("");
    setLoginPassword("");
  });
  useFocusTrap(showPrivacyModal || !dpaAccepted, privacyModalRef, () => {
    if (showPrivacyModal) setShowPrivacyModal(false);
  });

  const me = personnel.find((p) => p.account_number === userAccountNumber);
  // A user is only considered "logged in" if their account number exists in the
  // personnel table (validated against the database). If the saved number is not
  // found, the account-number prompt reappears on refresh.
  const isLoggedIn = !!me && !!userAccountNumber;
  const myDisplayName = isLoggedIn ? [...(me.rank ? [me.rank] : []), me.first_name, me.last_name].filter(Boolean).join(" ") : "";

  useEffect(() => {
    if (!personnelLoaded) return; // wait for data before judging session
    // Close the account modal once the user is logged in (e.g. entered account
    // via Request/Track). The modal is no longer auto-shown on page load.
    if (isLoggedIn) {
      setShowAccountModal(false);
    }
  }, [dpaAccepted, isLoggedIn, personnelLoaded]);

  // Splash screen: hide shortly after initial data settles (with a safety timeout)
  useEffect(() => {
    if (!showSplash) return;
    if (personnelLoaded) {
      const t = setTimeout(() => setShowSplash(false), 500);
      return () => clearTimeout(t);
    }
    const fallback = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(fallback);
  }, [personnelLoaded, showSplash]);

  const logoutUser = () => {
    localStorage.removeItem("fsis_account_number");
    localStorage.removeItem("fsis_dpa_accepted");
    setUserAccountNumber("");
    setDpaAccepted(false);
  };

  // Navigate to a user flow (Request/Track). If the user isn't logged in, keep
  // them on the current page and require an account number before proceeding.
  const handleUserNavigation = (next: Page) => {
    if (!isLoggedIn && !isAdminAuth) {
      pendingUserPage.current = next;
      setShowAccountModal(true);
      return;
    }
    setPage(next);
  };

  const landingNotifWidget = (
    <div className="relative" data-notif-wrapper ref={notifWrapperRef}>
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
    // Only set the logged-in account number if it exists in the personnel
    // database. Tracking still works for any number (e.g. new-account requests),
    // but a non-registered number cannot be used to "log in".
    const isRegistered = personnel.some((p) => p.account_number === trackAccountNumber.trim());
    if (isRegistered) {
      localStorage.setItem("fsis_account_number", trackAccountNumber.trim());
      setUserAccountNumber(trackAccountNumber.trim());
    }
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
      setShowAccountModal(false);
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

  useEffect(() => {
    const onAuthExpired = () => {
      setIsAdminAuth(false);
      setAuthToken(null);
      setPage("landing");
    };
    window.addEventListener("fsis-auth-expired", onAuthExpired);
    return () => window.removeEventListener("fsis-auth-expired", onAuthExpired);
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsSaving(true);
    setSettingsSaved(false);
    try {
      const updated = await updateSettings(appSettingsForm);
      setSettings(updated);
      setAppSettingsForm({ app_name: updated.app_name, logo_url: updated.logo_url || "" });
      setSettingsSaved(true);
      setSaveDialog({ open: true, ok: true, message: "Settings saved successfully." });
      setTimeout(() => setSettingsSaved(false), 2000);
    } catch (err: any) {
      setSettingsSaved(false);
      setSaveDialog({ open: true, ok: false, message: err.message || "Failed to save settings. Please try again." });
    } finally {
      setSettingsSaving(false);
    }
  };

  const openAddStation = () => {
    setStationForm({ id: null, station_name: "", municipality: "", province: "Cagayan Valley" });
    setStationFormOpen(true);
  };

  const openEditStation = (s: FireStation) => {
    setStationForm({ id: s.id, station_name: s.station_name, municipality: s.municipality, province: s.province });
    setStationFormOpen(true);
  };

  const saveStation = async (e: React.FormEvent) => {
    e.preventDefault();
    setStationSaving(true);
    try {
      if (stationForm.id === null) {
        const created = await createStation(stationForm);
        setStations((prev) => [...prev, created].sort((a, b) => a.station_name.localeCompare(b.station_name)));
        setStationResult({ open: true, ok: true, message: "Station added successfully." });
      } else {
        const updated = await updateStation(stationForm.id, stationForm);
        setStations((prev) => prev.map((s) => (s.id === updated.id ? updated : s)).sort((a, b) => a.station_name.localeCompare(b.station_name)));
        setStationResult({ open: true, ok: true, message: "Station updated successfully." });
      }
      setStationFormOpen(false);
      setStationForm({ id: null, station_name: "", municipality: "", province: "Cagayan Valley" });
    } catch (err: any) {
      setStationResult({ open: true, ok: false, message: err.message || "Failed to save station." });
    } finally {
      setStationSaving(false);
    }
  };

  const removeStation = async (s: FireStation) => {
    if (!window.confirm(`Delete fire station "${s.station_name}"?`)) return;
    try {
      await deleteStation(s.id);
      setStations((prev) => prev.filter((st) => st.id !== s.id));
      setStationResult({ open: true, ok: true, message: "Station deleted successfully." });
    } catch (err: any) {
      setStationResult({ open: true, ok: false, message: err.message || "Failed to delete station." });
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Only allow image files up to 5MB
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be under 5MB.");
      return;
    }
    // Check auth token exists
    const token = localStorage.getItem("fsis_auth_token");
    if (!token) {
      alert("Please log in as admin first.");
      return;
    }
    setSettingsSaving(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
      // Upload to server to get a URL
      const result = await uploadLogo({ logo_data: dataUrl, filename: file.name });
      // Set logo_url to the returned URL and clear logo_data
      setAppSettingsForm({ ...appSettingsForm, logo_url: result.logo_url, logo_data: "" });
    } catch (err: any) {
      alert(err.message || "Failed to upload logo.");
    } finally {
      setSettingsSaving(false);
      // Clear the file input so the same file can be re-selected if needed
      if (e.target) e.target.value = "";
    }
  };

  const handleRequestCreated = (accountNum?: string) => {
    // Only set the logged-in account number if it exists in the personnel
    // database. A newly-created account (e.g. "New FSIS Account") may not be
    // registered yet, so it is not used to log in.
    if (accountNum && !userAccountNumber && personnel.some((p) => p.account_number === accountNum)) {
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
      {/* Splash Screen */}
      {showSplash && (
        <div className="fixed inset-0 z-[90] bg-base-100 flex flex-col items-center justify-center gap-6 animate-[fadeIn_0.3s_ease-out]" role="status" aria-live="polite" aria-label="Loading application">
          <AppLogo variant="splash" logoUrl={settings?.logo_url || undefined} />
          <p className="text-xs uppercase tracking-[0.25em] text-base-content/40">{settings?.app_name || "BFP Region II · eRequest"}</p>
        </div>
      )}

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
                  className="flex items-center gap-2 px-4 py-2 text-base font-medium rounded-lg text-base-content/60 hover:text-base-content hover:bg-base-200 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                  aria-label="Home"
                >
                  <Home className="h-5 w-5" />
                  Home
                </button>
                {[
                  { id: "submit_category" as Page, icon: Plus, label: "New Request" },
                  { id: "track" as Page, icon: Search, label: "Track" },
                ].map(({ id, icon: Icon, label }) => (
                  <button
                    key={id}
                    onClick={() => setPage(id)}
                    className={`flex items-center gap-2 px-4 py-2 text-base font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                      page === id
                        ? "bg-primary text-primary-content shadow-sm"
                        : "text-base-content/60 hover:text-base-content hover:bg-base-200"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                    {label}
                  </button>
                ))}
                {/* Resources dropdown — groups How it Works & Video Tutorials */}
                <div className="relative" ref={resourcesDropdownRef}>
                  <button
                    onClick={() => setShowResourcesDropdown(!showResourcesDropdown)}
                    className={`flex items-center gap-2 px-4 py-2 text-base font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                      page === "how" || page === "videos"
                        ? "bg-primary text-primary-content shadow-sm"
                        : "text-base-content/60 hover:text-base-content hover:bg-base-200"
                    }`}
                    aria-haspopup="menu"
                    aria-expanded={showResourcesDropdown}
                  >
                    <Info className="h-5 w-5" aria-hidden="true" />
                    <span>Resources</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showResourcesDropdown ? "rotate-180" : ""} text-base-content/40`} />
                  </button>
                  {showResourcesDropdown && (
                    <div
                      role="menu"
                      className="absolute left-0 top-full mt-1 min-w-[180px] z-[30] bg-base-100 border border-base-300 rounded-xl shadow-lg ring-1 ring-black/5 animate-[fadeUp_0.15s_ease-out]"
                    >
                      <div className="py-1">
                        <button
                          role="menuitem"
                          onClick={() => { setPage("how"); setShowResourcesDropdown(false); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-base-content hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                        >
                          <Info className="h-4 w-4 text-base-content/50" />
                          How it Works
                        </button>
                        <button
                          role="menuitem"
                          onClick={() => { setPage("videos"); setShowResourcesDropdown(false); }}
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-base-content hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                        >
                          <PlayCircle className="h-4 w-4 text-base-content/50" />
                          Video Tutorials
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {/* Admin — dropdown with Dashboard & Settings when authenticated */}
                <div className="relative" ref={adminDropdownRef}>
                  {isAdminAuth ? (
                    <>
                      <button
                        onClick={() => setShowAdminDropdown(!showAdminDropdown)}
                        className={`flex items-center gap-2 px-4 py-2 text-base font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 ${
                          page === "admin" || page === "admin_settings"
                            ? "bg-accent text-accent-content shadow-sm"
                            : "text-accent/80 hover:text-accent hover:bg-accent/10"
                        }`}
                        aria-haspopup="menu"
                        aria-expanded={showAdminDropdown}
                      >
                        <ShieldCheck className="h-5 w-5" />
                        Admin
                        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${showAdminDropdown ? "rotate-180" : ""} text-accent-content/50`} />
                      </button>
                      {showAdminDropdown && (
                        <div
                          role="menu"
                          className="absolute right-0 top-full mt-1 min-w-[180px] z-[30] bg-base-100 border border-base-300 rounded-xl shadow-lg ring-1 ring-black/5 animate-[fadeUp_0.15s_ease-out]"
                        >
                          <div className="py-1">
                            <button
                              role="menuitem"
                              onClick={() => { setPage("admin"); setShowAdminDropdown(false); }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-accent/80 hover:text-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                            >
                              <ShieldCheck className="h-4 w-4" />
                              Dashboard
                            </button>
                            <button
                              role="menuitem"
                              onClick={() => { setPage("admin_settings"); setShowAdminDropdown(false); }}
                              className="flex items-center gap-2 w-full px-3 py-2 text-sm text-accent/80 hover:text-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                            >
                              <Settings className="h-4 w-4" />
                              Settings
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={openAdminLogin}
                      className={`flex items-center gap-2 px-4 py-2 text-base font-medium rounded-lg transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
                        page === "admin"
                          ? "bg-primary text-primary-content shadow-sm"
                          : "text-base-content/60 hover:text-base-content hover:bg-base-200"
                      }`}
                    >
                      <ShieldCheck className="h-5 w-5" />
                      Admin
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 mr-20 relative" data-notif-wrapper ref={notifWrapperRef}>
                <div data-notif-trigger>
                  <NotificationBellButton count={unreadCount} onClick={() => setShowNotifPanel(!showNotifPanel)} />
                </div>
                {showNotifPanel && (
                  <div className="absolute right-0 top-full mt-2 z-50">
                    <NotificationPanel notifications={notifications} onMarkAllRead={markAllRead} onClear={clearNotifications} />
                  </div>
                )}
                {isAdminAuth && (
                  <button
                    onClick={logoutAdmin}
                    className="flex items-center gap-2 px-3 py-2 text-base font-medium rounded-lg text-error/70 hover:text-error hover:bg-error/10 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-1"
                    aria-label="Logout from admin"
                  >
                    <LogOut className="h-5 w-5" />
                    <span className="hidden lg:inline">Logout</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Bottom Nav — Mobile only */}
      {page !== "landing" && (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-base-100 border-t border-base-300 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]" role="navigation" aria-label="Main navigation" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          <div className="flex items-center justify-around py-1.5 px-2">
              <button
                onClick={() => setPage("landing")}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-base-content/50 hover:text-base-content transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 min-w-[60px]"
                aria-label="Home"
              >
                <div className="p-1.5 rounded-xl">
                  <Home className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium leading-none">Home</span>
              </button>
              {[
                { id: "submit_category" as Page, icon: Plus, label: "New Request" },
                { id: "track" as Page, icon: Search, label: "Track" },
              ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => handleUserNavigation(id)}
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
              </button>
            ))}
            {/* More — dropdown with Resources + Admin */}
            <div className="relative" ref={resourcesDropdownMobileRef}>
              <button
                onClick={() => setShowResourcesDropdown(!showResourcesDropdown)}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 min-w-[60px] ${
                  showResourcesDropdown ? "text-primary" : "text-base-content/50 active:text-base-content"
                }`}
                aria-haspopup="menu"
                aria-expanded={showResourcesDropdown}
              >
                <div className={`p-1.5 rounded-xl transition-all duration-200 ${
                  showResourcesDropdown ? "bg-primary/10" : ""
                }`}>
                  <MoreHorizontal className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-medium leading-none">More</span>
              </button>
              {showResourcesDropdown && (
                <div
                  role="menu"
                  className="absolute bottom-full right-0 mb-2 z-[30] w-48 bg-base-100 border border-base-300 rounded-xl shadow-lg ring-1 ring-black/5 animate-[fadeUp_0.15s_ease-out]"
                >
                  <div className="py-1">
                    <button
                      role="menuitem"
                      onClick={() => { setPage("how"); setShowResourcesDropdown(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-base-content hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                    >
                      <Info className="h-4 w-4 text-base-content/50" />
                      How it Works
                    </button>
                    <button
                      role="menuitem"
                      onClick={() => { setPage("videos"); setShowResourcesDropdown(false); }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-base-content hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                    >
                      <PlayCircle className="h-4 w-4 text-base-content/50" />
                      Video Tutorials
                    </button>
                    {isAdminAuth ? (
                      <button
                        role="menuitem"
                        onClick={() => { setPage("admin"); setShowResourcesDropdown(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-accent/80 hover:text-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Dashboard
                      </button>
                    ) : (
                      <button
                        role="menuitem"
                        onClick={() => { openAdminLogin(); setShowResourcesDropdown(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-base-content/60 hover:bg-base-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1"
                      >
                        <ShieldCheck className="h-4 w-4 text-base-content/50" />
                        Admin
                      </button>
                    )}
                    {isAdminAuth && (
                      <button
                        role="menuitem"
                        onClick={() => { setPage("admin_settings"); setShowResourcesDropdown(false); }}
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm text-accent/80 hover:text-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1"
                      >
                        <Settings className="h-4 w-4" />
                        Settings
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="relative" ref={notifWrapperRef}>
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
          </div>
        </nav>
      )}

      {/* Floating theme toggle — upper right corner, visible on all pages.
          No background/border/shadow so it's just a clean icon with breathing room. */}
      <button
        onClick={() => setDarkMode(!darkMode)}
        className="fixed top-4 right-4 z-[30] flex items-center justify-center w-10 h-10 text-base-content/60 hover:text-base-content transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-base-100"
        aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

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
          onSubmit={() => handleUserNavigation("submit_category")}
          onTrack={() => handleUserNavigation("track")}
          onAdminLogin={openAdminLogin}
          onShowPrivacy={() => setShowPrivacyModal(true)}
          onHowItWorks={() => setPage("how")}
          appName={settings?.app_name || "Unified BFP R2 eRequest Form"}
          logoUrl={settings?.logo_url || undefined}
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
          <HowItWorksPage onBack={() => setPage("landing")} onSubmit={() => handleUserNavigation("submit_category")} />
        )}

        {/* Video Tutorials */}
        {page === "videos" && (
          <VideoTutorialsPage onBack={() => setPage("landing")} isAdmin={isAdminAuth} />
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
            <div className="max-sm:sticky max-sm:top-0 max-sm:z-20 max-sm:-mx-3 max-sm:px-3 max-sm:py-2 max-sm:bg-base-100/95 max-sm:backdrop-blur max-sm:border-b max-sm:border-base-200 flex items-center justify-between gap-3 animate-[fadeUp_0.4s_ease-out_both]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-accent/10 p-2.5 rounded-xl shrink-0">
                  <ShieldCheck className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold tracking-tight text-base-content">Dashboard</h2>
                  <p className="text-xs sm:text-sm text-base-content/50 truncate">Manage and process incoming requests</p>
                </div>
              </div>
            </div>

            <AdminTabs requests={requests} loadRequests={loadRequests} />
          </div>
        )}

        {/* Admin Settings */}
        {page === "admin_settings" && isAdminAuth && (
          <div className="space-y-4">
            <div className="max-sm:sticky max-sm:top-0 max-sm:z-20 max-sm:-mx-3 max-sm:px-3 max-sm:py-2 max-sm:bg-base-100/95 max-sm:backdrop-blur max-sm:border-b max-sm:border-base-200 flex items-center justify-between gap-3 animate-[fadeUp_0.4s_ease-out_both]">
              <div className="flex items-center gap-3 min-w-0">
                <div className="bg-accent/10 p-2.5 rounded-xl shrink-0">
                  <Settings className="h-5 w-5 text-accent" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold tracking-tight text-base-content">Settings</h2>
                  <p className="text-xs sm:text-sm text-base-content/50 truncate">Update the application logo and name displayed across the app.</p>
                </div>
              </div>
            </div>

            <div className="card bg-base-100 border border-base-300 shadow-sm animate-[fadeUp_0.4s_ease-out_both] [animation-delay:80ms]">
              <div className="card-body p-5 sm:p-6">
                <form onSubmit={handleSaveSettings} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-base-content/70 mb-1">App Name</label>
                    <input
                      type="text"
                      value={appSettingsForm.app_name}
                      onChange={(e) => setAppSettingsForm({ ...appSettingsForm, app_name: e.target.value })}
                      className="input input-bordered w-full text-base"
                      placeholder="Unified BFP R2 eRequest Form"
                      required
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-base-content/70 mb-1">Logo</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="text"
                        value={appSettingsForm.logo_url}
                        onChange={(e) => setAppSettingsForm({ ...appSettingsForm, logo_url: e.target.value })}
                        className="input input-bordered flex-1 text-base"
                        placeholder="/logo.png or image URL"
                      />
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleLogoUpload}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="btn btn-outline btn-sm shrink-0"
                      >
                        Upload Photo
                      </button>
                    </div>
                    <p className="text-xs text-base-content/40 mt-1">Upload a photo or enter a URL/path (e.g. /logo.png).</p>

                    {/* Logo preview */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-base-200 border border-base-300 overflow-hidden flex items-center justify-center shrink-0">
                        {appSettingsForm.logo_url.startsWith("data:image") ? (
                          <img src={appSettingsForm.logo_url} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                        ) : appSettingsForm.logo_url ? (
                          <img src={appSettingsForm.logo_url} alt="Logo preview" className="max-w-full max-h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <span className="text-xs text-base-content/30">No preview</span>
                        )}
                      </div>
                      <span className="text-xs text-base-content/40">Preview</span>
                    </div>
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={settingsSaving}
                      className="btn btn-primary btn-sm gap-2"
                    >
                      {settingsSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </button>
                    {settingsSaved && <span className="text-xs text-success font-medium">Saved!</span>}
                  </div>
                </form>
              </div>
            </div>

            {/* Fire Station Management */}
            <div className="card bg-base-100 border border-base-300 shadow-sm animate-[fadeUp_0.4s_ease-out_both] [animation-delay:120ms]">
              <div className="card-body p-5 sm:p-6">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-base-content/50" />
                    <h3 className="text-lg font-semibold text-base-content">Fire Stations</h3>
                  </div>
                  <button onClick={openAddStation} className="btn btn-primary btn-sm gap-2">
                    <Plus className="h-4 w-4" />
                    Add Station
                  </button>
                </div>
                <p className="text-sm text-base-content/50 mb-4">Manage the fire stations shown in request forms.</p>

                <label className="input input-bordered input-sm flex items-center gap-2 mb-3 w-full">
                  <Search className="h-4 w-4 text-base-content/40 shrink-0" />
                  <input
                    type="text"
                    value={stationSearch}
                    onChange={(e) => setStationSearch(e.target.value)}
                    placeholder="Search stations..."
                    className="grow"
                  />
                  {stationSearch && (
                    <button type="button" onClick={() => setStationSearch("")} className="text-base-content/40 hover:text-base-content" aria-label="Clear search">
                      <span className="text-lg leading-none">&times;</span>
                    </button>
                  )}
                </label>

                <div className="overflow-auto max-h-[280px]">
                  <table className="table table-sm w-full">
                    <thead className="sticky top-0 bg-base-100 z-10">
                      <tr className="text-left text-base-content/50 text-xs uppercase tracking-wide">
                        <th className="py-2">Station</th>
                        <th className="py-2">Municipality</th>
                        <th className="py-2">Province</th>
                        <th className="py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stations.filter((s) =>
                        !stationSearch || (s.station_name + s.municipality + s.province).toLowerCase().includes(stationSearch.toLowerCase())
                      ).length === 0) ? (
                        <tr>
                          <td colSpan={4} className="text-center text-base-content/40 py-6 text-sm">No fire stations found.</td>
                        </tr>
                      ) : (
                        stations.filter((s) =>
                          !stationSearch || (s.station_name + s.municipality + s.province).toLowerCase().includes(stationSearch.toLowerCase())
                        ).map((s) => (
                          <tr key={s.id} className="border-t border-base-200">
                            <td className="py-2.5 font-medium text-base-content">{s.station_name}</td>
                            <td className="py-2.5 text-base-content/70">{s.municipality}</td>
                            <td className="py-2.5 text-base-content/70">{s.province}</td>
                            <td className="py-2.5 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditStation(s)}
                                  className="btn btn-ghost btn-xs gap-1 text-base-content/70 hover:bg-primary/10 hover:text-primary"
                                  aria-label={`Edit ${s.station_name}`}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => removeStation(s)}
                                  className="btn btn-ghost btn-xs gap-1 text-error/70 hover:bg-error/10 hover:text-error"
                                  aria-label={`Delete ${s.station_name}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                  Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Personnel Management */}
            <div className="card bg-base-100 border border-base-300 shadow-sm animate-[fadeUp_0.4s_ease-out_both] [animation-delay:160ms]">
              <div className="card-body p-5 sm:p-6">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-5 w-5 text-base-content/50" />
                  <h3 className="text-lg font-semibold text-base-content">Personnel</h3>
                </div>
                <p className="text-sm text-base-content/50 mb-4">Manage personnel and account numbers.</p>
                <PersonnelManager personnel={personnel} onUpdated={loadPersonnel} />
              </div>
            </div>
          </div>
        )}
      </main>
      )}


      {/* Footer — only on landing page */}
      {page === "landing" && (
      <footer className="border-t border-base-300 bg-base-100 mt-auto py-4">
        <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-3 text-xs text-base-content/60 text-center">
          <span>&copy; {new Date().getFullYear()} Bureau of Fire Protection Region II</span>
          <span className="hidden sm:inline">|</span>
          <span>Developed by: <span className="text-base-content/70 font-medium">FO3 Rani Bryan O. Pasinos</span></span>
        </div>
      </footer>
      )}
      {/* Admin Login Modal */}
      {showLoginModal && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="login-title">
          <div ref={loginModalRef} className="modal-box max-w-sm p-5 sm:p-6">
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
                  autoComplete="username"
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
                    autoComplete="current-password"
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
          <div ref={privacyModalRef} className="modal-box max-w-lg max-h-[80vh] overflow-y-auto">
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
      {dpaAccepted && !userAccountNumber && !showLoginModal && !(isAdminAuth && (page === "admin" || page === "admin_settings")) && (
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
              // Validate the account number against the personnel database
              const match = personnel.find((p) => p.account_number === val);
              if (!match) {
                setAccountError("Account number not found. Please check and try again.");
                return;
              }
              localStorage.setItem("fsis_account_number", val);
              setUserAccountNumber(val);
              setShowAccountModal(false);
              setAccountError("");
              if (pendingUserPage.current) {
                const target = pendingUserPage.current;
                pendingUserPage.current = null;
                setPage(target);
              }
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
              // Validate the account number against the personnel database
              const match = personnel.find((p) => p.account_number === val);
              if (!match) {
                setAccountError("Account number not found. Please check and try again.");
                return;
              }
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

      {/* Settings Save Dialog */}
      {saveDialog?.open && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="save-dialog-title">
          <div className="modal-box max-w-sm p-5 sm:p-6">
            <div className="text-center">
              <div className={`inline-flex p-3 rounded-2xl mb-3 ${saveDialog.ok ? "bg-success/10" : "bg-error/10"}`}>
                {saveDialog.ok ? (
                  <CheckCircle2 className="h-6 w-6 text-success" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-error" />
                )}
              </div>
              <h3 id="save-dialog-title" className="text-lg font-bold text-base-content">
                {saveDialog.ok ? "Saved" : "Save Failed"}
              </h3>
              <p className="text-sm text-base-content/60 mt-1">{saveDialog.message}</p>
            </div>
            <div className="modal-action justify-center mt-4">
              <button onClick={() => setSaveDialog(null)} className="btn btn-primary btn-sm px-6">
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Station Form Dialog */}
      {stationFormOpen && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="station-form-title">
          <div className="modal-box max-w-md p-5 sm:p-6">
            <h3 id="station-form-title" className="text-lg font-bold text-base-content mb-4">
              {stationForm.id === null ? "Add Fire Station" : "Edit Fire Station"}
            </h3>
            <form onSubmit={saveStation} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-base-content/70 mb-1">Station Name <span className="text-error">*</span></label>
                <input
                  type="text"
                  value={stationForm.station_name}
                  onChange={(e) => setStationForm({ ...stationForm, station_name: e.target.value })}
                  className="input input-bordered w-full"
                  placeholder="e.g. Tuguegarao City FS"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-base-content/70 mb-1">Municipality <span className="text-error">*</span></label>
                <input
                  type="text"
                  value={stationForm.municipality}
                  onChange={(e) => setStationForm({ ...stationForm, municipality: e.target.value })}
                  className="input input-bordered w-full"
                  placeholder="e.g. Tuguegarao City"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-base-content/70 mb-1">Province</label>
                <input
                  type="text"
                  value={stationForm.province}
                  onChange={(e) => setStationForm({ ...stationForm, province: e.target.value })}
                  className="input input-bordered w-full"
                  placeholder="e.g. Cagayan Valley"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setStationFormOpen(false); setStationForm({ id: null, station_name: "", municipality: "", province: "Cagayan Valley" }); }}
                  className="btn btn-ghost btn-sm flex-1"
                >
                  Cancel
                </button>
                <button type="submit" disabled={stationSaving} className="btn btn-primary btn-sm flex-1 gap-2">
                  {stationSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {stationForm.id === null ? "Add Station" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Station Result Dialog */}
      {stationResult?.open && (
        <div className="modal modal-open" role="dialog" aria-modal="true" aria-labelledby="station-result-title">
          <div className="modal-box max-w-sm p-5 sm:p-6">
            <div className="text-center">
              <div className={`inline-flex p-3 rounded-2xl mb-3 ${stationResult.ok ? "bg-success/10" : "bg-error/10"}`}>
                {stationResult.ok ? (
                  <CheckCircle2 className="h-6 w-6 text-success" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-error" />
                )}
              </div>
              <h3 id="station-result-title" className="text-lg font-bold text-base-content">
                {stationResult.ok ? "Success" : "Error"}
              </h3>
              <p className="text-sm text-base-content/60 mt-1">{stationResult.message}</p>
            </div>
            <div className="modal-action justify-center mt-4">
              <button onClick={() => setStationResult(null)} className="btn btn-primary btn-sm px-6">
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
