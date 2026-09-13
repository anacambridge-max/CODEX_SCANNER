import type { UpstoxUniverseItem } from "@/lib/upstox/types";

export function loadConfiguredUniverse(): UpstoxUniverseItem[] {
  const jsonValue = process.env.UPSTOX_FNO_UNIVERSE_JSON;
  if (jsonValue) {
    try {
      const parsed = JSON.parse(jsonValue) as UpstoxUniverseItem[];
      return parsed.filter(
        (item) =>
          Boolean(item?.symbol) && Boolean(item?.instrumentKey) && typeof item.symbol === "string",
      );
    } catch {
      return [];
    }
  }

  const csvValue = process.env.UPSTOX_FNO_UNIVERSE;
  if (!csvValue) return [];

  return csvValue
    .split(",")
    .map((symbol) => symbol.trim())
    .filter(Boolean)
    .map((symbol) => ({
      symbol,
      instrumentKey: "",
      futureInstrumentKey: null,
      lotSize: null,
    }));
}
