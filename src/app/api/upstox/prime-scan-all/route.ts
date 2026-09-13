import { buildPrimeScanSummary } from "@/lib/upstox/prime-scan-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await buildPrimeScanSummary();
    return Response.json(summary);
  } catch {
    return Response.json(
      {
        universeCount: 0,
        scanCount: 0,
        generatedAt: new Date().toISOString(),
        marketStatus: "CLOSED",
        lastScannerUpdate: null,
        nextRefreshAt: null,
        dataFreshness: "UNKNOWN",
        upstoxConnected: false,
        tokenExpiry: null,
        rows: [],
        error: "MARKET_DATA_UNAVAILABLE",
      },
      { status: 502 },
    );
  }
}
