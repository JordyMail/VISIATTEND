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
    
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('questions') AND name = 'idx_questions_active')
    CREATE INDEX idx_questions_active ON questions(is_active);
    
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('questions') AND name = 'idx_questions_dates')
    CREATE INDEX idx_questions_dates ON questions(start_date, end_date);
  `);

  // User answers table
  console.log("  Recreating user_answers table...");
  await pool.request().query(`
    IF EXISTS (SELECT * FROM sysobjects WHERE name='user_answers' AND xtype='U')
      DROP TABLE user_answers;
      
    CREATE TABLE user_answers (
      id INT IDENTITY(1,1) PRIMARY KEY,
      member_id NVARCHAR(20) NOT NULL,
      question_id INT NOT NULL,
      answer_text NVARCHAR(MAX) NOT NULL,
      is_correct BIT DEFAULT 0,
      points_earned INT NULL,
      time_spent_seconds INT,
      attempt_number INT DEFAULT 1,
      answered_at DATETIME DEFAULT GETDATE(),
      FOREIGN KEY (member_id) REFERENCES user_member(member_id) ON DELETE CASCADE,
      FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
    );
    
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('user_answers') AND name = 'idx_user_answers_member')
    CREATE INDEX idx_user_answers_member ON user_answers(member_id);
    
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('user_answers') AND name = 'idx_user_answers_question')
    CREATE INDEX idx_user_answers_question ON user_answers(question_id);
    
    IF NOT EXISTS (SELECT * FROM sys.indexes WHERE object_id = OBJECT_ID('user_answers') AND name = 'idx_user_answers_correct')
    CREATE INDEX idx_user_answers_correct ON user_answers(is_correct);
  `);

  // User points table (obsolete, drop it if exists)
  console.log("  Dropping obsolete user_points table and triggers...");
  await pool.request().query(`
    IF EXISTS (SELECT * FROM sysobjects WHERE name='user_points' AND xtype='U')
      DROP TABLE user_points;
      
    IF EXISTS (SELECT * FROM sysobjects WHERE name='tr_update_user_points' AND xtype='TR')
      DROP TRIGGER tr_update_user_points;
  `);

  console.log("✅ Questions system tables created successfully!");
  process.exit(0);
}

migrateQuestions().catch((e) => { 
  console.error("❌ Migration failed:", e); 
  process.exit(1); 
});