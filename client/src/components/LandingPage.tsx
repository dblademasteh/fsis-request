import {
  ArrowRight,
  FileCheck,
  FileText,
  Lock,
  LogOut,
  Plus,
  Search,
  Shield,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { TransferRequest } from "../types";
import { StatusBadge, StatusStepper } from "./TrackPage";
import { AppLogo } from "./AppLogo";

interface LandingPageProps {
  latestRequest: TransferRequest | null;
  displayName: string;
  onLogoutUser: () => void;
  notifWidget?: React.ReactNode;
  dpaAccepted: boolean;
  onSubmit: () => void;
  onTrack: () => void;
  onAdminLogin: () => void;
  onShowPrivacy: () => void;
  onHowItWorks: () => void;
  appName: string;
  logoUrl?: string;
}

export default function LandingPage({
  latestRequest,
  displayName,
  onLogoutUser,
  notifWidget,
  dpaAccepted,
  onSubmit,
  onTrack,
  onAdminLogin,
  onShowPrivacy,
  onHowItWorks,
  appName,
  logoUrl,
}: LandingPageProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);
  const dateStr = new Intl.DateTimeFormat(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(now);
  const timeStr = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", hour12: true }).format(now);
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return (
    <main id="main-content" className="flex-1 w-full scroll-mt-14">
      <section className="relative overflow-hidden" aria-label="Introduction">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-base-100 to-secondary/10" aria-hidden="true" />
        <div className="absolute -top-24 -right-16 h-72 w-72 rounded-full bg-secondary/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -bottom-28 -left-20 h-80 w-80 rounded-full bg-primary/15 blur-3xl" aria-hidden="true" />
        <div
          className="absolute inset-0 text-primary/25 [background-image:radial-gradient(circle,currentColor_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]"
          aria-hidden="true"
        />

        <div className="absolute top-4 left-4 z-10 text-left max-w-[45%] sm:max-w-[55%]">
          <p className="text-[11px] sm:text-xs font-medium uppercase tracking-wider text-base-content/40">{greeting}</p>
          {displayName && (
            <p className="text-sm sm:text-base font-semibold text-base-content truncate leading-tight max-w-[140px] sm:max-w-none">{displayName}</p>
          )}
        </div>

        <div className="absolute top-4 right-16 sm:right-20 z-10 flex items-center gap-1">
          {notifWidget}
          {displayName && (
            <button
              onClick={onLogoutUser}
              className="btn btn-ghost btn-circle btn-sm text-base-content/50 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          )}
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 pt-20 sm:pt-24 pb-8 sm:pb-10 flex flex-col items-center text-center gap-6 sm:gap-8">
          <AppLogo className="animate-[fadeUp_0.5s_ease-out_both] [animation-delay:80ms]" logoUrl={logoUrl} />

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-base-content leading-tight animate-[fadeUp_0.5s_ease-out_both] [animation-delay:160ms]">
            {appName}
          </h1>

          <p className="max-w-xl text-sm sm:text-base text-base-content/60 leading-relaxed animate-[fadeUp_0.5s_ease-out_both] [animation-delay:240ms]">
            File transfer, update, and account requests online &mdash; then follow every step of the process in real time.
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1 animate-[fadeUp_0.5s_ease-out_both] [animation-delay:320ms]">
            <button
              onClick={onSubmit}
              className="btn btn-primary btn-lg gap-2 shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Plus className="h-5 w-5" />
              Submit a Request
            </button>
            <button
              onClick={onTrack}
              className="btn btn-outline btn-lg gap-2 hover:-translate-y-0.5 transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <Search className="h-5 w-5" />
              Track a Request
            </button>
          </div>

          <p className="text-xs text-base-content/50 tabular-nums animate-[fadeUp_0.5s_ease-out_both] [animation-delay:360ms]" aria-label="Current date and time">
            {dateStr} &middot; {timeStr}
          </p>

          <button
            onClick={onHowItWorks}
            className="inline-flex items-center gap-1 text-sm text-base-content/50 hover:text-primary transition-colors animate-[fadeUp_0.5s_ease-out_both] [animation-delay:380ms] rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            How it works
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <div className="inline-flex flex-row items-center justify-center gap-2 sm:gap-4 text-[10px] sm:text-xs text-base-content/50 bg-base-100/70 border border-base-300 rounded-full px-3 py-2 sm:px-5 sm:py-2.5 animate-[fadeUp_0.5s_ease-out_both] [animation-delay:400ms]" aria-label="Privacy and security">
            <button
              onClick={onAdminLogin}
              className="inline-flex items-center gap-1 hover:text-base-content/70 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-nowrap"
            >
              <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Admin Panel
            </button>
            <span className="text-base-content/20" aria-hidden="true">&bull;</span>
            <button
              onClick={onShowPrivacy}
              className="inline-flex items-center gap-1 hover:text-base-content/70 transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary whitespace-nowrap"
              title={dpaAccepted ? "Data Privacy Agreement accepted" : "Data Privacy Notice"}
            >
              {dpaAccepted ? (
                <ShieldCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-success" aria-hidden="true" />
              ) : (
                <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
              )}
              Privacy Notice
            </button>
            <span className="text-base-content/20" aria-hidden="true">&bull;</span>
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              Protected under RA 10173
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 space-y-8 sm:space-y-10 pb-4 sm:pb-6">
        <section className="py-3 sm:py-5 animate-[fadeUp_0.5s_ease-out_both] [animation-delay:400ms]" aria-label="My request status">
          {latestRequest ? (
            <div className="flex justify-center">
              <div className="relative w-full max-w-sm sm:max-w-xl bg-base-100 border border-base-300 shadow-sm hover:shadow-md transition-shadow duration-200 rounded-2xl overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-primary/0 via-secondary/60 to-primary/0" aria-hidden="true" />
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="inline-flex p-2.5 rounded-xl bg-primary/10 text-primary shrink-0">
                        <FileCheck className="h-5 w-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-base-content/40">My latest request</div>
                        <div className="font-semibold text-sm sm:text-base text-base-content truncate leading-tight">
                          {[latestRequest.rank, latestRequest.first_name, latestRequest.last_name].filter(Boolean).join(" ")}
                        </div>
                      </div>
                    </div>
                    <StatusBadge status={latestRequest.status} />
                  </div>

                  <div className="border-y border-base-200/80 py-3">
                    <StatusStepper status={latestRequest.status} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-base-content/50">
                    <span className="truncate">
                      {latestRequest.purpose_of_request}
                      <span className="text-base-content/25" aria-hidden="true"> · </span>
                      #{latestRequest.id}
                    </span>
                    <span>Submitted {new Date(latestRequest.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>

                  <button
                    onClick={onTrack}
                    className="btn btn-outline btn-sm w-full gap-2 hover:-translate-y-0.5 transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  >
                    Track full details
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center">
              <div className="w-full max-w-sm sm:max-w-xl bg-base-100/70 border border-dashed border-base-300 rounded-2xl p-6 sm:p-8 text-center space-y-2">
                <div className="inline-flex p-3 rounded-xl bg-base-200 text-base-content/40 mb-1">
                  <FileText className="h-6 w-6" aria-hidden="true" />
                </div>
                <h3 className="text-base font-semibold text-base-content">No requests yet</h3>
                <p className="text-sm text-base-content/50 max-w-xs mx-auto leading-relaxed">
                  Submit your request using the button above and follow its progress right here.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
