import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { verifyPassword, createSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email et mot de passe requis." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    const users = await sql`
      SELECT id, email, password_hash, name, avatar, plan FROM users WHERE email = ${cleanEmail} LIMIT 1
    `;

    if (users.length === 0) {
      return NextResponse.json(
        { error: "Identifiants invalides." },
        { status: 401 }
      );
    }

    const user = users[0];
    const isValid = verifyPassword(password, user.password_hash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Identifiants invalides." },
        { status: 401 }
      );
    }

    const token = createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      plan: user.plan || "Pro",
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        plan: user.plan,
      },
    });

    // Set HttpOnly secure session cookie
    response.cookies.set("outlr_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 7 * 24 * 3600,
      path: "/",
    });

    return response;
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: err.message || "Erreur de connexion." },
      { status: 500 }
    );
  }
}
