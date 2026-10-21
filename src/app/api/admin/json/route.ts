import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { listJsonFiles } from "@/lib/adminJson";

export const dynamic = "force-dynamic";

/** The JSON databases in data/. */
export async function GET(request: NextRequest) {
  const admin = await requireAdmin(request);
  if (admin instanceof NextResponse) return admin;
  return NextResponse.json({ files: listJsonFiles() });
}
