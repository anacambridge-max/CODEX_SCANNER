import type { OHLCVCandle } from "@/domain/prime";

export function calculateEma(values: number[], period: number): number | null {
  if (values.length < period || period <= 0) return null;

  const multiplier = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < values.length; i += 1) {
    ema = values[i] * multiplier + ema * (1 - multiplier);
  }

  return ema;
}

export function calculateEma20(candles: OHLCVCandle[]): number | null {
  return calculateEma(candles.map((c) => c.close), 20);
}
