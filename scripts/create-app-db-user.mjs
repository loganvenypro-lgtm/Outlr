/**
 * One-off: create a least-privilege `outlr_app` role, hand it ownership of the
 * app tables, and point DATABASE_URL in .env.local at it.
 * Run once with the superuser URL in .env.local:  node scripts/create-app-db-user.mjs
 */
import postgres from 'postgres';
import crypto from 'crypto';
import fs from 'fs';

try { process.loadEnvFile('.env.local'); } catch {}
const adminUrl = process.env.DATABASE_URL;
if (!adminUrl) throw new Error('DATABASE_URL manquant (voir .env.local)');

const ROLE = 'outlr_app';
const sql = postgres(adminUrl, { max: 1, onnotice: () => {} });
const password = crypto.randomBytes(24).toString('hex');

async function main() {
  const [{ rolsuper }] = await sql`SELECT rolsuper FROM pg_roles WHERE rolname = current_user`;
  if (!rolsuper) throw new Error("DATABASE_URL n'utilise pas un super-utilisateur : rien à faire.");

  const exists = await sql`SELECT 1 FROM pg_roles WHERE rolname = ${ROLE}`;
  const verb = exists.length ? 'ALTER' : 'CREATE';
  await sql.unsafe(`${verb} ROLE ${ROLE} WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE PASSWORD '${password}'`);

  const [{ db }] = await sql`SELECT current_database() AS db`;
  await sql.unsafe(`GRANT CONNECT ON DATABASE "${db}" TO ${ROLE}`);
  await sql.unsafe(`GRANT USAGE, CREATE ON SCHEMA public TO ${ROLE}`);

  const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;
  for (const { tablename } of tables) {
    await sql.unsafe(`ALTER TABLE public."${tablename}" OWNER TO ${ROLE}`);
  }

  const appUrl = new URL(adminUrl);
  appUrl.username = ROLE;
  appUrl.password = password;
  const env = fs.readFileSync('.env.local', 'utf8');
  fs.writeFileSync('.env.local', env.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL=${appUrl}`));

  console.log(`✅ Rôle ${ROLE} prêt (${tables.length} tables transférées). .env.local mis à jour.`);
}

main()
  .catch((err) => {
    console.error('❌', err.message);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
