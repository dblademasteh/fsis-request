export interface FireStation {
  id: number;
  station_name: string;
  municipality: string;
  province: string;
  created_at: string;
}

export interface TransferRequest {
  id: number;
  station_from_id: number | null;
  station_to_id: number | null;
  station_from_name: string | null;
  station_to_name: string | null;
  purpose_of_request: string;
  account_number: string | null;
  rank: string | null;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  email: string;
  designation: string | null;
  status: "pending" | "approved" | "denied";
  new_rank: string | null;
  new_first_name: string | null;
  new_middle_name: string | null;
  new_last_name: string | null;
  new_suffix: string | null;
  new_email: string | null;
  created_at: string;
  updated_at: string;
}

export type RequestStatus = TransferRequest["status"];

export const PURPOSE_OPTIONS = [
  "Transfer of Unit Assignment",
  "New FSIS Account",
  "Update Rank",
  "Update Name",
  "Update Email",
];

export const RANK_OPTIONS = [
  "FCUSPT",
  "FSSUPT",
  "FSUPT",
  "FCISNP",
  "FSINSP",
  "FINSP",
  "SFO4",
  "SFO3",
  "SFO2",
  "SFO1",
  "FO3",
  "FO2",
  "FO1",
  "NUP",
];

export const DESIGNATION_OPTIONS = [
  "Marshal",
  "Chief",
  "FSES",
  "Assessor",
  "CRO",
  "Inspector",
  "Evaluator",
];

export interface Personnel {
  id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  suffix: string | null;
  rank: string | null;
  designation: string | null;
  account_number: string | null;
  email: string | null;
  station: string | null;
  created_at: string;
}
