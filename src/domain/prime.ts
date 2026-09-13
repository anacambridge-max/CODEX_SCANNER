export type PrimeState =
  | "WATCH"
  | "SETUP"
  | "CONFIRMED"
  | "INVALID"
  | "NO_TRADE"
  | "FAKE_BREAKOUT";

export type PrimeDirection = "BUY" | "SELL" | "NEUTRAL";

export type PipelineStageStatus = "PASS" | "WAIT" | "FAIL" | "NOT_AVAILABLE";

export interface PrimePipeline {
  level: PipelineStageStatus;
  reaction: PipelineStageStatus;
  candle: PipelineStageStatus;
  volume: PipelineStageStatus;
  ema20: PipelineStageStatus;
  confirmation: PipelineStageStatus;
  sl: PipelineStageStatus;
  qty: PipelineStageStatus;
}

export interface OHLCVCandle {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type VolumeClass = "NORMAL" | "STAR_1" | "STAR_2" | "STAR_3";

export interface PrimeLevels {
  yh: number | null;
  yl: number | null;
  mid: number | null;
  r1: number | null;
  r2: number | null;
  r3: number | null;
  s1: number | null;
  s2: number | null;
  s3: number | null;
  verificationNote?: string;
}

export interface PrimeReaction {
  touchedLevel: "YH" | "YL" | "NONE";
  reactionType:
    | "BULLISH_REACTION"
    | "BEARISH_REACTION"
    | "BULLISH_REJECTION"
    | "BEARISH_REJECTION"
    | "NO_CLEAR_REACTION";
  direction: PrimeDirection;
  structuralSl: number | null;
  fakeBreakout: boolean;
  note: string;
}

export interface PrimeCandleStats {
  range: number;
  body: number;
  upperWick: number;
  lowerWick: number;
  bodyPercent: number;
  closeLocation: "NEAR_HIGH" | "MID" | "NEAR_LOW";
  candleBias: "BULLISH" | "BEARISH" | "NEUTRAL";
}

export interface PrimeScanRow {
  rank: number;
  stock: string;
  instrumentKey: string;
  futureInstrumentKey: string | null;
  lotSize: number | null;
  ltp: number | null;
  dayChangePercent: number | null;
  levels: PrimeLevels;
  location: string;
  reaction: PrimeReaction;
  candle: PrimeCandleStats | null;
  latestCandle: OHLCVCandle | null;
  volumeClass: VolumeClass | null;
  volumeRatio: number | null;
  ema20: number | null;
  emaDistancePercent: number | null;
  direction: PrimeDirection;
  state: PrimeState;
  entry: number | null;
  sl: number | null;
  riskPerShare: number | null;
  qty: number | null;
  score: number | null;
  reason: string;
  updatedAt: string;
  discoveryEligible: boolean;
  discoveryReason: string;
  dataFreshnessSeconds: number | null;
}

export interface PrimeScanSummary {
  universeCount: number;
  scanCount: number;
  generatedAt: string;
  marketStatus: "PRE_MARKET" | "OPEN" | "CLOSED";
  lastScannerUpdate: string | null;
  nextRefreshAt: string | null;
  dataFreshness: "FRESH" | "STALE" | "UNKNOWN";
  upstoxConnected: boolean;
  tokenExpiry: string | null;
  rows: PrimeScanRow[];
}
