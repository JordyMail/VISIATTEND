import { getConnection } from "./config";

async function main() {
    try {
        const pool = await getConnection();
        const res = await pool.request().query("SELECT TOP 20 * FROM activity_logs ORDER BY created_at DESC");
        console.log("Activity logs in DB:", JSON.stringify(res.recordset, null, 2));
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();
