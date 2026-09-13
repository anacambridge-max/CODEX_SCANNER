import type { OHLCVCandle, PrimeLevels } from "@/domain/prime";

/**
 * Builds the Prime reference levels from the immediately preceding NSE trading
 * session contained in the 1-minute candle set.
 *
 * YH/YL are the previous-session high/low. MID is the session midpoint.
 * R1/R2/R3 and S1/S2/S3 use the standard classic-pivot formulas with the
 * previous-session OHLC values. This keeps the levels deterministic and
 * prevents the UI from showing the old "RULE NOT VERIFIED" placeholders.
 */
export function buildPrimeLevels(candles: OHLCVCandle[]): PrimeLevels {
  const previousSessionCandles = extractPreviousSessionCandles(candles);

  if (!previousSessionCandles.length) {
    return {
      yh: null,
      yl: null,
      mid: null,
      r1: null,
      r2: null,
      r3: null,
      s1: null,
      s2: null,
      s3: null,
      verificationNote: "Previous NSE trading-session candles unavailable.",
    };
  }

  const yh = Math.max(...previousSessionCandles.map((c) => c.high));
  const yl = Math.min(...previousSessionCandles.map((c) => c.low));

  // The first candle in the sorted set is the session open and the final
  // candle is the session close. scanner.ts already supplies chronologically
  // sorted candles from the Upstox client.
  const first = previousSessionCandles[0];
  const last = previousSessionCandles[previousSessionCandles.length - 1];
  const open = first.open;
  const close = last.close;

  // Classic floor-trader pivot point.
  const pivot = (yh + yl + close) / 3;
  const mid = (yh + yl) / 2;

  const r1 = 2 * pivot - yl;
  const s1 = 2 * pivot - yh;
  const r2 = pivot + (yh - yl);
  const s2 = pivot - (yh - yl);
  const r3 = yh + 2 * (pivot - yl);
  const s3 = yl - 2 * (yh - pivot);

  // Keep the variable intentionally used so this calculation documents that
  // the session OHLC is complete even though classic pivots use H/L/C.
  void open;

  return {
    yh,
    yl,
    mid,
    r1,
    r2,
    r3,
    s1,
    s2,
    s3,
    verificationNote: "Previous-session YH/YL, MID and classic R/S pivot levels calculated.",
  };
}

function extractPreviousSessionCandles(candles: OHLCVCandle[]): OHLCVCandle[] {
  if (!candles.length) return [];

  const byIstDate = new Map<string, OHLCVCandle[]>();
  for (const candle of candles) {
    const istDate = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(candle.timestamp));

    const group = byIstDate.get(istDate) ?? [];
    group.push(candle);
    byIstDate.set(istDate, group);
  }

  const sessionDates = [...byIstDate.keys()].sort();
  if (sessionDates.length < 2) return [];

  const previousSession = sessionDates.at(-2);
  const session = previousSession ? byIstDate.get(previousSession) ?? [] : [];

  return [...session].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
}
