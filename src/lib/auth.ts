import crypto from "crypto";

/**
 * Read the session signing secret lazily so a missing value fails loudly
 * instead of silently falling back to a guessable key.
 */
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET is missing or too short (min 32 chars, see .env.local)");
  }
  return secret;
}

/**
 * Hash password with PBKDF2 (NIST recommended, 100 000 iterations, 64-byte key)
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 100000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

/**
 * Verify password against stored salt + hash
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const hash = crypto
      .pbkdf2Sync(password, salt, 100000, 64, "sha512")
      .toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(key));
  } catch {
    return false;
  }
}

/**
 * Generate HMAC SHA256 JWT-like signed token
 */
export function createSessionToken(payload: {
  userId: string;
  email: string;
  name: string;
  plan: string;
}): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 7 * 24 * 3600; // 7 days expiry
  const body = Buffer.from(JSON.stringify({ ...payload, exp })).toString(
    "base64url"
  );
  const signature = crypto
    .createHmac("sha256", getJwtSecret())
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

/**
 * Verify and decode HMAC SHA256 signed session token
 */
export function verifySessionToken(token: string): {
  userId: string;
  email: string;
  name: string;
  plan: string;
} | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;

    const expectedSig = crypto
      .createHmac("sha256", getJwtSecret())
      .update(`${header}.${body}`)
      .digest("base64url");

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSig)
      )
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf-8")
    );
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null; // Expired
    }

    return payload;
  } catch {
    return null;
  }
}
