import type { FireStation, TransferRequest } from "./types";

const BASE = "/api";

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
  station_from_id: number;
  station_to_id: number;
  purpose_of_request: string;
  account_number: string;
  rank: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  suffix: string;
  email: string;
  designation: string;
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
    headers: { "Content-Type": "application/json" },
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
