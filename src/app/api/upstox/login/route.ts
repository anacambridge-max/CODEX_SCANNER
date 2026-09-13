export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(
    {
      ok: false,
      error: "OAUTH_DISABLED",
      message: "This deployment uses the Upstox Analytics Token configured on the server. No redirect/login is required.",
    },
    { status: 410 },
  );
}
