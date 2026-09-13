import { fetchHistorical1MinCandles } from "@/lib/upstox/client";
import { getUpstoxSessionStatus, loadUpstoxToken } from "@/lib/upstox/token-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const instrumentKey = url.searchParams.get("instrumentKey");
  const toDate = url.searchParams.get("toDate") ?? todayIst();
  const fromDate = url.searchParams.get("fromDate") ?? pastIstDate(7);

  if (!instrumentKey) {
    return Response.json({ ok: false, error: "MISSING_INSTRUMENT_KEY" }, { status: 400 });
  }

  const session = await getUpstoxSessionStatus();
  if (!session.connected) {
    return Response.json(
      {
        ok: false,
        error: session.expired ? "UPSTOX_SESSION_EXPIRED" : "UPSTOX_DISCONNECTED",
      },
      { status: 401 },
    );
  }

  const token = await loadUpstoxToken();
  if (!token) {
    return Response.json({ ok: false, error: "UPSTOX_TOKEN_NOT_FOUND" }, { status: 401 });
  }

  try {
    const candles = await fetchHistorical1MinCandles(token.accessToken, instrumentKey, toDate, fromDate);

    return Response.json({
      ok: true,
      instrumentKey,
      interval: "1minute",
      fromDate,
      toDate,
      count: candles.length,
      candles,
    });
  } catch {
    return Response.json({ ok: false, error: "MARKET_DATA_UNAVAILABLE" }, { status: 502 });
  }
}

function todayIst() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function pastIstDate(daysBack: number) {
  const now = new Date();
  now.setDate(now.getDate() - daysBack);

  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
