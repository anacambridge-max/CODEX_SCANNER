import { loadConfiguredUniverse } from "@/lib/upstox/universe";

export const dynamic = "force-dynamic";

export async function GET() {
  const universe = loadConfiguredUniverse();

  return Response.json({
    count: universe.length,
    configured: universe.length > 0,
    message:
      universe.length > 0
        ? "F&O universe loaded from explicit server configuration."
        : "No F&O universe configured. Set UPSTOX_FNO_UNIVERSE_JSON (recommended).",
    rows: universe,
  });
}
