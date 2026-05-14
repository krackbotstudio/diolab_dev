import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("SUPABASE_DATABASE_URL or DATABASE_URL environment variable is not set");
}

console.log(`[Database] Connecting to database...`);

const client = postgres(connectionString, {
  prepare: false,
  connect_timeout: 30,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
  connection: {
    application_name: 'diolab'
  },
  onnotice: () => { },
});

export const db = drizzle(client, { schema });

// Test connection on startup
(async () => {
  try {
    console.log('[Database] Running startup connection test...');
    await client`SELECT 1`.catch((err: any) => {
      throw err;
    });
    console.log('[Database] Connection successful');
  } catch (err: any) {
    console.error('[Database] Failed to connect on startup:', err.message || err);
    console.error('[Database] Please check your network connection and NAT/Firewall settings.');
  }
})();
