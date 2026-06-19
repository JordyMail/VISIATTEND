// server/db/migrate_questions.ts
// Run: npx tsx server/db/migrate_questions.ts
import { getConnection, sql } from "./config.js";

async function migrateQuestions() {
  console.log("🔄 Creating questions system tables...");
  const pool = await getConnection();

  // Questions table
  console.log("  Creating questions table...");
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='questions' AND xtype='U')
    CREATE TABLE questions (
      id INT IDENTITY(1,1) PRIMARY KEY,
      title NVARCHAR(200) NOT NULL,
      question_text NVARCHAR(MAX) NOT NULL,
      question_type NVARCHAR(20) NOT NULL CHECK (question_type IN ('multiple_choice', 'true_false', 'short_answer')),
      options NVARCHAR(MAX),
      correct_answer NVARCHAR(500),
      points INT DEFAULT 10,
      time_limit_minutes INT DEFAULT 5,
      is_active BIT DEFAULT 1,
      created_by INT NULL REFERENCES users(id) ON DELETE SET NULL,
      start_date DATETIME NULL,
      end_date DATETIME NULL,
      max_attempts INT DEFAULT 1,
      created_at DATETIME DEFAULT GETDATE(),
      updated_at DATETIME DEFAULT GETDATE()
    );
    
    CREATE INDEX idx_questions_active ON questions(is_active);
    CREATE INDEX idx_questions_dates ON questions(start_date, end_date);
  `);

  // User answers table
  console.log("  Creating user_answers table...");
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_answers' AND xtype='U')
    CREATE TABLE user_answers (
      id INT IDENTITY(1,1) PRIMARY KEY,
      user_id INT NOT NULL,
      question_id INT NOT NULL,
      answer_text NVARCHAR(MAX) NOT NULL,
      is_correct BIT DEFAULT 0,
      points_earned INT DEFAULT 0,
      time_spent_seconds INT,
      attempt_number INT DEFAULT 1,
      answered_at DATETIME DEFAULT GETDATE(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );
    
    CREATE INDEX idx_user_answers_user ON user_answers(user_id);
    CREATE INDEX idx_user_answers_question ON user_answers(question_id);
    CREATE INDEX idx_user_answers_correct ON user_answers(is_correct);
  `);

  // User points table
  console.log("  Creating user_points table...");
  await pool.request().query(`
    IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='user_points' AND xtype='U')
    CREATE TABLE user_points (
      id INT IDENTITY(1,1) PRIMARY KEY,
      user_id INT NOT NULL UNIQUE,
      total_points INT DEFAULT 0,
      questions_answered INT DEFAULT 0,
      correct_answers INT DEFAULT 0,
      streak_count INT DEFAULT 0,
      last_answered_at DATETIME,
      updated_at DATETIME DEFAULT GETDATE(),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  // Trigger untuk update user_points
  console.log("  Creating trigger...");
  await pool.request().query(`
    IF EXISTS (SELECT * FROM sysobjects WHERE name='tr_update_user_points' AND xtype='TR')
      DROP TRIGGER tr_update_user_points;
      
    CREATE TRIGGER tr_update_user_points ON user_answers
    AFTER INSERT AS
    BEGIN
      DECLARE @user_id INT, @is_correct BIT, @points INT, @question_id INT;
      
      SELECT @user_id = user_id, @is_correct = is_correct, 
             @points = points_earned, @question_id = question_id
      FROM inserted;
      
      IF EXISTS (SELECT 1 FROM user_points WHERE user_id = @user_id)
      BEGIN
        UPDATE user_points 
        SET total_points = total_points + @points,
            questions_answered = questions_answered + 1,
            correct_answers = correct_answers + CASE WHEN @is_correct = 1 THEN 1 ELSE 0 END,
            streak_count = CASE 
                WHEN @is_correct = 1 THEN streak_count + 1 
                ELSE 0 
            END,
            last_answered_at = GETDATE(),
            updated_at = GETDATE()
        WHERE user_id = @user_id;
      END
      ELSE
      BEGIN
        INSERT INTO user_points (user_id, total_points, questions_answered, correct_answers, streak_count, last_answered_at)
        VALUES (@user_id, @points, 1, CASE WHEN @is_correct = 1 THEN 1 ELSE 0 END, 
                CASE WHEN @is_correct = 1 THEN 1 ELSE 0 END, GETDATE());
      END
    END
  `);

  console.log("✅ Questions system tables created successfully!");
  process.exit(0);
}

migrateQuestions().catch((e) => { 
  console.error("❌ Migration failed:", e); 
  process.exit(1); 
});