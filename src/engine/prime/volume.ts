import type { OHLCVCandle, VolumeClass } from "@/domain/prime";

export interface VolumeAnalysis {
  average20: number | null;
  ratio: number | null;
  volumeClass: VolumeClass | null;
  isOpeningCandle: boolean;
  note: string;
}

export function analyzeVolume(candles: OHLCVCandle[]): VolumeAnalysis {
  const latest = candles.at(-1);
  if (!latest) {
    return {
      average20: null,
      ratio: null,
      volumeClass: null,
      isOpeningCandle: false,
      note: "No candle data available.",
    };
  }

  const history = candles.slice(-21, -1);
  const average20 = history.length
    ? history.reduce((acc, c) => acc + c.volume, 0) / history.length
    : null;

  const ratio = average20 && average20 > 0 ? latest.volume / average20 : null;

  const volumeClass: VolumeClass | null =
    ratio === null
      ? null
      : ratio >= 6.5
        ? "STAR_3"
        : ratio >= 4
          ? "STAR_2"
          : ratio >= 2
            ? "STAR_1"
            : "NORMAL";

  const isOpeningCandle = is915To920Ist(latest.timestamp);

  return {
    average20,
    ratio,
    volumeClass,
    isOpeningCandle,
    note: isOpeningCandle
      ? "09:15–09:20 opening candle volume is structurally separate from normal intraday comparisons."
      : "Volume compared against 20-candle average.",
  };
}

function is915To920Ist(isoTimestamp: string): boolean {
  const date = new Date(isoTimestamp);
  const istText = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  return istText >= "09:15" && istText < "09:20";
}
