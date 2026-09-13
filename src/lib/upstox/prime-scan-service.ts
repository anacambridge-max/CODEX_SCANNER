import type { PrimeScanSummary } from "@/domain/prime";
import { runPrimeScanner } from "@/engine/prime/scanner";
import { fetchHistorical5MinCandles, fetchLtp } from "@/lib/upstox/client";
import { getMarketSession, getRefreshMeta } from "@/lib/upstox/market";
import { getUpstoxSessionStatus, loadUpstoxToken } from "@/lib/upstox/token-store";
import { loadConfiguredUniverse } from "@/lib/upstox/universe";

const DEFAULT_SCAN_LIMIT = 60;

export async function buildPrimeScanSummary(): Promise<PrimeScanSummary> {
  const generatedAt = new Date().toISOString();
  const session = await getUpstoxSessionStatus();
  const universe = loadConfiguredUniverse();
  const marketStatus = getMarketSession(new Date());
  const refreshMeta = getRefreshMeta(generatedAt);

  if (!session.connected) {
    return {
      universeCount: universe.length,
      scanCount: 0,
      generatedAt,
      marketStatus,
      lastScannerUpdate: null,
      nextRefreshAt: refreshMeta.nextRefreshAt,
      dataFreshness: "UNKNOWN",
      upstoxConnected: false,
      tokenExpiry: session.expiresAt,
      rows: [],
    };
  }

  const token = await loadUpstoxToken();
  if (!token) {
    return {
      universeCount: universe.length,
      scanCount: 0,
      generatedAt,
      marketStatus,
      lastScannerUpdate: null,
      nextRefreshAt: refreshMeta.nextRefreshAt,
      dataFreshness: "UNKNOWN",
      upstoxConnected: false,
      tokenExpiry: null,
      rows: [],
    };
  }

  const scanLimit = Number(process.env.PRIME_SCAN_LIMIT ?? DEFAULT_SCAN_LIMIT);
  const selected = universe
    .filter((u) => Boolean(u.instrumentKey))
    .slice(0, Number.isFinite(scanLimit) ? scanLimit : DEFAULT_SCAN_LIMIT);

  const toDate = istDate(0);
  const fromDate = istDate(7);

  const scanInputs = await Promise.all(
    selected.map(async (item) => {
      try {
        const [candles, ltp] = await Promise.all([
          fetchHistorical5MinCandles(token.accessToken, item.instrumentKey, toDate, fromDate),
          fetchLtp(token.accessToken, item.instrumentKey),
        ]);

        return {
          stock: item.symbol,
          instrumentKey: item.instrumentKey,
          futureInstrumentKey: item.futureInstrumentKey,
          lotSize: item.lotSize,
          ltp,
          dayChangePercent: null,
          candles,
        };
      } catch {
        return {
          stock: item.symbol,
          instrumentKey: item.instrumentKey,
          futureInstrumentKey: item.futureInstrumentKey,
          lotSize: item.lotSize,
          ltp: null,
          dayChangePercent: null,
          candles: [],
        };
      }
    }),
  );

  const rows = runPrimeScanner(scanInputs);

  return {
    universeCount: universe.length,
    scanCount: rows.length,
    generatedAt,
    marketStatus,
    lastScannerUpdate: generatedAt,
    nextRefreshAt: refreshMeta.nextRefreshAt,
    dataFreshness: refreshMeta.dataFreshness,
    upstoxConnected: true,
    tokenExpiry: session.expiresAt,
    rows,
  };
}

function istDate(daysBack: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysBack);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
