import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  label?: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50];

export default function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
  label = "items",
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  const pages: (number | "ellipsis")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push("ellipsis");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
  }

  return (
    <div className="px-4 sm:px-6 py-3 border-t border-base-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-base-100">
      <p className="text-xs text-base-content/50 order-2 sm:order-1">
        Showing{" "}
        <span className="font-medium text-base-content/70">
          {start}–{end}
        </span>{" "}
        of {total} {label}
      </p>
      <div className="flex items-center gap-2 order-1 sm:order-2">
        {onPageSizeChange && (
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="select select-bordered select-xs bg-base-200 focus:bg-base-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="Rows per page"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} / page
              </option>
            ))}
          </select>
        )}
        <nav className="join" aria-label="Pagination">
          <button
            className="join-item btn btn-xs sm:btn-sm"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            aria-label="Previous page"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          {pages.map((p, i) =>
            p === "ellipsis" ? (
              <button key={`ellipsis-${i}`} className="join-item btn btn-xs sm:btn-sm btn-disabled" tabIndex={-1} aria-hidden="true">
                …
              </button>
            ) : (
              <button
                key={p}
                className={`join-item btn btn-xs sm:btn-sm ${
                  p === page ? "btn-primary" : "bg-base-200 hover:bg-base-300 border-base-300"
                }`}
                onClick={() => onPageChange(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </button>
            )
          )}
          <button
            className="join-item btn btn-xs sm:btn-sm"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            aria-label="Next page"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </nav>
      </div>
    </div>
  );
}
