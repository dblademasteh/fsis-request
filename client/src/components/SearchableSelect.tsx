import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { ChevronDown, X } from "lucide-react";

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
  const listboxId = useMemo(() => `listbox-${Math.random().toString(36).slice(2, 9)}`, []);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return options;
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

  const openDropdown = useCallback(() => {
    if (!open) {
      setOpen(true);
      setQuery(value);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open, value]);

  const handleClear = useCallback(() => {
    onChange("");
    setOpen(false);
    setQuery("");
    setActiveIndex(-1);
  }, [onChange]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openDropdown();
        return;
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
        e.preventDefault();
        if (activeIndex >= 0 && filtered[activeIndex]) {
          handleSelect(filtered[activeIndex]);
        } else if (query && filtered.length > 0) {
          handleSelect(filtered[0]);
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
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-base-content/70 flex items-center gap-1">
        {icon}
        {label}
        {required && <span className="text-error">*</span>}
      </label>
      <div ref={containerRef} className="relative">
        <input
          ref={inputRef}
          type="text"
          value={open ? query : value}
          onChange={(e) => { if (open) { setQuery(e.target.value); setActiveIndex(-1); } }}
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
          placeholder={open ? placeholder : (value || placeholder)}
          className={`input input-bordered w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 ${
            value && !open ? "pr-14" : "pr-8"
          } ${!value && !open ? "text-base-content/40" : ""}`}
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={open ? listboxId : undefined}
          aria-activedescendant={open && activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
          aria-autocomplete="list"
          autoComplete="off"
        />
        {value && !open && (
          <button
            type="button"
            tabIndex={-1}
            aria-label={`Clear ${label}`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            className="absolute right-7 top-0 h-full px-1.5 flex items-center text-base-content/35 hover:text-error transition-colors rounded-r-lg"
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
        <button
          type="button"
          tabIndex={-1}
          onClick={() => {
            if (open) {
              setOpen(false);
              setQuery("");
            } else {
              openDropdown();
            }
          }}
          className="absolute right-0 top-0 h-full px-2.5 flex items-center hover:bg-base-200 rounded-r-lg transition-colors"
        >
          <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 text-base-content/40 ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full bg-base-100 border border-base-300 rounded-lg shadow-lg max-h-60 overflow-hidden">
            <ul ref={listRef} id={listboxId} role="listbox" aria-label={label || "Select an option"} className="overflow-y-auto max-h-48 p-1">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-xs text-base-content/40 text-center">
                  No matches found
                </li>
              ) : (
                filtered.map((option, index) => (
                  <li key={`${option}-${index}`} id={`${listboxId}-option-${index}`} role="option" aria-selected={value === option}>
                    <button
                      type="button"
                      onClick={() => handleSelect(option)}
                      onMouseEnter={() => setActiveIndex(index)}
                      className={`w-full text-left px-3 py-1.5 text-sm rounded-md cursor-pointer transition-colors duration-100 ${
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
