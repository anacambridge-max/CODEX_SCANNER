import { exchangeCodeForToken } from "@/lib/upstox/auth";
import { saveUpstoxToken } from "@/lib/upstox/token-store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return Response.json({ ok: false, error: "MISSING_CODE" }, { status: 400 });
  }

  try {
    const token = await exchangeCodeForToken(code);
    await saveUpstoxToken(token);

    const redirectTo = new URL("/", url.origin);
    redirectTo.searchParams.set("upstox", "connected");
    return Response.redirect(redirectTo, 302);
  } catch {
    const redirectTo = new URL("/", url.origin);
    redirectTo.searchParams.set("upstox", "error");
    return Response.redirect(redirectTo, 302);
  }
}
