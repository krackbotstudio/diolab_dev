import postgres from "postgres";

const connectionString = "postgresql://postgres:Aqzpn7799%40q@db.bljkfsmddvzzbwsixubb.supabase.co:6543/postgres";

const sql = postgres(connectionString);

async function checkSchema() {
    try {
        const columns = await sql`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `;
        console.log("Users Table Columns:", columns);
    } catch (err) {
        console.error("Failed to check schema:", err);
    } finally {
        await sql.end();
    }
}

checkSchema();
