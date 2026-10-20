import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { verifySessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Set the signed-in creator's own channel (onboarding, or "this is my channel" later). */
export async function POST(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get("outlr_session")?.value ?? "");
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { channelId } = await request.json().catch(() => ({}));
  if (typeof channelId !== "string" || !/^UC[\w-]{22}$/.test(channelId)) {
    return NextResponse.json({ error: "ID de chaîne invalide." }, { status: 400 });
  }

  await sql`UPDATE users SET youtube_channel_id = ${channelId}, updated_at = now() WHERE id = ${session.userId}`;
  return NextResponse.json({ success: true, channelId });
}
