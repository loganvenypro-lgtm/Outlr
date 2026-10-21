/**
 * Copy the local database (DATABASE_URL in .env.local) into another, empty Postgres
 * database, e.g. a hosted one (Neon, Supabase) for the Vercel deployment.
 * Creates the schema from db/migrations, then copies every table. No pg_dump needed.
 *
 * Usage:  node scripts/db-copy.mjs "postgresql://user:pass@host/db?sslmode=require"
 *         add --skip-snapshots to leave out the stats history tables (much smaller copy)
 */
import fs from 'fs';
import path from 'path';
import postgres from 'postgres';

try { process.loadEnvFile('.env.local'); } catch {}
const sourceUrl = process.env.DATABASE_URL;
const targetUrl = process.argv[2];
if (!sourceUrl) throw new Error('DATABASE_URL manquant (voir .env.local)');
if (!targetUrl || targetUrl.startsWith('--')) {
  console.error('Usage: node scripts/db-copy.mjs "<URL de la base cible>" [--skip-snapshots]');
  process.exit(1);
}
if (targetUrl === sourceUrl) throw new Error('La base cible est la même que la base locale.');

const SKIPPED = process.argv.includes('--skip-snapshots')
  ? new Set(['video_stat_snapshots', 'channel_stat_snapshots'])
  : new Set();
// Parents before children, for the foreign keys; the other tables follow in any order
const FIRST = ['folders', 'channels', 'users', 'saved_folders'];
const BATCH = 1000;

const source = postgres(sourceUrl, { max: 2, onnotice: () => {} });
// One connection: some migrations run their own BEGIN … COMMIT
const target = postgres(targetUrl, { max: 1, onnotice: () => {} });

async function tableNames(sql) {
  const rows = await sql`
    SELECT c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r'`;
  return rows.map((r) => r.name);
}

async function columnNames(sql, table) {
  const rows = await sql`
    SELECT column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = ${table} ORDER BY ordinal_position`;
  return rows.map((r) => r.column_name);
}

try {
  // Refuse to mix data into a database that is already in use
  const existing = await tableNames(target);
  if (existing.includes('users')) {
    const [{ n }] = await target`SELECT count(*)::int AS n FROM users`;
    if (n > 0) throw new Error(`La base cible contient déjà ${n} utilisateur(s) : utilise une base vide.`);
  }

  console.log('1/3 Création du schéma…');
  const migrations = fs.readdirSync('db/migrations').filter((f) => f.endsWith('.sql')).sort();
  for (const file of migrations) {
    await target.file(path.join('db/migrations', file));
    console.log(`   ✓ ${file}`);
  }

  console.log('2/3 Copie des tables…');
  const sourceTables = await tableNames(source);
  const targetTables = new Set(await tableNames(target));
  const ordered = [...FIRST.filter((t) => sourceTables.includes(t)), ...sourceTables.filter((t) => !FIRST.includes(t)).sort()];

  for (const table of ordered) {
    if (SKIPPED.has(table)) { console.log(`   – ${table} (ignorée)`); continue; }
    if (!targetTables.has(table)) { console.log(`   ! ${table} absente des migrations, ignorée`); continue; }
    const targetCols = new Set(await columnNames(target, table));
    const cols = (await columnNames(source, table)).filter((c) => targetCols.has(c));

    let copied = 0;
    for await (const rows of source`SELECT ${source(cols)} FROM ${source(table)}`.cursor(BATCH)) {
      await target`INSERT INTO ${target(table)} ${target(rows, cols)} ON CONFLICT DO NOTHING`;
      copied += rows.length;
      process.stdout.write(`\r   … ${table} ${copied}`);
    }
    process.stdout.write(`\r   ✓ ${table} : ${copied} lignes\n`);
  }

  console.log('3/3 Mise à jour des compteurs (séquences)…');
  const serials = await target`
    SELECT table_name, column_name FROM information_schema.columns
    WHERE table_schema = 'public' AND column_default LIKE 'nextval(%'`;
  for (const { table_name: t, column_name: c } of serials) {
    await target`
      SELECT setval(pg_get_serial_sequence(${t}, ${c}), COALESCE((SELECT max(${target(c)}) FROM ${target(t)}), 0) + 1, false)`;
  }

  console.log('✅ Copie terminée.');
} catch (err) {
  console.error(`\n❌ ${err.message}`);
  process.exitCode = 1;
} finally {
  await source.end();
  await target.end();
}
