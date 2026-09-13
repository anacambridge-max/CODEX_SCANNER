import { getMarketSession, getIstNowParts } from "@/lib/upstox/market";
import { getUpstoxSessionStatus } from "@/lib/upstox/token-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getUpstoxSessionStatus();
  const now = new Date();
  const marketStatus = getMarketSession(now);
  const ist = getIstNowParts(now);

  return Response.json({
    upstoxConnected: session.connected,
    sessionExpired: session.expired,
    tokenExpiry: session.expiresAt,
    tokenSource: session.source,
    message: session.message,
    marketStatus,
    istTime: ist.time,
    marketHours: "09:15 — 15:30",
    generatedAt: now.toISOString(),
  });
}
