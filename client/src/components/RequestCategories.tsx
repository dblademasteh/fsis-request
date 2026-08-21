import { useMemo } from "react";
import { PURPOSE_OPTIONS } from "../types";
import { ArrowRight, ChevronRight, FileText, ShieldAlert, RefreshCw, PenLine, MailPlus } from "lucide-react";

interface Props {
  onSelect: (purpose: string) => void;
}

const PURPOSE_CONFIG: Record<string, { title: string; description: string; Icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string }> = {
  "Transfer of Unit Assignment": {
    title: "Transfer Station",
    description: "Request transfer to another fire station",
    Icon: ArrowRight,
    color: "text-primary",
    bgColor: "bg-primary",
  },
  "New FSIS Account": {
    title: "New account",
    description: "Create a new eRequest account",
    Icon: ShieldAlert,
    color: "text-secondary",
    bgColor: "bg-secondary",
  },
  "Update Rank": {
    title: "Update Rank",
    description: "Change your current rank",
    Icon: RefreshCw,
    color: "text-accent",
    bgColor: "bg-accent",
  },
  "Update Name": {
    title: "Update Name",
    description: "Update your first or last name",
    Icon: PenLine,
    color: "text-info",
    bgColor: "bg-info",
  },
  "Update Email": {
    title: "Update Email",
    description: "Change your registered email address",
    Icon: MailPlus,
    color: "text-warning",
    bgColor: "bg-warning",
  },
};

export function RequestCategories({ onSelect }: Props) {
  const categories = useMemo(() => {
    return PURPOSE_OPTIONS.map((purpose) => {
      const config = PURPOSE_CONFIG[purpose] || { title: purpose, description: purpose, Icon: FileText, color: "text-base-content", bgColor: "bg-base-content" };
      return { ...config, purpose };
    });
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-2 pt-2 animate-[fadeUp_0.4s_ease-out_both]">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-base-content">
          Choose Request <span className="text-primary">Category</span>
        </h1>
        <p className="text-sm text-base-content/50 max-w-md mx-auto">
          Select the type of request you need to submit
        </p>
      </div>

      <div className="space-y-3 animate-[fadeUp_0.4s_ease-out_both] [animation-delay:80ms]">
        {categories.map((cat) => (
          <button
            key={cat.purpose}
            onClick={() => onSelect(cat.purpose)}
            className="w-full flex items-center gap-4 p-4 rounded-xl border border-base-300 bg-base-100 hover:border-primary/30 hover:shadow-md transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className={`p-2.5 rounded-lg ${cat.bgColor}/10`}>
              <cat.Icon className={`h-5 w-5 ${cat.color}`} />
            </div>
            <div className="text-left flex-1">
              <div className="font-semibold text-base-content text-sm sm:text-base">{cat.title}</div>
              <div className="text-xs text-base-content/50 mt-0.5">{cat.description}</div>
            </div>
            <ChevronRight className="h-4 w-4 text-base-content/30" />
          </button>
        ))}
      </div>

      <div className="text-center">
        <button onClick={() => onSelect("")} className="link text-sm text-base-content/60">Start over</button>
      </div>
    </div>
  );
}