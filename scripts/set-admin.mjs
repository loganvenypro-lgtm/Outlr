/**
 * Give (or remove) the admin role on an account, for /admin.
 * Usage:  node scripts/set-admin.mjs you@example.com          -> admin
 *         node scripts/set-admin.mjs you@example.com --revoke -> user
 * ADMIN_EMAILS in .env.local (comma separated) also grants admin access.
 */
import postgres from 'postgres';

try { process.loadEnvFile('.env.local'); } catch {}
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL manquant (voir .env.local)');

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error('Usage: node scripts/set-admin.mjs <email> [--revoke]');
  process.exit(1);
}
const role = process.argv.includes('--revoke') ? 'user' : 'admin';

const sql = postgres(connectionString, { max: 1 });
const rows = await sql`UPDATE users SET role = ${role}, updated_at = now() WHERE email = ${email} RETURNING id`;
console.log(rows.length ? `✅ ${email} -> ${role}` : `❌ Aucun compte pour ${email}`);
await sql.end();
