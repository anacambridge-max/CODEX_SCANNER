import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  // Analytics Token mode is intentionally non-OAuth. The dashboard already
  // uses the server-side UPSTOX_ANALYTICS_TOKEN, so this endpoint must never
  // send the user into an Upstox redirect/login flow.
  const url = new URL("/", request.url);
  url.searchParams.set("upstox", "analytics-token");
  return NextResponse.redirect(url);
}
