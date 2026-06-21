import { getConnection } from "./config";

async function main() {
    try {
        const pool = await getConnection();
        const res = await pool.request().query(`
            SELECT 
                GETDATE() as gd,
                SYSDATETIME() as sdt,
                SYSUTCDATETIME() as sud,
                CAST(GETDATE() AS DATE) as gd_date,
                CAST(GETUTCDATE() AS DATE) as gud_date
        `);
        console.log("Timezone details from SQL Server:", res.recordset[0]);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();
