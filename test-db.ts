import postgres from "postgres";

const connectionString = "postgresql://postgres.bljkfsmddvzzbwsixubb:Aqzpn7799@q@aws-1-ap-south-1.pooler.supabase.com:5432/postgres";

console.log("Testing connection to:", connectionString.replace(/:[^:@]+@/, ":****@"));

const sql = postgres(connectionString, {
    connect_timeout: 5,
});

async function test() {
    try {
        const result = await sql`SELECT 1`;
        console.log("Connection successful:", result);
    } catch (err) {
        console.error("Connection failed:", err);
    } finally {
        await sql.end();
    }
}

test();
