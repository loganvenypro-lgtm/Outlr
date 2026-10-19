import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:marleybouba@localhost:5432/newiq';
const sql = postgres(connectionString);

async function initUsersTable() {
  console.log("🔐 Création de la table des utilisateurs dans PostgreSQL...");
  
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(64) PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      avatar TEXT,
      plan VARCHAR(32) DEFAULT 'Pro',
      role VARCHAR(32) DEFAULT 'user',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );
  `;

  await sql`
    CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
  `;

  console.log("✅ Table users créée avec succès dans PostgreSQL !");
  await sql.end();
}

initUsersTable().catch(console.error);
