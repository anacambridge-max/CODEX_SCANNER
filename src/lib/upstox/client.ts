import type { UpstoxHistoricalCandle } from "@/lib/upstox/types";

const BASE_URL = "https://api.upstox.com";

function authHeader(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/json",
  };
}

async function upstoxGet<T>(path: string, accessToken: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: authHeader(accessToken),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Upstox request failed (${response.status}) for ${path}: ${body.slice(0, 300)}`);
  }

  return (await response.json()) as T;
}

export async function fetchUpstoxProfile(accessToken: string) {
  return upstoxGet<{ status: string; data?: { user_name?: string } }>("/v2/user/profile", accessToken);
}

export async function fetchLtp(accessToken: string, instrumentKey: string): Promise<number | null> {
  const json = await upstoxGet<{ data?: Record<string, { last_price?: number }> }>(
    `/v2/market-quote/ltp?instrument_key=${encodeURIComponent(instrumentKey)}`,
    accessToken,
  );

  const value = json.data?.[instrumentKey]?.last_price;
  return typeof value === "number" ? value : null;
}

export async function fetchHistorical1MinCandles(
  accessToken: string,
  instrumentKey: string,
  toDate: string,
  fromDate: string,
): Promise<UpstoxHistoricalCandle[]> {
  // Upstox V3 is the current historical-candle API and explicitly supports
  // 1-minute candles. A seven-day window is within its supported range.
  const path = `/v3/historical-candle/${encodeURIComponent(instrumentKey)}/minutes/1/${toDate}/${fromDate}`;

  const json = await upstoxGet<{ data?: { candles?: (string | number)[][] } }>(path, accessToken);
  const candles = json.data?.candles ?? [];

  return candles
    .map((arr) => {
      if (arr.length < 6) return null;
      const [timestamp, open, high, low, close, volume] = arr;
      if (
        typeof timestamp !== "string" ||
        typeof open !== "number" ||
        typeof high !== "number" ||
        typeof low !== "number" ||
        typeof close !== "number" ||
        typeof volume !== "number"
      ) {
        return null;
      }

      return { timestamp, open, high, low, close, volume } satisfies UpstoxHistoricalCandle;
    })
    .filter((c): c is UpstoxHistoricalCandle => Boolean(c))
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export const fetchHistorical5MinCandles = fetchHistorical1MinCandles;
