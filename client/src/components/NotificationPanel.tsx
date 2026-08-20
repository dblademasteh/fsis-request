import { useEffect, useRef } from "react";
import type { AppNotification } from "../notifications";
import { Bell, CheckCircle2, XCircle, Plus, Clock } from "lucide-react";

interface Props {
  notifications: AppNotification[];
  onMarkAllRead: () => void;
  onClear: () => void;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const TYPE_ICON: Record<AppNotification["type"], { icon: React.ReactNode; color: string; bg: string }> = {
  new_request: { icon: <Plus className="h-3.5 w-3.5" />, color: "text-primary", bg: "bg-primary/10" },
  approved: { icon: <CheckCircle2 className="h-3.5 w-3.5" />, color: "text-success", bg: "bg-success/10" },
  denied: { icon: <XCircle className="h-3.5 w-3.5" />, color: "text-error", bg: "bg-error/10" },
};

export default function NotificationPanel({ notifications, onMarkAllRead, onClear }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        (panelRef.current as any)?.closest("[data-notif-wrapper]")?.querySelector("[data-notif-trigger]")?.click();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const unread = notifications.filter((n) => !n.read).length;

  return (
    <div ref={panelRef} className="bg-base-100 rounded-2xl border border-base-300 shadow-xl w-80 max-h-96 overflow-hidden">
      <div className="px-4 py-3 border-b border-base-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-base-content/60" />
          <span className="text-sm font-semibold text-base-content">Notifications</span>
          {unread > 0 && (
            <span className="badge badge-xs badge-primary border-none">{unread}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unread > 0 && (
            <button onClick={onMarkAllRead} className="text-[10px] text-primary hover:text-primary/80 font-medium transition-colors">
              Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <>
              <span className="text-base-content/20 mx-1">|</span>
              <button onClick={onClear} className="text-[10px] text-base-content/40 hover:text-error font-medium transition-colors">
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      <div className="overflow-y-auto max-h-72">
        {notifications.length === 0 ? (
          <div className="py-8 text-center">
            <Clock className="h-8 w-8 text-base-content/15 mx-auto mb-2" />
            <p className="text-xs text-base-content/40">No notifications yet</p>
          </div>
        ) : (
          <div className="divide-y divide-base-200">
            {notifications.map((n) => {
              const style = TYPE_ICON[n.type];
              return (
                <div key={n.id} className={`px-4 py-3 hover:bg-base-200/50 transition-colors ${!n.read ? "bg-primary/5" : ""}`}>
                  <div className="flex items-start gap-2.5">
                    <div className={`p-1.5 rounded-lg ${style.bg} shrink-0 mt-0.5`}>
                      <span className={style.color}>{style.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-base-content">{n.title}</span>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />}
                      </div>
                      <p className="text-[11px] text-base-content/60 mt-0.5 leading-relaxed">{n.message}</p>
                      <span className="text-[10px] text-base-content/35 mt-1 block">{timeAgo(n.timestamp)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
