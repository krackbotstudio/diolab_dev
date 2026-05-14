import postgres from "postgres";

const projectRef = "bljkfsmddvzzbwsixubb";
const password = "Aqzpn7799@q"; // Plain password for testing if URI encoding is an issue
const encodedPassword = encodeURIComponent(password);

const configs = [
    {
        name: "Supavisor New Format (Session Pooler)",
        url: `postgresql://postgres.${projectRef}:${encodedPassword}@${projectRef}.pooler.supabase.com:5432/postgres`,
        options: {}
    }
];

async function runTests() {
    for (const config of configs) {
        console.log(`\n--- Testing: ${config.name} ---`);
        console.log(`URL: ${config.url.replace(/:[^:@]+@/, ":****@")}`);

        const sql = postgres(config.url, {
            ...config.options,
            connect_timeout: 10,
        });

        try {
            const result = await sql`SELECT 1 as connected`;
            console.log(`Result: SUCCESS`, result);
        } catch (err: any) {
            console.error(`Result: FAILED`, err.message || err);
        } finally {
            await sql.end();
        }
    }
}
runTests();
