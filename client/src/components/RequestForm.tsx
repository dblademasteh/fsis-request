import { useState, useRef, useEffect, type FormEvent } from "react";
import type { FireStation, Personnel } from "../types";
import { PURPOSE_OPTIONS, DESIGNATION_OPTIONS, RANK_OPTIONS } from "../types";
import { createRequest } from "../api";
import { FileCheck, Hash, User, Mail, BadgeCheck, Briefcase, ArrowRight, AlertCircle, Send, ArrowUpRight, RefreshCw, PenLine, MailPlus } from "lucide-react";
import SearchableSelect from "./SearchableSelect";

interface Props {
  stations: FireStation[];
  personnel: Personnel[];
  onCreated: () => void;
  initialAccountNumber?: string;
}

type FieldErrors = Record<string, string>;

function validateField(name: string, value: string): string {
  if (!value || !value.trim()) {
    const labels: Record<string, string> = {
      accountNumber: "Account number",
      firstName: "First name",
      middleName: "Middle name",
      lastName: "Last name",
      suffix: "Suffix",
      email: "Email",
    };
    return `${labels[name] || name} is required`;
  }
  if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return "Please enter a valid email address";
  }
  return "";
}

export default function RequestForm({ stations, personnel, onCreated, initialAccountNumber = "" }: Props) {
  const [stationFrom, setStationFrom] = useState<number>(0);
  const [stationTo, setStationTo] = useState<number>(0);
  const [purposeOfRequest, setPurposeOfRequest] = useState("");
  const [accountNumber, setAccountNumber] = useState(initialAccountNumber);
  const [rank, setRank] = useState("");
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [suffix, setSuffix] = useState("");
  const [email, setEmail] = useState("");
  const [designation, setDesignation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialAccountNumber && personnel.length > 0) {
      const person = personnel.find((p) => p.account_number === initialAccountNumber);
      if (person) {
        setFirstName(person.first_name || "");
        setMiddleName(person.middle_name || "");
        setLastName(person.last_name || "");
        setSuffix(person.suffix || "");
        setRank(person.rank || "");
        setEmail(person.email || "");
        setDesignation(person.designation || "");
        const matchedStation = stations.find(
          (s) => s.station_name.toLowerCase() === (person.station || "").toLowerCase()
        );
        if (matchedStation) setStationFrom(matchedStation.id);
      }
    }
  }, [initialAccountNumber, personnel, stations]);

  // "New" fields for update purposes
  const [newRank, setNewRank] = useState("");
  const [newFirstName, setNewFirstName] = useState("");
  const [newMiddleName, setNewMiddleName] = useState("");
  const [newLastName, setNewLastName] = useState("");
  const [newSuffix, setNewSuffix] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const formRef = useRef<HTMLFormElement>(null);

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    // Inline validate all text fields
    const errors: FieldErrors = {};
    const requiredFields = [
      { name: "accountNumber", value: accountNumber },
      { name: "firstName", value: firstName },
      { name: "lastName", value: lastName },
      { name: "email", value: email },
    ];
    for (const { name, value } of requiredFields) {
      const msg = validateField(name, value);
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
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const Field = ({ name, label, icon, type = "text", placeholder, value, onChange }: {
    name: string; label: string; icon: React.ReactNode; type?: string; placeholder: string; value: string; onChange: (v: string) => void;
  }) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={`field-${name}`} className="text-sm font-medium text-base-content/70 flex items-center gap-1">
        {icon}{label} <span className="text-error">*</span>
      </label>
      <input
        id={`field-${name}`}
        name={name}
        type={type}
        value={value}
        onChange={(e) => { onChange(e.target.value); clearFieldError(name); }}
        onBlur={(e) => handleBlur(name, e.target.value)}
        className={`input input-bordered w-full ${fieldErrors[name] ? "input-error" : ""}`}
        placeholder={placeholder}
        required
        aria-invalid={!!fieldErrors[name]}
        aria-describedby={fieldErrors[name] ? `error-${name}` : undefined}
      />
      {fieldErrors[name] && (
        <p id={`error-${name}`} className="text-[10px] text-error flex items-center gap-1" role="alert">
          <AlertCircle className="h-2.5 w-2.5 shrink-0" />
          {fieldErrors[name]}
        </p>
      )}
    </div>
  );

  const showTransferFields = purposeOfRequest === "Transfer of Unit Assignment";
  const showUpdateRank = purposeOfRequest === "Update Rank";
  const showUpdateName = purposeOfRequest === "Update Name";
  const showUpdateEmail = purposeOfRequest === "Update Email";

  const purposeConfig: Record<string, { color: string; bg: string; border: string; icon: React.ReactNode; label: string }> = {
    "Transfer of Unit Assignment": { color: "text-primary", bg: "bg-primary/10", border: "border-primary/20", icon: <ArrowUpRight className="h-3 w-3" />, label: "Transfer" },
    "New FSIS Account": { color: "text-secondary", bg: "bg-secondary/10", border: "border-secondary/20", icon: <RefreshCw className="h-3 w-3" />, label: "New Account" },
    "Update Rank": { color: "text-accent", bg: "bg-accent/10", border: "border-accent/20", icon: <BadgeCheck className="h-3 w-3" />, label: "Update Rank" },
    "Update Name": { color: "text-info", bg: "bg-info/10", border: "border-info/20", icon: <PenLine className="h-3 w-3" />, label: "Update Name" },
    "Update Email": { color: "text-warning", bg: "bg-warning/10", border: "border-warning/20", icon: <MailPlus className="h-3 w-3" />, label: "Update Email" },
  };

  return (
    <div className="card bg-base-100 shadow-lg border border-base-300">
      <div className="card-body p-4 gap-3">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-lg">
            <FileCheck className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-base font-bold text-primary leading-tight">New Transfer Request</h2>
            <p className="text-[10px] text-base-content/40">Fill in the details below</p>
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
                  const person = personnel.find((p) => p.account_number === val);
                  if (person) {
                    setFirstName(person.first_name || "");
                    setMiddleName(person.middle_name || "");
                    setLastName(person.last_name || "");
                    setSuffix(person.suffix || "");
                    setRank(person.rank || "");
                    setEmail(person.email || "");
                    setDesignation(person.designation || "");
                    const matchedStation = stations.find(
                      (s) => s.station_name.toLowerCase() === (person.station || "").toLowerCase()
                    );
                    if (matchedStation) setStationFrom(matchedStation.id);
                  }
                }}
                placeholder="Search by account number..."
                required
                icon={<Hash className="h-3.5 w-3.5 text-primary/60" />}
              />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <SearchableSelect label="Rank" value={rank} options={RANK_OPTIONS} onChange={setRank} placeholder="Rank..." required icon={<BadgeCheck className="h-3.5 w-3.5 text-primary/60" />} />
                <Field name="firstName" label="First Name" icon={<User className="h-3.5 w-3.5 text-primary/60" />} value={firstName} onChange={setFirstName} placeholder="First" />
                <Field name="lastName" label="Last Name" icon={<User className="h-3.5 w-3.5 text-primary/60" />} value={lastName} onChange={setLastName} placeholder="Last" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Field name="middleName" label="Middle Name" icon={<User className="h-3.5 w-3.5 text-primary/60" />} value={middleName} onChange={setMiddleName} placeholder="Middle" />
                <Field name="suffix" label="Suffix" icon={<User className="h-3.5 w-3.5 text-primary/60" />} value={suffix} onChange={setSuffix} placeholder="Jr., Sr., III" />
                <Field name="email" label="Email" icon={<Mail className="h-3.5 w-3.5 text-primary/60" />} type="email" value={email} onChange={setEmail} placeholder="name@bfp.gov.ph" />
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
                    <Field name="newFirstName" label="New First Name" icon={<ArrowRight className="h-3.5 w-3.5 text-info" />} value={newFirstName} onChange={setNewFirstName} placeholder="New first" />
                    <Field name="newLastName" label="New Last Name" icon={<ArrowRight className="h-3.5 w-3.5 text-info" />} value={newLastName} onChange={setNewLastName} placeholder="New last" />
                    <Field name="newMiddleName" label="New Middle Name" icon={<ArrowRight className="h-3.5 w-3.5 text-info" />} value={newMiddleName} onChange={setNewMiddleName} placeholder="New middle" />
                    <Field name="newSuffix" label="New Suffix" icon={<ArrowRight className="h-3.5 w-3.5 text-info" />} value={newSuffix} onChange={setNewSuffix} placeholder="New suffix" />
                  </div>
                </div>
              )}

              {showUpdateEmail && (
                <div className="pl-3 border-l-2 border-warning/40 bg-warning/5 rounded-r-lg py-2 pr-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <MailPlus className="h-3 w-3 text-warning" />
                    <span className="text-[10px] font-semibold text-warning uppercase tracking-wider">New Email</span>
                  </div>
                  <Field name="newEmail" label="New Email" icon={<ArrowRight className="h-3.5 w-3.5 text-warning" />} type="email" value={newEmail} onChange={setNewEmail} placeholder="new.email@bfp.gov.ph" />
                </div>
              )}

              <SearchableSelect
                label="Designation"
                value={designation}
                options={DESIGNATION_OPTIONS}
                onChange={setDesignation}
                placeholder="Select designation..."
                required
                icon={<Briefcase className="h-3.5 w-3.5 text-primary/60" />}
              />

              {showTransferFields && (
                <div className="pl-3 border-l-2 border-primary/40 bg-primary/5 rounded-r-lg py-2 pr-2">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <ArrowUpRight className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">Station Transfer</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <SearchableSelect
                      label="From Station"
                      value={stations.find((s) => s.id === stationFrom)?.station_name || ""}
                      options={stations.map((s) => `${s.station_name} — ${s.municipality}, ${s.province}`)}
                      onChange={(val) => {
                        const match = stations.find((s) => `${s.station_name} — ${s.municipality}, ${s.province}` === val);
                        setStationFrom(match?.id || 0);
                      }}
                      placeholder="Origin station..."
                      required
                      icon={<Briefcase className="h-3.5 w-3.5 text-primary/60" />}
                    />
                    <SearchableSelect
                      label="To Station"
                      value={stations.find((s) => s.id === stationTo)?.station_name || ""}
                      options={stations.map((s) => `${s.station_name} — ${s.municipality}, ${s.province}`)}
                      onChange={(val) => {
                        const match = stations.find((s) => `${s.station_name} — ${s.municipality}, ${s.province}` === val);
                        setStationTo(match?.id || 0);
                      }}
                      placeholder="Destination station..."
                      required
                      icon={<Briefcase className="h-3.5 w-3.5 text-primary/60" />}
                    />
                  </div>
                </div>
              )}

              <button type="submit" disabled={loading} className="btn btn-primary btn-sm btn-block gap-2 mt-1">
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-xs"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Submit Request
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
