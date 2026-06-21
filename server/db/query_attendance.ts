import { getConnection } from "./config";

async function main() {
    try {
        const pool = await getConnection();
        const res = await pool.request().query("SELECT * FROM attendance_member");
        console.log("attendance_member in DB:", JSON.stringify(res.recordset, null, 2));

        const resToday = await pool.request().query("SELECT GETDATE() as gd");
        console.log("GETDATE():", resToday.recordset[0].gd);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();
