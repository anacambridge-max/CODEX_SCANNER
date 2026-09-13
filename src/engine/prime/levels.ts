import type { OHLCVCandle, PrimeLevels } from "@/domain/prime";

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
      verificationNote:
        "Previous session candles unavailable; MID/R/S formulas pending Prime rule verification.",
    };
  }

  const yh = Math.max(...previousSessionCandles.map((c) => c.high));
  const yl = Math.min(...previousSessionCandles.map((c) => c.low));

  return {
    yh,
    yl,
    mid: null,
    r1: null,
    r2: null,
    r3: null,
    s1: null,
    s2: null,
    s3: null,
    verificationNote: "MID/R/S formulas are pending Prime Technical rule verification.",
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
  return previousSession ? byIstDate.get(previousSession) ?? [] : [];
}
