import { Bell } from "lucide-react";

interface Props {
  count: number;
  onClick: () => void;
  className?: string;
}

export default function NotificationBellButton({ count, onClick, className = "" }: Props) {
  return (
    <button
      onClick={onClick}
      className={`relative flex items-center gap-2 px-3 py-2 text-base font-medium rounded-lg text-base-content/60 hover:text-base-content hover:bg-base-200 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${className}`}
      aria-label={`Notifications${count > 0 ? ` (${count} unread)` : ""}`}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-error text-error-content text-[10px] font-bold rounded-full px-1 border-2 border-base-100 animate-[slideIn_0.2s_ease-out]">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </button>
  );
}
