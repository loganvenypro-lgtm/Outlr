import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/postgres";
import { hashPassword, createSessionToken } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Nom, adresse email et mot de passe requis." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 6 caractères." },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existing = await sql`
      SELECT id FROM users WHERE email = ${cleanEmail} LIMIT 1
    `;

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Cette adresse email est déjà utilisée." },
        { status: 409 }
      );
    }

    const userId = `usr_${Math.random().toString(36).substring(2, 10)}`;
    const passHash = hashPassword(password);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

    await sql`
      INSERT INTO users (id, email, password_hash, name, avatar, plan)
      VALUES (${userId}, ${cleanEmail}, ${passHash}, ${name.trim()}, ${avatar}, 'Pro')
    `;

    const token = createSessionToken({
      userId,
      email: cleanEmail,
      name: name.trim(),
      plan: "Pro",
    });

    const response = NextResponse.json({
      success: true,
      user: { id: userId, email: cleanEmail, name: name.trim(), avatar, plan: "Pro" },
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
    console.error("Signup error:", err);
    return NextResponse.json(
      { error: err.message || "Erreur lors de l'inscription." },
      { status: 500 }
    );
  }
}
