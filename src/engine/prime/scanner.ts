import type { OHLCVCandle, PrimeScanRow, PrimeState } from "@/domain/prime";
import { analyzeCandle } from "@/engine/prime/candle";
import { calculateEma20 } from "@/engine/prime/ema";
import { buildPrimeLevels } from "@/engine/prime/levels";
import { analyzeReaction } from "@/engine/prime/reaction";
import { analyzeVolume } from "@/engine/prime/volume";

export interface PrimeScannerInput {
  stock: string;
  instrumentKey: string;
  futureInstrumentKey?: string | null;
  lotSize?: number | null;
  ltp?: number | null;
  dayChangePercent?: number | null;
  candles: OHLCVCandle[];
}

const STATE_PRIORITY: Record<PrimeState, number> = {
  CONFIRMED: 1,
  SETUP: 2,
  FAKE_BREAKOUT: 3,
  WATCH: 4,
  NO_TRADE: 5,
  INVALID: 6,
};

export function runPrimeScanner(inputs: PrimeScannerInput[]): PrimeScanRow[] {
  const rows = inputs.map((input) => {
    const latestCandle = input.candles.at(-1) ?? null;
    const candle = analyzeCandle(latestCandle);
    const levels = buildPrimeLevels(input.candles);
    const reaction = analyzeReaction(levels, latestCandle);
    const volume = analyzeVolume(input.candles);
    const ema20 = calculateEma20(input.candles);

    const emaDistancePercent =
      ema20 && input.ltp
        ? ((input.ltp - ema20) / Math.max(ema20, Number.EPSILON)) * 100
        : null;

    const candlePass = candle ? candle.bodyPercent >= 35 : false;
    const volumePass = volume.ratio !== null ? volume.ratio >= 2 : false;

    let state: PrimeState = "WATCH";
    if (!latestCandle || levels.yh === null || levels.yl === null) {
      state = "INVALID";
    } else if (reaction.touchedLevel === "NONE") {
      state = "NO_TRADE";
    } else if (reaction.fakeBreakout) {
      state = "FAKE_BREAKOUT";
    } else if (candlePass || volumePass || reaction.direction !== "NEUTRAL") {
      state = "SETUP";
    }

    const location = buildLocation(input.ltp, levels.yh, levels.yl);

    const reason = buildReason({
      state,
      reaction: reaction.note,
      candle,
      volumeRatio: volume.ratio,
      emaDistancePercent,
      touchedLevel: reaction.touchedLevel,
    });

    const updatedAt = latestCandle?.timestamp ?? new Date().toISOString();

    return {
      rank: 0,
      stock: input.stock,
      instrumentKey: input.instrumentKey,
      futureInstrumentKey: input.futureInstrumentKey ?? null,
      lotSize: input.lotSize ?? null,
      ltp: input.ltp ?? latestCandle?.close ?? null,
      dayChangePercent: input.dayChangePercent ?? null,
      levels,
      location,
      reaction,
      candle,
      latestCandle,
      volumeClass: volume.volumeClass,
      volumeRatio: volume.ratio,
      ema20,
      emaDistancePercent,
      direction: reaction.direction,
      state,
      entry: null,
      sl: reaction.structuralSl,
      riskPerShare: null,
      qty: null,
      score: null,
      reason,
      updatedAt,
      discoveryEligible: volume.isOpeningCandle && reaction.touchedLevel !== "NONE",
      discoveryReason: volume.isOpeningCandle
        ? "DISCOVERY — NOT ENTRY. Opening-candle reaction candidate."
        : "Not an opening-candle discovery candidate.",
      dataFreshnessSeconds: latestCandle
        ? Math.max(0, Math.round((Date.now() - new Date(latestCandle.timestamp).getTime()) / 1000))
        : null,
    } satisfies PrimeScanRow;
  });

  const ranked = [...rows].sort((a, b) => {
    const stateDiff = STATE_PRIORITY[a.state] - STATE_PRIORITY[b.state];
    if (stateDiff !== 0) return stateDiff;

    const volumeA = a.volumeRatio ?? -1;
    const volumeB = b.volumeRatio ?? -1;
    if (volumeA !== volumeB) return volumeB - volumeA;

    return a.stock.localeCompare(b.stock);
  });

  return ranked.map((row, index) => ({ ...row, rank: index + 1 }));
}

function buildLocation(ltp: number | null | undefined, yh: number | null, yl: number | null): string {
  if (ltp == null || yh == null || yl == null) return "—";
  if (ltp > yh) return "ABOVE_YH";
  if (ltp < yl) return "BELOW_YL";

  const midpoint = yl + (yh - yl) / 2;
  if (ltp >= midpoint) return "BETWEEN_MID_AND_YH";
  return "BETWEEN_YL_AND_MID";
}

function buildReason(params: {
  state: PrimeState;
  reaction: string;
  candle: ReturnType<typeof analyzeCandle>;
  volumeRatio: number | null;
  emaDistancePercent: number | null;
  touchedLevel: "YH" | "YL" | "NONE";
}): string {
  const parts: string[] = [];

  if (params.touchedLevel === "NONE") {
    parts.push("No YH/YL interaction on current candle.");
  } else {
    parts.push(params.reaction);
  }

  if (params.candle) {
    parts.push(`Candle body ${params.candle.bodyPercent.toFixed(1)}%.`);
  }

  if (params.volumeRatio !== null) {
    parts.push(`Volume ${params.volumeRatio.toFixed(2)}× avg.`);
  }

  if (params.emaDistancePercent !== null) {
    parts.push(`Price vs EMA20 ${params.emaDistancePercent.toFixed(2)}%.`);
  }

  if (params.state === "SETUP" || params.state === "FAKE_BREAKOUT") {
    parts.push("Confirmation rule pending verification.");
  }

  if (params.state === "CONFIRMED") {
    parts.push("Confirmed state reserved for verified confirmation rules only.");
  }

  return parts.join(" ");
}
