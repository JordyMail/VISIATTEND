import { getConnection } from "./config";

async function main() {
    try {
        const pool = await getConnection();
        const res = await pool.request().query("SELECT * FROM questions");
        console.log("Questions in DB:", JSON.stringify(res.recordset, null, 2));

        const resAnswers = await pool.request().query("SELECT * FROM user_answers");
        console.log("User Answers in DB:", JSON.stringify(resAnswers.recordset, null, 2));

        const resUser = await pool.request().query("SELECT * FROM users");
        console.log("Users in DB:", JSON.stringify(resUser.recordset.map(u => ({ id: u.id, name: u.full_name, email: u.email, role: u.role })), null, 2));

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();
