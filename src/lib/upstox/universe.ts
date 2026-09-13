import type { UpstoxUniverseItem } from "@/lib/upstox/types";

const NSE_INSTRUMENTS_URL = "https://assets.upstox.com/market-quote/instruments/exchange/NSE.json.gz";

let cachedUniverse: { expiresAt: number; rows: UpstoxUniverseItem[] } | null = null;

export function loadConfiguredUniverse(): UpstoxUniverseItem[] {
  const jsonValue = process.env.UPSTOX_FNO_UNIVERSE_JSON;
  if (jsonValue) {
    try {
      const parsed = JSON.parse(jsonValue) as UpstoxUniverseItem[];
      const rows = parsed.filter(
        (item) =>
          Boolean(item?.symbol) && Boolean(item?.instrumentKey) && typeof item.symbol === "string",
      );
      if (rows.length > 0) return rows;
    } catch {
      // Fall through to the live Upstox instrument master below.
    }
  }

  const csvValue = process.env.UPSTOX_FNO_UNIVERSE;
  if (csvValue) {
    const rows = csvValue
      .split(",")
      .map((symbol) => symbol.trim())
      .filter(Boolean)
      .map((symbol) => ({
        symbol,
        instrumentKey: "",
        futureInstrumentKey: null,
        lotSize: null,
      }));
    if (rows.length > 0) return rows;
  }

  return cachedUniverse?.rows ?? [];
}

export async function loadLiveFnoUniverse(): Promise<UpstoxUniverseItem[]> {
  const configured = loadConfiguredUniverse();
  if (configured.length > 0) return configured;

  if (cachedUniverse && cachedUniverse.expiresAt > Date.now()) {
    return cachedUniverse.rows;
  }

  const response = await fetch(NSE_INSTRUMENTS_URL, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Unable to load Upstox NSE instrument master (${response.status})`);
  }

  const compressed = Buffer.from(await response.arrayBuffer());
  const { gunzipSync } = await import("node:zlib");
  const text = gunzipSync(compressed).toString("utf8");
  const instruments = JSON.parse(text) as Array<Record<string, unknown>>;

  const now = Date.now();
  const nearestFutureByUnderlying = new Map<string, Record<string, unknown>>();

  for (const item of instruments) {
    if (
      item.segment !== "NSE_FO" ||
      item.instrument_type !== "FUT" ||
      item.underlying_type !== "EQUITY" ||
      typeof item.underlying_symbol !== "string" ||
      typeof item.instrument_key !== "string" ||
      typeof item.underlying_key !== "string"
    ) {
      continue;
    }

    const expiry = toExpiryMs(item.expiry);
    if (expiry !== null && expiry < now) continue;

    const symbol = item.underlying_symbol;
    const existing = nearestFutureByUnderlying.get(symbol);
    if (!existing || isEarlierExpiry(item, existing)) {
      nearestFutureByUnderlying.set(symbol, item);
    }
  }

  const rows: UpstoxUniverseItem[] = Array.from(nearestFutureByUnderlying.values())
    .map((item) => ({
      symbol: String(item.underlying_symbol),
      instrumentKey: String(item.underlying_key),
      futureInstrumentKey: String(item.instrument_key),
      lotSize: typeof item.lot_size === "number" ? item.lot_size : null,
    }))
    .sort((a, b) => a.symbol.localeCompare(b.symbol));

  if (rows.length === 0) {
    throw new Error("No active NSE equity F&O instruments found in Upstox instrument master.");
  }

  cachedUniverse = { rows, expiresAt: Date.now() + 15 * 60 * 1000 };
  return rows;
}

function toExpiryMs(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function isEarlierExpiry(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const aExpiry = toExpiryMs(a.expiry);
  const bExpiry = toExpiryMs(b.expiry);
  if (aExpiry === null) return false;
  if (bExpiry === null) return true;
  return aExpiry < bExpiry;
}
