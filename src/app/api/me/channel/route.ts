import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { verifySessionToken } from "@/lib/auth";
import { ensureChannelImported } from "@/lib/channelImport";

export const dynamic = "force-dynamic";

const CHANNEL_ID = /^UC[\w-]{22}$/;

/**
 * Set the signed-in creator's own channel and/or competitors (onboarding, or
 * "this is my channel" later). Both drive the personalised home.
 */
export async function POST(request: NextRequest) {
  const session = verifySessionToken(request.cookies.get("outlr_session")?.value ?? "");
  if (!session) return NextResponse.json({ error: "Non authentifié." }, { status: 401 });

  const { channelId, competitorIds } = await request.json().catch(() => ({}));
  if (channelId != null && (typeof channelId !== "string" || !CHANNEL_ID.test(channelId))) {
    return NextResponse.json({ error: "ID de chaîne invalide." }, { status: 400 });
  }
  if (competitorIds != null && (!Array.isArray(competitorIds) || competitorIds.some((id) => typeof id !== "string" || !CHANNEL_ID.test(id)))) {
    return NextResponse.json({ error: "IDs de concurrents invalides." }, { status: 400 });
  }
  if (channelId == null && competitorIds == null) {
    return NextResponse.json({ error: "Rien à enregistrer." }, { status: 400 });
  }

  const competitors = ((competitorIds as string[] | undefined) ?? []).filter((id) => id !== channelId).slice(0, 12);

  // The home reads the scanner tables: make sure these channels and their videos are there.
  await Promise.all([channelId, ...competitors].filter(Boolean).map((id) => ensureChannelImported(id)));

  if (channelId != null) {
    await sql`UPDATE users SET youtube_channel_id = ${channelId}, updated_at = now() WHERE id = ${session.userId}`;
  }
  if (competitorIds != null) {
    await sql`UPDATE users SET competitor_channel_ids = ${competitors}, updated_at = now() WHERE id = ${session.userId}`;
  }
  return NextResponse.json({ success: true, channelId: channelId ?? null, competitorIds: competitors });
}
