import postgres from 'postgres';

try { process.loadEnvFile('.env.local'); } catch {}
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL manquant (voir .env.local)');
const sql = postgres(connectionString);

async function testConnection() {
  try {
    const result = await sql`SELECT current_database(), now() as server_time`;
    console.log("✅ Connexion réussie à PostgreSQL :", result);
    const count = await sql`SELECT count(*) FROM folders`;
    console.log("Folders count:", count);
  } catch (err) {
    console.error("❌ Erreur de connexion :", err.message);
  } finally {
    await sql.end();
  }
}

testConnection();
