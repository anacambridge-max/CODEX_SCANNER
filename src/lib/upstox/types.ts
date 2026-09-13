export interface UpstoxTokenPayload {
  accessToken: string;
  expiresAt: string | null;
  obtainedAt: string;
}

export interface UpstoxSessionStatus {
  connected: boolean;
  expired: boolean;
  expiresAt: string | null;
  source: "SUPABASE" | "LOCAL_FILE" | "NONE";
  message: string;
}

export interface UpstoxUniverseItem {
  symbol: string;
  instrumentKey: string;
  futureInstrumentKey: string | null;
  lotSize: number | null;
}

export interface UpstoxHistoricalCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
