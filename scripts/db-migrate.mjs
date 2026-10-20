/**
 * Apply one SQL migration file to DATABASE_URL.
 * Usage:  node scripts/db-migrate.mjs db/migrations/002_channel_alerts_dedupe.sql
 */
import postgres from 'postgres';

try { process.loadEnvFile('.env.local'); } catch {}
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL manquant (voir .env.local)');

const file = process.argv[2];
if (!file) {
  console.error('Usage: node scripts/db-migrate.mjs <fichier.sql>');
  process.exit(1);
}

const sql = postgres(connectionString, { max: 1, onnotice: () => {} });

sql.file(file)
  .then(() => console.log(`✅ Migration appliquée : ${file}`))
  .catch((err) => {
    console.error(`❌ ${file} :`, err.message);
    process.exitCode = 1;
  })
  .finally(() => sql.end());
