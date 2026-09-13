import { buildUpstoxLoginUrl, getOAuthConfig } from "@/lib/upstox/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const oauth = getOAuthConfig();

  if (!oauth.ready) {
    return Response.json(
      {
        ok: false,
        error: "UPSTOX_OAUTH_NOT_CONFIGURED",
        message: "Missing UPSTOX_CLIENT_ID / UPSTOX_CLIENT_SECRET / UPSTOX_REDIRECT_URI.",
      },
      { status: 400 },
    );
  }

  const url = buildUpstoxLoginUrl();
  return Response.redirect(url, 302);
}
