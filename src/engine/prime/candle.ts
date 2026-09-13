import type { OHLCVCandle, PrimeCandleStats } from "@/domain/prime";

export function analyzeCandle(candle: OHLCVCandle | null): PrimeCandleStats | null {
  if (!candle) return null;

  const range = Math.max(candle.high - candle.low, 0);
  const body = Math.abs(candle.close - candle.open);
  const upperWick = Math.max(candle.high - Math.max(candle.open, candle.close), 0);
  const lowerWick = Math.max(Math.min(candle.open, candle.close) - candle.low, 0);

  const bodyPercent = range > 0 ? (body / range) * 100 : 0;

  const closePosition = range > 0 ? (candle.close - candle.low) / range : 0.5;
  const closeLocation: PrimeCandleStats["closeLocation"] =
    closePosition >= 0.67 ? "NEAR_HIGH" : closePosition <= 0.33 ? "NEAR_LOW" : "MID";

  const candleBias: PrimeCandleStats["candleBias"] =
    candle.close > candle.open
      ? "BULLISH"
      : candle.close < candle.open
        ? "BEARISH"
        : "NEUTRAL";

  return {
    range,
    body,
    upperWick,
    lowerWick,
    bodyPercent,
    closeLocation,
    candleBias,
  };
}
