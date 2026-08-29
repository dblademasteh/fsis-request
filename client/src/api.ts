import type { FireStation, TransferRequest, Personnel, Tutorial, AppSettings } from "./types";

const BASE = "/api";

function getAuthToken(): string | null {
  return localStorage.getItem("fsis_auth_token");
}

function authHeaders(): Record<string, string> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchStations(): Promise<FireStation[]> {
  const res = await fetch(`${BASE}/stations`);
  if (!res.ok) throw new Error("Failed to fetch stations");
  return res.json();
}

export async function fetchRequests(): Promise<TransferRequest[]> {
  const res = await fetch(`${BASE}/requests`);
  if (!res.ok) throw new Error("Failed to fetch requests");
  return res.json();
}

export async function createRequest(data: {
  station_from_id?: number;
  station_to_id?: number;
  purpose_of_request: string;
  account_number: string;
  rank: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  email: string;
  designation: string;
  new_rank?: string;
  new_first_name?: string;
  new_middle_name?: string;
  new_last_name?: string;
  new_suffix?: string;
  new_email?: string;
}): Promise<TransferRequest> {
  const res = await fetch(`${BASE}/requests`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create request");
  }
  return res.json();
}

export async function updateRequestStatus(
  id: number,
  status: string
): Promise<TransferRequest> {
  const res = await fetch(`${BASE}/requests/${id}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update status");
  return res.json();
}

export async function trackRequests(accountNumber: string): Promise<TransferRequest[]> {
  const res = await fetch(`${BASE}/requests/track/${encodeURIComponent(accountNumber)}`);
  if (!res.ok) throw new Error("Failed to track requests");
  return res.json();
}

export async function deleteRequest(id: number): Promise<void> {
  const res = await fetch(`${BASE}/requests/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to delete request");
}

export async function fetchPersonnel(): Promise<Personnel[]> {
  const res = await fetch(`${BASE}/personnel`);
  if (!res.ok) throw new Error("Failed to fetch personnel");
  return res.json();
}

export async function importPersonnel(rows: Omit<Personnel, "id" | "created_at">[]): Promise<{ imported: number }> {
  const res = await fetch(`${BASE}/personnel/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ rows }),
  });
  if (!res.ok) throw new Error("Failed to import personnel");
  return res.json();
}

export async function createPersonnel(data: Omit<Personnel, "id" | "created_at">): Promise<Personnel> {
  const res = await fetch(`${BASE}/personnel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create personnel");
  }
  return res.json();
}

export async function updatePersonnel(id: number, data: Omit<Personnel, "id" | "created_at">): Promise<Personnel> {
  const res = await fetch(`${BASE}/personnel/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update personnel");
  }
  return res.json();
}

export async function deletePersonnel(id: number): Promise<void> {
  const res = await fetch(`${BASE}/personnel/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to delete personnel");
}

export async function loginUser(
  username: string,
  password: string
): Promise<{ token: string; user: { id: number; username: string; role: string } }> {
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Login failed");
  }
  return res.json();
}

export async function fetchTutorials(): Promise<Tutorial[]> {
  const res = await fetch(`${BASE}/tutorials`);
  if (!res.ok) throw new Error("Failed to fetch tutorials");
  return res.json();
}

export async function createTutorial(data: {
  title: string;
  description?: string;
  youtube_url: string;
  duration?: string;
}): Promise<Tutorial> {
  const res = await fetch(`${BASE}/tutorials`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to create tutorial");
  }
  return res.json();
}

export async function updateTutorial(
  id: number,
  data: {
    title: string;
    description?: string;
    youtube_url: string;
    duration?: string;
  }
): Promise<Tutorial> {
  const res = await fetch(`${BASE}/tutorials/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update tutorial");
  }
  return res.json();
}

export async function deleteTutorial(id: number): Promise<void> {
  const res = await fetch(`${BASE}/tutorials/${id}`, { method: "DELETE", headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to delete tutorial");
}

export async function fetchSettings(): Promise<AppSettings> {
  const res = await fetch(`${BASE}/settings`);
  if (!res.ok) throw new Error("Failed to fetch settings");
  return res.json();
}

export async function uploadLogo(data: { logo_data: string; filename?: string }): Promise<{ logo_url: string; success: boolean }> {
  const res = await fetch(`${BASE}/settings/logo-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    let errMsg = "Failed to upload logo";
    try {
      const err = await res.json();
      errMsg = err.error || errMsg;
    } catch {
      // Response is not JSON (e.g., nginx 413 HTML page)
      if (res.status === 413) errMsg = "File too large. Maximum size is 10MB.";
    }
    throw new Error(errMsg);
  }
  return res.json();
}

export async function updateSettings(data: {
  app_name: string;
  logo_url?: string;
  logo_data?: string;
}): Promise<AppSettings> {
  const res = await fetch(`${BASE}/settings`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || "Failed to update settings");
  }
  return res.json();
}
