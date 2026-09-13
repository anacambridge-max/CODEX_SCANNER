export const dynamic = "force-dynamic";

export async function GET() {
  const upstoxConfigured = Boolean(process.env.UPSTOX_ANALYTICS_TOKEN?.trim());

  return Response.json({
    ok: true,
    upstoxConfigured,
    database: "not_required",
  });
}
