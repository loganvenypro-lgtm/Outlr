import postgres from "postgres";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set (see .env.local)");
}

// Singleton pool connection for Next.js and high-concurrency Node.js runtime
declare global {
  // eslint-disable-next-line no-var
  var __postgresSql: ReturnType<typeof postgres> | undefined;
}

export const sql =
  global.__postgresSql ||
  postgres(connectionString, {
    max: 20, // Connection pool size for handling concurrent requests
    idle_timeout: 30,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  global.__postgresSql = sql;
}

export default sql;
