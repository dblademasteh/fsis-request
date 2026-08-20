import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChevronDown } from "lucide-react";

interface Props {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  icon?: React.ReactNode;
}

export default function SearchableSelect({
  label,
  value,
  options,
  onChange,
  placeholder = "Type to search...",
  required,
  icon,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((o) => o.toLowerCase().includes(q));
  }, [query, options]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
        setActiveIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) setActiveIndex(-1);
  }, [open, query]);

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement | undefined;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const handleSelect = useCallback((option: string) => {
    onChange(option);
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
  }, [onChange]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setOpen(true);
        setTimeout(() => inputRef.current?.focus(), 0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev < filtered.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : filtered.length - 1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) {
          handleSelect(filtered[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setQuery("");
        setActiveIndex(-1);
        break;
      case "Tab":
        setOpen(false);
        setQuery("");
        setActiveIndex(-1);
        break;
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-base-content flex items-center gap-1.5">
        {icon}
        {label}
        {required && <span className="text-error">*</span>}
      </label>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => {
            setOpen(!open);
            setTimeout(() => inputRef.current?.focus(), 0);
          }}
          onKeyDown={handleKeyDown}
          className={`input input-bordered w-full text-left flex items-center justify-between cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
            !value ? "text-base-content/40" : ""
          }`}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
            <div className="p-2 border-b border-base-300">
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1); }}
                onKeyDown={handleKeyDown}
                placeholder="Search..."
                className="input input-sm input-bordered w-full"
              />
            </div>
            <ul ref={listRef} role="listbox" className="overflow-y-auto max-h-48 p-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-sm text-base-content/40 text-center">
                  No matches found
                </li>
              ) : (
                filtered.map((option, index) => (
                  <li key={option} role="option" aria-selected={value === option}>
                    <button
                      type="button"
                      onClick={() => handleSelect(option)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`w-full text-left px-3 py-2 text-sm rounded-md cursor-pointer transition-colors duration-100 ${
                        value === option
                          ? "bg-primary text-primary-content font-medium"
                          : index === activeIndex
                            ? "bg-base-200 text-base-content"
                            : "text-base-content hover:bg-base-200"
                      }`}
                    >
                      {option}
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
