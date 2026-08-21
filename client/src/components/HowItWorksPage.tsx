import { ArrowLeft, ArrowRight, FileText, Fingerprint, Plus, Search, ShieldCheck } from "lucide-react";

interface HowItWorksPageProps {
  onBack: () => void;
  onSubmit: () => void;
}

const STEPS = [
  {
    n: "1",
    icon: ShieldCheck,
    color: "text-primary",
    chip: "bg-primary/10",
    title: "Accept the privacy notice",
    desc: "Review and accept the Data Privacy Agreement to get started.",
  },
  {
    n: "2",
    icon: Fingerprint,
    color: "text-secondary",
    chip: "bg-secondary/10",
    title: "Enter your account number",
    desc: "Your e Request account number verifies your identity and retrieves your records.",
  },
  {
    n: "3",
    icon: FileText,
    color: "text-accent",
    chip: "bg-accent/10",
    title: "Fill out your request",
    desc: "Pick a request type and complete the form in minutes.",
  },
  {
    n: "4",
    icon: Search,
    color: "text-info",
    chip: "bg-info/10",
    title: "Track your request",
    desc: "Follow it from review to approval in real time.",
  },
];

export default function HowItWorksPage({ onBack, onSubmit }: HowItWorksPageProps) {
  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 sm:px-6 pb-8">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm text-base-content/50 hover:text-base-content transition-colors rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to home
      </button>

      <div className="text-center space-y-1 mt-2 mb-4 animate-[fadeUp_0.4s_ease-out_both]">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-base-content">
          How it <span className="text-primary">works</span>
        </h1>
        <p className="text-sm text-base-content/50">Four simple steps from filing to approval</p>
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {STEPS.map(({ n, icon: Icon, color, chip, title, desc }, idx, arr) => (
          <li
            key={n}
            className="relative bg-base-100 rounded-2xl border border-base-300 shadow-sm px-4 py-3 animate-[fadeUp_0.5s_ease-out_both]"
            style={{ animationDelay: `${idx * 70}ms` }}
          >
            {idx < arr.length - 1 && (
              <span
                className="hidden lg:flex absolute -right-[22px] top-1/2 -translate-y-1/2 items-center justify-center w-6 h-6 rounded-full bg-base-200 text-base-content/40 z-10"
                aria-hidden="true"
              >
                <ArrowRight className="h-3.5 w-3.5" />
              </span>
            )}
            <div className="flex items-center gap-2.5 mb-2">
              <span className={`inline-flex p-2 rounded-lg ${chip} ${color}`}>
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-base-200 text-xs font-bold text-base-content/60" aria-hidden="true">
                {n}
              </span>
            </div>
            <h2 className="text-sm font-semibold text-base-content leading-snug">{title}</h2>
            <p className="mt-1 text-xs text-base-content/50 leading-relaxed">{desc}</p>
          </li>
        ))}
      </ol>

      <div className="mt-4 flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 animate-[fadeUp_0.5s_ease-out_both] [animation-delay:280ms]">
        <p className="text-xs text-base-content/50">Ready to get started?</p>
        <button
          onClick={onSubmit}
          className="btn btn-primary btn-sm gap-1.5 shadow-md shadow-primary/20 hover:-translate-y-0.5 transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
          Submit a Request
        </button>
      </div>
    </div>
  );
}
