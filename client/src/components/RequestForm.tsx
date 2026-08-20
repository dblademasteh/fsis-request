import { useState, useRef, type FormEvent } from "react";
import type { FireStation } from "../types";
import { PURPOSE_OPTIONS, DESIGNATION_OPTIONS, RANK_OPTIONS } from "../types";
import { createRequest } from "../api";
import { FileCheck, Hash, User, Mail, BadgeCheck, Briefcase, ArrowRight, AlertCircle, Send } from "lucide-react";
import SearchableSelect from "./SearchableSelect";

interface Props {
  stations: FireStation[];
  onCreated: () => void;
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

export default function RequestForm({ stations, onCreated }: Props) {
  const [stationFrom, setStationFrom] = useState<number>(0);
  const [stationTo, setStationTo] = useState<number>(0);
  const [purposeOfRequest, setPurposeOfRequest] = useState("");
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
      { name: "middleName", value: middleName },
      { name: "lastName", value: lastName },
      { name: "suffix", value: suffix },
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
      await createRequest({
        station_from_id: stationFrom,
        station_to_id: stationTo,
        purpose_of_request: purposeOfRequest,
        account_number: accountNumber,
        rank,
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        suffix,
        email,
        designation,
      });
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

  const InputField = ({ name, label, icon, type = "text", placeholder, value, onChange }: {
    name: string; label: string; icon: React.ReactNode; type?: string; placeholder: string; value: string; onChange: (v: string) => void;
  }) => (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={`field-${name}`} className="text-sm font-medium text-base-content flex items-center gap-1.5">
        {icon}
        {label}
        <span className="text-error">*</span>
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
        <p id={`error-${name}`} className="text-xs text-error flex items-center gap-1" role="alert">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {fieldErrors[name]}
        </p>
      )}
    </div>
  );

  const showTransferFields = purposeOfRequest === "Transfer of Unit Assignment";
  const showUpdateRank = purposeOfRequest === "Update Rank";
  const showUpdateName = purposeOfRequest === "Update Name";
  const showUpdateEmail = purposeOfRequest === "Update Email";

  return (
    <div className="card bg-base-100 shadow-lg border border-base-300">
      <div className="card-body gap-6">
        {/* Header */}
        <div className="flex flex-col items-center text-center gap-2">
          <div className="bg-primary/10 p-3 rounded-2xl">
            <FileCheck className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h2 className="card-title text-primary justify-center">New Transfer Request</h2>
            <p className="text-base text-base-content/50">Submit a personnel transfer between fire stations</p>
          </div>
        </div>

        <div className="divider my-0" />

        {error && (
          <div role="alert" aria-live="polite" className="alert alert-error gap-2 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
          {/* Purpose of Request */}
          <SearchableSelect
            label="Purpose of Request"
            value={purposeOfRequest}
            options={PURPOSE_OPTIONS}
            onChange={setPurposeOfRequest}
            placeholder="Select purpose..."
            required
            icon={<FileCheck className="h-4 w-4 text-primary/60" />}
          />

          {purposeOfRequest && (
            <>
              <div className="divider my-0">
                <span className="text-xs text-base-content/40 font-medium">PERSONNEL INFORMATION</span>
              </div>

              <InputField
                name="accountNumber"
                label="Account Number"
                icon={<Hash className="h-4 w-4 text-primary/60" />}
                value={accountNumber}
                onChange={setAccountNumber}
                placeholder="e.g. 2024-0001"
              />

              {/* Rank */}
              <SearchableSelect
                label="Rank"
                value={rank}
                options={RANK_OPTIONS}
                onChange={setRank}
                placeholder="Select rank..."
                required
                icon={<BadgeCheck className="h-4 w-4 text-primary/60" />}
              />

              {/* New Rank - only for Update Rank */}
              {showUpdateRank && (
                <div className="pl-4 border-l-2 border-success/30">
                  <SearchableSelect
                    label="New Rank"
                    value={newRank}
                    options={RANK_OPTIONS}
                    onChange={setNewRank}
                    placeholder="Select new rank..."
                    required
                    icon={<ArrowRight className="h-4 w-4 text-success" />}
                  />
                </div>
              )}

              <InputField name="firstName" label="First Name" icon={<User className="h-4 w-4 text-primary/60" />} value={firstName} onChange={setFirstName} placeholder="Juan" />

              <InputField name="middleName" label="Middle Name" icon={<User className="h-4 w-4 text-primary/60" />} value={middleName} onChange={setMiddleName} placeholder="Santos" />

              <InputField name="lastName" label="Last Name" icon={<User className="h-4 w-4 text-primary/60" />} value={lastName} onChange={setLastName} placeholder="Dela Cruz" />

              <InputField name="suffix" label="Suffix" icon={<User className="h-4 w-4 text-primary/60" />} value={suffix} onChange={setSuffix} placeholder="e.g. Jr., Sr., III" />

              {showUpdateName && (
                <div className="pl-4 border-l-2 border-success/30 space-y-5">
                  <InputField name="newFirstName" label="New First Name" icon={<ArrowRight className="h-4 w-4 text-success" />} value={newFirstName} onChange={setNewFirstName} placeholder="New first name" />
                  <InputField name="newMiddleName" label="New Middle Name" icon={<ArrowRight className="h-4 w-4 text-success" />} value={newMiddleName} onChange={setNewMiddleName} placeholder="New middle name" />
                  <InputField name="newLastName" label="New Last Name" icon={<ArrowRight className="h-4 w-4 text-success" />} value={newLastName} onChange={setNewLastName} placeholder="New last name" />
                  <InputField name="newSuffix" label="New Suffix" icon={<ArrowRight className="h-4 w-4 text-success" />} value={newSuffix} onChange={setNewSuffix} placeholder="New suffix" />
                </div>
              )}

              <InputField name="email" label="Email" icon={<Mail className="h-4 w-4 text-primary/60" />} type="email" value={email} onChange={setEmail} placeholder="juan.delacruz@bfp.gov.ph" />

              {showUpdateEmail && (
                <div className="pl-4 border-l-2 border-success/30">
                  <InputField name="newEmail" label="New Email" icon={<ArrowRight className="h-4 w-4 text-success" />} type="email" value={newEmail} onChange={setNewEmail} placeholder="new.email@bfp.gov.ph" />
                </div>
              )}

              {/* Designation */}
              <SearchableSelect
                label="Designation"
                value={designation}
                options={DESIGNATION_OPTIONS}
                onChange={setDesignation}
                placeholder="Select designation..."
                required
                icon={<Briefcase className="h-4 w-4 text-primary/60" />}
              />

              {/* Station Assignment - only for Transfer */}
              {showTransferFields && (
                <>
                  <div className="divider my-0">
                    <span className="text-xs text-base-content/40 font-medium">STATION ASSIGNMENT</span>
                  </div>

                  <SearchableSelect
                    label="From Station"
                    value={stations.find((s) => s.id === stationFrom)?.station_name || ""}
                    options={stations.map((s) => `${s.station_name} — ${s.municipality}, ${s.province}`)}
                    onChange={(val) => {
                      const match = stations.find((s) => `${s.station_name} — ${s.municipality}, ${s.province}` === val);
                      setStationFrom(match?.id || 0);
                    }}
                    placeholder="Search origin station..."
                    required
                    icon={<Briefcase className="h-4 w-4 text-primary/60" />}
                  />

                  <SearchableSelect
                    label="To Station"
                    value={stations.find((s) => s.id === stationTo)?.station_name || ""}
                    options={stations.map((s) => `${s.station_name} — ${s.municipality}, ${s.province}`)}
                    onChange={(val) => {
                      const match = stations.find((s) => `${s.station_name} — ${s.municipality}, ${s.province}` === val);
                      setStationTo(match?.id || 0);
                    }}
                    placeholder="Search destination station..."
                    required
                    icon={<Briefcase className="h-4 w-4 text-primary/60" />}
                  />
                </>
              )}

              <div className="divider my-0" />

              <button type="submit" disabled={loading} className="btn btn-primary btn-lg btn-block gap-2">
                {loading ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5" />
                    Submit Transfer Request
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
