import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:marleybouba@localhost:5432/newiq';
const sql = postgres(connectionString);

async function testConnection() {
  try {
    const result = await sql`SELECT current_database(), now() as server_time`;
    console.log("✅ Connexion réussie à PostgreSQL :", result);
  } catch (err) {
    console.error("❌ Erreur de connexion :", err.message);
  } finally {
    await sql.end();
  }
}

testConnection();
