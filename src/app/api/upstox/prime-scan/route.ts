import { buildPrimeScanSummary } from "@/lib/upstox/prime-scan-service";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const summary = await buildPrimeScanSummary();
    return Response.json({
      generatedAt: summary.generatedAt,
      scanCount: summary.scanCount,
      rows: summary.rows,
    });
  } catch {
    return Response.json(
      {
        generatedAt: new Date().toISOString(),
        scanCount: 0,
        rows: [],
        error: "MARKET_DATA_UNAVAILABLE",
      },
      { status: 502 },
    );
  }
}
