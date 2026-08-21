import { useState, useRef, type FormEvent } from "react";
import type { FireStation, Personnel } from "../types";
import { PURPOSE_OPTIONS, DESIGNATION_OPTIONS, RANK_OPTIONS } from "../types";
import { createRequest } from "../api";
import { FileCheck, Hash, User, Mail, BadgeCheck, Briefcase, ArrowRight, AlertCircle, Send, ArrowUpRight, RefreshCw, PenLine, MailPlus } from "lucide-react";
import SearchableSelect from "./SearchableSelect";
import { ConfirmDialog } from "./ConfirmDialog";

interface Props {
  stations: FireStation[];
  personnel: Personnel[];
  onCreated: (accountNumber?: string) => void;
  preselectedPurpose?: string;
}

type FieldErrors = Record<string, string>;

function validateField(name: string, value: string): string {
  const requiredLabels: Record<string, string> = {
    accountNumber: "Account number",
    firstName: "First name",
    middleName: "Middle name",
    lastName: "Last name",
    email: "Email",
    newFirstName: "New first name",
    newMiddleName: "New middle name",
    newLastName: "New last name",
    newEmail: "New email",
  };
  if (!value || !value.trim()) {
    if (!requiredLabels[name]) return "";
    return `${requiredLabels[name]} is required`;
  }
  if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "Please enter a valid email address";
  }
  return "";
}

interface FieldProps {
  name: string;
  label: string;
  icon: React.ReactNode;
  type?: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
  clearError: (name: string) => void;
  onBlurField: (name: string, value: string) => void;
  required?: boolean;
}

function Field({ name, label, icon, type = "text", placeholder, value, onChange, error, clearError, onBlurField, required = true }: FieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={`field-${name}`} className="text-sm font-medium text-base-content/70 flex items-center gap-1">
        {icon}{label} {required && <span className="text-error">*</span>}
      </label>
      <input
        id={`field-${name}`}
        name={name}
        type={type}
        value={value}
        onChange={(e) => { onChange(e.target.value); clearError(name); }}
        onBlur={(e) => onBlurField(name, e.target.value)}
        className={`input input-bordered w-full ${error ? "input-error" : ""}`}
        placeholder={placeholder}
        required={required}
        aria-invalid={!!error}
        aria-describedby={error ? `error-${name}` : undefined}
      />
      {error && (
        <p id={`error-${name}`} className="text-[10px] text-error flex items-center gap-1" role="alert">
          <AlertCircle className="h-2.5 w-2.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export default function RequestForm({ stations, personnel, onCreated, preselectedPurpose }: Props) {
  const [stationFrom, setStationFrom] = useState<number>(0);
  const [stationTo, setStationTo] = useState<number>(0);
  const [purposeOfRequest, setPurposeOfRequest] = useState(() => preselectedPurpose || "");
  const [accountNumber, setAccountNumber] = useState("");
  const [rank, setRank] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [email, setEmail] = useState("");
  const [designation, setDesignation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const [newRank, setNewRank] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newMiddleName, setNewMiddleName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newSuffix, setNewSuffix] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);
  const lastPopulatedAccount = useRef<string>("");

  function handleBlur(name: string, value: string) {
    const msg = validateField(name, value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (msg) {
        next[name] = msg;
      } else {
        delete next[name];
      }
      return next;
    });
  }

  function clearFieldError(name: string) {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }

  const [showConfirm, setShowConfirm] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    const isUpdate = purposeOfRequest.startsWith("Update");
    if (isUpdate && (newRank || newFirstName || newLastName || newEmail || newSuffix)) {
      setShowConfirm(true);
      return;
    }

    await submitRequest();
  }

  async function submitRequest() {
    // Inline validate all text fields
    const errors: FieldErrors = {};
    const requiredFields: { name: string; value: string | number | null }[] = [];
    
    if (purposeOfRequest === "Transfer of Unit Assignment") {
      requiredFields.push({ name: "firstName", value: firstName });
      requiredFields.push({ name: "lastName", value: lastName });
      requiredFields.push({ name: "stationFrom", value: stationFrom });
      requiredFields.push({ name: "stationTo", value: stationTo });
    } else if (purposeOfRequest === "New FSIS Account") {
      requiredFields.push({ name: "firstName", value: firstName });
      requiredFields.push({ name: "lastName", value: lastName });
      requiredFields.push({ name: "email", value: email });
    } else if (purposeOfRequest === "Update Rank") {
      if (!accountNumber) {
        errors["accountNumber"] = "Account number is required to update rank";
      }
      requiredFields.push({ name: "newRank", value: newRank });
    } else if (purposeOfRequest === "Update Name") {
      if (!accountNumber) {
        errors["accountNumber"] = "Account number is required to update name";
      }
      requiredFields.push({ name: "newFirstName", value: newFirstName });
      requiredFields.push({ name: "newLastName", value: newLastName });
    } else if (purposeOfRequest === "Update Email") {
      if (!accountNumber) {
        errors["accountNumber"] = "Account number is required to update email";
      }
      requiredFields.push({ name: "newEmail", value: newEmail });
    }
    for (const { name, value } of requiredFields) {
      const msg = validateField(name, String(value ?? ""));
      if (msg) errors[name] = msg;
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      const firstKey = Object.keys(errors)[0];
      const el = formRef.current?.querySelector(`[name="${firstKey}"]`) as HTMLElement | null;
      el?.focus();
      return;
    }

    if (stationFrom === stationTo && purposeOfRequest === "Transfer of Unit Assignment") {
      setError("Source and destination stations must be different.");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, string | number> = {
        purpose_of_request: purposeOfRequest,
        account_number: accountNumber,
        rank,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        suffix,
        email,
        designation,
      };
      if (showTransferFields && stationFrom && stationTo) {
        payload.station_from_id = stationFrom;
        payload.station_to_id = stationTo;
      }
      if (showUpdateRank && newRank) payload.new_rank = newRank;
      if (showUpdateName) {
        if (newFirstName) payload.new_first_name = newFirstName;
        if (newMiddleName) payload.new_middle_name = newMiddleName;
        if (newLastName) payload.new_last_name = newLastName;
        if (newSuffix) payload.new_suffix = newSuffix;
      }
      if (showUpdateEmail && newEmail) payload.new_email = newEmail;
      await createRequest(payload as any);
      setStationFrom(0);
      setStationTo(0);
      setPurposeOfRequest("");
      setAccountNumber("");
      setRank("");
      setFirstName("");
      setMiddleName("");
      setLastName("");
      setSuffix("");
      setEmail("");
      setDesignation("");
      setNewRank("");
      setNewFirstName("");
      setNewMiddleName("");
      setNewLastName("");
      setNewSuffix("");
      setNewEmail("");
      setFieldErrors({});
      lastPopulatedAccount.current = "";
      onCreated(accountNumber || undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const stationNames = Array.from(
  new Set(
    stations.map((s) => {
      return `${s.station_name}, ${s.province}`;
    })
  )
);
  const showTransferFields = purposeOfRequest === "Transfer of Unit Assignment";
  const showUpdateRank = purposeOfRequest === "Update Rank";
  const showUpdateName = purposeOfRequest === "Update Name";
  const showUpdateEmail = purposeOfRequest === "Update Email";
  const showIdentityFields = showTransferFields || purposeOfRequest === "New FSIS Account";

  const purposeConfig: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
    "Transfer of Unit Assignment": { color: "text-primary", bg: "bg-primary/10", border: "border-primary/20", icon: <ArrowUpRight className="h-3 w-3" />, label: "Transfer" },
    "New FSIS Account": { color: "text-secondary", bg: "bg-secondary/10", border: "border-secondary/20", icon: <RefreshCw className="h-3 w-3" />, label: "New Account" },
    "Update Rank": { color: "text-accent", bg: "bg-accent/10", border: "border-accent/20", icon: <BadgeCheck className="h-3 w-3" />, label: "Update Rank" },
    "Update Name": { color: "text-info", bg: "bg-info/10", border: "border-info/20", icon: <PenLine className="h-3 w-3" />, label: "Update Name" },
    "Update Email": { color: "text-warning", bg: "bg-warning/10", border: "border-warning/20", icon: <MailPlus className="h-3 w-3" />, label: "Update Email" },
  };

  return (
    <div className="card bg-base-100 shadow-lg border border-base-300 animate-[fadeUp_0.4s_ease-out_both]">
      <div className="card-body p-4 sm:p-6 gap-3 sm:gap-4">
        <div className="flex items-center gap-3 pb-3 sm:pb-4 border-b border-base-200">
          <div className="bg-primary/10 p-2.5 rounded-xl shrink-0">
            <FileCheck className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-base-content leading-tight">New Transfer Request</h2>
            <p className="text-xs sm:text-sm text-base-content/50">Fill in the details below to submit your request</p>
          </div>
        </div>

        {error && (
          <div role="alert" aria-live="polite" className="alert alert-error py-1.5 px-3 text-xs gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-2.5">
          <SearchableSelect
            label="Purpose"
            value={purposeOfRequest}
            options={PURPOSE_OPTIONS}
            onChange={setPurposeOfRequest}
            placeholder="Select purpose..."
            required
            icon={<FileCheck className="h-3.5 w-3.5 text-primary/60" />}
          />

          {purposeOfRequest && purposeConfig[purposeOfRequest] && (
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${purposeConfig[purposeOfRequest].bg} ${purposeConfig[purposeOfRequest].border} transition-all duration-200`}>
              <span className={purposeConfig[purposeOfRequest].color}>{purposeConfig[purposeOfRequest].icon}</span>
              <span className={`text-xs font-semibold ${purposeConfig[purposeOfRequest].color}`}>{purposeConfig[purposeOfRequest].label}</span>
              <span className="text-[10px] text-base-content/40">selected</span>
            </div>
          )}

          {purposeOfRequest && (
            <>
              <SearchableSelect
                label="Account Number"
                value={accountNumber}
                options={personnel.map((p) => p.account_number).filter((v): v is string => !!v)}
            onChange={(val) => {
                setAccountNumber(val);
                clearFieldError("accountNumber");
                if (!val) {
                  lastPopulatedAccount.current = "";
                  setFirstName("");
                  setMiddleName("");
                  setLastName("");
                  setSuffix("");
                  setRank("");
                  setEmail("");
                  setDesignation("");
                  setNewRank("");
                  setNewFirstName("");
                  setNewMiddleName("");
                  setNewLastName("");
                  setNewSuffix("");
                  setNewEmail("");
                  setStationFrom(0);
                  return;
                }
                if (val === lastPopulatedAccount.current) return;
                const person = personnel.find((p) => p.account_number === val);
                if (person) {
                  lastPopulatedAccount.current = val;
                  setFirstName(person.first_name || "");
                  setMiddleName(person.middle_name || "");
                  setLastName(person.last_name || "");
                  setSuffix(person.suffix || "");
                  setRank(person.rank || "");
                  setEmail(person.email || "");
                  setDesignation(person.designation || "");
                  setNewRank(person.rank || "");
                  setNewFirstName(person.first_name || "");
                  setNewMiddleName(person.middle_name || "");
                  setNewLastName(person.last_name || "");
                  setNewSuffix(person.suffix || "");
                  setNewEmail(person.email || "");
                  const matchedStation = stations.find(
                    (s) => s.station_name.toLowerCase() === (person.station || "").toLowerCase()
                  );
                  if (matchedStation) setStationFrom(matchedStation.id);
                }
              }}
              placeholder="A12345"
                required
                icon={<Hash className="h-3.5 w-3.5 text-primary/60" />}
              />

              {showIdentityFields && !showTransferFields && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Field name="middleName" label="Middle Name" icon={<User className="h-3.5 w-3.5 text-primary/60" />} value={middleName} onChange={setMiddleName} placeholder="Middle" error={fieldErrors.middleName} clearError={clearFieldError} onBlurField={handleBlur} />
                    <Field name="suffix" label="Suffix" icon={<User className="h-3.5 w-3.5 text-primary/60" />} value={suffix} onChange={setSuffix} placeholder="Jr., Sr., III" error={fieldErrors.suffix} clearError={clearFieldError} onBlurField={handleBlur} required={false} />
                    <Field name="email" label="Email" icon={<Mail className="h-3.5 w-3.5 text-primary/60" />} type="email" value={email} onChange={setEmail} placeholder="name@bfp.gov.ph" error={fieldErrors.email} clearError={clearFieldError} onBlurField={handleBlur} />
                  </div>
                </>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <SearchableSelect label="Rank" value={rank} options={RANK_OPTIONS} onChange={setRank} placeholder="Rank..." icon={<BadgeCheck className="h-3.5 w-3.5 text-primary/60" />} />
                <Field name="firstName" label="First Name" icon={<User className="h-3.5 w-3.5 text-primary/60" />} value={firstName} onChange={setFirstName} placeholder="First" error={fieldErrors.firstName} clearError={clearFieldError} onBlurField={handleBlur} />
                <Field name="lastName" label="Last Name" icon={<User className="h-3.5 w-3.5 text-primary/60" />} value={lastName} onChange={setLastName} placeholder="Last" error={fieldErrors.lastName} clearError={clearFieldError} onBlurField={handleBlur} />
              </div>

              {showUpdateRank && (
                <div className="pl-3 border-l-2 border-accent/40 bg-accent/5 rounded-r-lg py-2 pr-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <BadgeCheck className="h-3 w-3 text-accent" />
                    <span className="text-[10px] font-semibold text-accent uppercase tracking-wider">New Rank</span>
                  </div>
                  <SearchableSelect label="" value={newRank} options={RANK_OPTIONS} onChange={setNewRank} placeholder="Select new rank..." required icon={<ArrowRight className="h-3.5 w-3.5 text-accent" />} />
                </div>
              )}

              {showUpdateName && (
                <div className="pl-3 border-l-2 border-info/40 bg-info/5 rounded-r-lg py-2 pr-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <PenLine className="h-3 w-3 text-info" />
                    <span className="text-[10px] font-semibold text-info uppercase tracking-wider">New Name</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <Field name="newFirstName" label="New First Name" icon={<ArrowRight className="h-3.5 w-3.5 text-info" />} value={newFirstName} onChange={setNewFirstName} placeholder="New first" error={fieldErrors.newFirstName} clearError={clearFieldError} onBlurField={handleBlur} />
                    <Field name="newLastName" label="New Last Name" icon={<ArrowRight className="h-3.5 w-3.5 text-info" />} value={newLastName} onChange={setNewLastName} placeholder="New last" error={fieldErrors.newLastName} clearError={clearFieldError} onBlurField={handleBlur} />
                    <Field name="newMiddleName" label="New Middle Name" icon={<ArrowRight className="h-3.5 w-3.5 text-info" />} value={newMiddleName} onChange={setNewMiddleName} placeholder="New middle" error={fieldErrors.newMiddleName} clearError={clearFieldError} onBlurField={handleBlur} />
                    <Field name="newSuffix" label="New Suffix" icon={<ArrowRight className="h-3.5 w-3.5 text-info" />} value={newSuffix} onChange={setNewSuffix} placeholder="New suffix" error={fieldErrors.newSuffix} clearError={clearFieldError} onBlurField={handleBlur} required={false} />
                  </div>
                </div>
              )}

              {showUpdateEmail && (
                <div className="pl-3 border-l-2 border-warning/40 bg-warning/5 rounded-r-lg py-2 pr-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <MailPlus className="h-3 w-3 text-warning" />
                    <span className="text-[10px] font-semibold text-warning uppercase tracking-wider">New Email</span>
                  </div>
                  <Field name="newEmail" label="New Email" icon={<ArrowRight className="h-3.5 w-3.5 text-warning" />} type="email" value={newEmail} onChange={setNewEmail} placeholder="new.email@bfp.gov.ph" error={fieldErrors.newEmail} clearError={clearFieldError} onBlurField={handleBlur} />
                </div>
              )}

              {showIdentityFields && !showTransferFields && (
                <SearchableSelect
                  label="Designation"
                  value={designation}
                  options={DESIGNATION_OPTIONS}
                  onChange={setDesignation}
                  placeholder="Select designation..."
                  required
                  icon={<Briefcase className="h-3.5 w-3.5 text-primary/60" />}
                />
              )}

              {showTransferFields && (
                <div className="pl-3 border-l-2 border-primary/40 bg-primary/5 rounded-r-lg py-2 pr-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ArrowUpRight className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Station Transfer</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <SearchableSelect
                      label="From Station"
                      value={(() => {
                        const s = stations.find((s) => s.id === stationFrom);
                        if (!s) return "";
                        return `${s.station_name}, ${s.province}`;
                      })()}
                      options={stationNames}
                      onChange={(val) => {
                        const stationName = val.split(",")[0].trim();
                        const match = stations.find((s) => s.station_name === stationName);
                        setStationFrom(match?.id || 0);
                      }}
                      placeholder="Origin station..."
                      required
                      icon={<Briefcase className="h-3.5 w-3.5 text-primary/60" />}
                    />
                    <SearchableSelect
                      label="To Station"
                      value={(() => {
                        const s = stations.find((s) => s.id === stationTo);
                        if (!s) return "";
                        return `${s.station_name}, ${s.province}`;
                      })()}
                      options={stationNames}
                      onChange={(val) => {
                        const stationName = val.split(",")[0].trim();
                        const match = stations.find((s) => s.station_name === stationName);
                        setStationTo(match?.id || 0);
                      }}
                      placeholder="Destination station..."
                      required
                      icon={<Briefcase className="h-3.5 w-3.5 text-primary/60" />}
                    />
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn btn-primary btn-block gap-2 mt-2 shadow-lg shadow-primary/20 hover:-translate-y-0.5 transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Request
                  </>
                )}
              </button>

              {showConfirm && (
                <ConfirmDialog
                  title="Confirm Request"
                  message={`Submit this ${purposeOfRequest} request?`}
                  onConfirm={() => submitRequest()}
                  onCancel={() => setShowConfirm(false)}
                />
              )}
            </>
          )}
        </form>
      </div>
    </div>
  );
}
