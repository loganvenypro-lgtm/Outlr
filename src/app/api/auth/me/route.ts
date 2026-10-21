import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { createSessionToken, hashPassword, verifyPassword, verifySessionToken } from "@/lib/auth";
import { getDicebearAvatar, isAllowedAvatarUrl, resolveUserAvatar } from "@/lib/avatar";
import { isAdminUser } from "@/lib/admin";

export const dynamic = "force-dynamic";

const SESSION_COOKIE = "outlr_session";

function getSession(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE);
  if (!sessionCookie || !sessionCookie.value) return null;
  return verifySessionToken(sessionCookie.value);
}

export async function GET(request: NextRequest) {
  try {
    const payload = getSession(request);
    if (!payload) {
      return NextResponse.json({ authenticated: false, user: null });
    }

    // Name and avatar can be edited in Settings, so read the stored profile
    let profile: { name: string; avatar: string | null; createdAt: string | null; role: string | null } | null = null;
    try {
      const rows = await sql`
        SELECT name, avatar, role, created_at as "createdAt" FROM users WHERE id = ${payload.userId} LIMIT 1
      `;
      if (rows.length > 0) {
        profile = {
          name: rows[0].name,
          avatar: rows[0].avatar,
          role: rows[0].role,
          createdAt: rows[0].createdAt ? new Date(rows[0].createdAt).toISOString() : null,
        };
      }
    } catch (err) {
      console.error("Profile lookup failed, using session payload:", err);
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: payload.userId,
        email: payload.email,
        name: profile?.name || payload.name,
        plan: payload.plan,
        avatar: profile
          ? resolveUserAvatar({ avatar: profile.avatar, email: payload.email })
          : getDicebearAvatar(payload.email || payload.name),
        createdAt: profile?.createdAt || null,
        isAdmin: isAdminUser({ email: payload.email, role: profile?.role }),
      },
    });
  } catch {
    return NextResponse.json({ authenticated: false, user: null });
  }
}

/**
 * PATCH: update the signed-in user's profile (name, avatar) and/or password.
 * Re-issues the session cookie so the new name is reflected everywhere.
 */
export async function PATCH(request: NextRequest) {
  try {
    const payload = getSession(request);
    if (!payload) {
      return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
    }

    const body = await request.json();
    const { name, avatar, currentPassword, newPassword } = body as {
      name?: string;
      avatar?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    const rows = await sql`
      SELECT id, email, name, avatar, plan, password_hash FROM users WHERE id = ${payload.userId} LIMIT 1
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    const user = rows[0];

    let nextName: string = user.name;
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (trimmed.length < 2 || trimmed.length > 60) {
        return NextResponse.json({ error: "Le nom doit contenir entre 2 et 60 caractères." }, { status: 400 });
      }
      nextName = trimmed;
    }

    let nextAvatar: string | null = user.avatar;
    if (avatar !== undefined) {
      if (!isAllowedAvatarUrl(avatar)) {
        return NextResponse.json({ error: "Avatar non valide." }, { status: 400 });
      }
      nextAvatar = avatar;
    }

    let nextPasswordHash: string = user.password_hash;
    if (newPassword !== undefined) {
      if (!currentPassword || !verifyPassword(currentPassword, user.password_hash)) {
        return NextResponse.json({ error: "Mot de passe actuel incorrect." }, { status: 400 });
      }
      if (String(newPassword).length < 8) {
        return NextResponse.json(
          { error: "Le nouveau mot de passe doit contenir au moins 8 caractères." },
          { status: 400 }
        );
      }
      nextPasswordHash = hashPassword(newPassword);
    }

    await sql`
      UPDATE users
      SET name = ${nextName}, avatar = ${nextAvatar}, password_hash = ${nextPasswordHash}, updated_at = NOW()
      WHERE id = ${user.id}
    `;

    const updatedUser = {
      id: user.id,
      email: user.email,
      name: nextName,
      plan: user.plan || "Pro",
      avatar: resolveUserAvatar({ avatar: nextAvatar, email: user.email }),
    };

    const response = NextResponse.json({ success: true, user: updatedUser });
    response.cookies.set(
      SESSION_COOKIE,
      createSessionToken({ userId: user.id, email: user.email, name: nextName, plan: updatedUser.plan }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 3600,
        path: "/",
      }
    );
    return response;
  } catch (err) {
    console.error("Profile update error:", err);
    return NextResponse.json({ error: "Impossible de mettre à jour le profil." }, { status: 500 });
  }
}

export async function POST() {
  // Logout endpoint
  const response = NextResponse.json({ success: true });
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
