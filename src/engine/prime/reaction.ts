import type { OHLCVCandle, PrimeLevels, PrimeReaction } from "@/domain/prime";

export function analyzeReaction(levels: PrimeLevels, latest: OHLCVCandle | null): PrimeReaction {
  if (!latest || levels.yh === null || levels.yl === null) {
    return {
      touchedLevel: "NONE",
      reactionType: "NO_CLEAR_REACTION",
      direction: "NEUTRAL",
      structuralSl: null,
      fakeBreakout: false,
      note: "Insufficient level/candle data for reaction analysis.",
    };
  }

  const touchedYh = latest.high >= levels.yh;
  const touchedYl = latest.low <= levels.yl;

  if (!touchedYh && !touchedYl) {
    return {
      touchedLevel: "NONE",
      reactionType: "NO_CLEAR_REACTION",
      direction: "NEUTRAL",
      structuralSl: null,
      fakeBreakout: false,
      note: "No YH/YL interaction on current candle.",
    };
  }

  if (touchedYh) {
    const closeAbove = latest.close > levels.yh;
    const fakeBreakout = closeAbove && latest.close < latest.high;

    if (closeAbove) {
      return {
        touchedLevel: "YH",
        reactionType: fakeBreakout ? "BULLISH_REACTION" : "BULLISH_REACTION",
        direction: "BUY",
        structuralSl: latest.low,
        fakeBreakout,
        note: fakeBreakout
          ? "YH break attempted; failure to hold at highs indicates fake breakout risk."
          : "YH touched with bullish continuation; confirmation rule still required.",
      };
    }

    return {
      touchedLevel: "YH",
      reactionType: "BEARISH_REJECTION",
      direction: "SELL",
      structuralSl: latest.high,
      fakeBreakout: true,
      note: "YH touched then rejected; opposite-side setup requires confirmation.",
    };
  }

  const closeBelow = latest.close < levels.yl;
  const fakeBreakout = closeBelow && latest.close > latest.low;

  if (closeBelow) {
    return {
      touchedLevel: "YL",
      reactionType: fakeBreakout ? "BEARISH_REACTION" : "BEARISH_REACTION",
      direction: "SELL",
      structuralSl: latest.high,
      fakeBreakout,
      note: fakeBreakout
        ? "YL break attempted; inability to hold near lows indicates fake breakout risk."
        : "YL touched with bearish continuation; confirmation rule still required.",
    };
  }

  return {
    touchedLevel: "YL",
    reactionType: "BULLISH_REJECTION",
    direction: "BUY",
    structuralSl: latest.low,
    fakeBreakout: true,
    note: "YL touched then rejected; opposite-side setup requires confirmation.",
  };
}
