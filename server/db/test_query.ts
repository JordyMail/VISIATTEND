import { getConnection, sql } from "./config";

async function main() {
    try {
        const pool = await getConnection();

        // Let's resolve the user silfan
        const name = "silfan";
        const email = null;

        const result = await pool
          .request()
          .input("email", sql.NVarChar, email)
          .input("name", sql.NVarChar, name)
          .query(`
            SELECT TOP 1
              um.id,
              um.member_id,
              um.name AS full_name,
              email,
              COALESCE(mp.points, 0) AS points
            FROM user_member um
            LEFT JOIN member_point mp ON mp.member_id = um.member_id
            WHERE 1=1
              AND (
                (@email IS NOT NULL AND LOWER(email) = LOWER(@email))
                OR (@name IS NOT NULL AND LOWER(um.name) = LOWER(@name))
              )
            ORDER BY CASE WHEN @email IS NOT NULL AND LOWER(email) = LOWER(@email) THEN 0 ELSE 1 END, id ASC
          `);
        const matchedUser = result.recordset[0];
        console.log("Matched User Member:", matchedUser);

        // Fetch today's attendance record
        const attendanceResult = await pool
          .request()
          .input("member_id", sql.NVarChar, matchedUser.member_id)
          .query(`
            SELECT TOP 1 attendance_date
            FROM attendance_member
            WHERE member_id = @member_id
              AND CAST(attendance_date AS DATE) = CAST(GETDATE() AS DATE)
            ORDER BY attendance_date DESC
          `);
        const attendanceDate = attendanceResult.recordset[0]?.attendance_date;
        console.log("Attendance Date:", attendanceDate);

        // Resolve user id (wait, does user_answers reference users.id or user_member.id?)
        // Let's check the schema of user_answers!
        const userAnswersSchema = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'user_answers'");
        console.log("user_answers columns:", userAnswersSchema.recordset);

        const userMemberSchema = await pool.request().query("SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'user_member'");
        console.log("user_member columns:", userMemberSchema.recordset);

        // Run the query from handleGetUserDashboardQuestions
        const qResult = await pool
          .request()
          .input("userId", sql.Int, matchedUser.id) // wait, is it matchedUser.id (user_member.id) or users.id?
          .input("attendanceDate", sql.DateTime, attendanceDate)
          .query(`
            SELECT q.id, q.title, q.question_text, q.question_type, q.options, q.points, q.time_limit_minutes, q.correct_answer
            FROM questions q
            WHERE q.is_active = 1
              AND CAST(q.start_date AS DATE) = CAST(@attendanceDate AS DATE)
            ORDER BY q.created_at ASC
          `);
        console.log("Questions found with matchedUser.id:", qResult.recordset);

        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

main();
