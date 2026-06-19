// server/db/repositories/QuestionRepository.ts
import { getConnection, sql } from '../config';

export interface Question {
  id: number;
  title: string;
  questionText: string;
  questionType: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: string; // JSON string
  correctAnswer: string;
  points: number;
  timeLimitMinutes: number;
  isActive: boolean;
  createdBy?: number;
  startDate?: string;
  endDate?: string;
  maxAttempts: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserAnswer {
  id: number;
  userId: number;
  questionId: number;
  answerText: string;
  isCorrect: boolean;
  pointsEarned: number;
  timeSpentSeconds?: number;
  attemptNumber: number;
  answeredAt: string;
}

export interface UserPoints {
  id: number;
  userId: number;
  totalPoints: number;
  questionsAnswered: number;
  correctAnswers: number;
  streakCount: number;
  lastAnsweredAt: string;
}

export class QuestionRepository {
  
  // ─── Questions CRUD ──────────────────────────────────────────────────────
  
  async findAll(filters?: { isActive?: boolean }): Promise<Question[]> {
    const pool = await getConnection();
    let query = `
      SELECT q.*, u.full_name as creator_name
      FROM questions q
      LEFT JOIN users u ON q.created_by = u.id
      WHERE 1=1
    `;
    
    const request = pool.request();
    
    if (filters?.isActive !== undefined) {
      query += ` AND q.is_active = @isActive`;
      request.input('isActive', sql.Bit, filters.isActive);
    }
    
    query += ` ORDER BY q.created_at DESC`;
    
    const result = await request.query(query);
    return result.recordset;
  }

  async findById(id: number): Promise<Question | null> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        SELECT q.*, u.full_name as creator_name
        FROM questions q
        LEFT JOIN users u ON q.created_by = u.id
        WHERE q.id = @id
      `);
    
    return result.recordset[0] || null;
  }

  async create(question: Partial<Question>): Promise<Question> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('title', sql.NVarChar, question.title)
      .input('question_text', sql.NVarChar, question.questionText || question.question_text) // FIX: handle both cases
      .input('question_type', sql.NVarChar, question.questionType || question.question_type) // FIX: handle both cases
      .input('options', sql.NVarChar, question.options || null)
      .input('correct_answer', sql.NVarChar, question.correctAnswer || question.correct_answer) // FIX: handle both cases
      .input('points', sql.Int, question.points || 10)
      .input('time_limit_minutes', sql.Int, question.timeLimitMinutes || question.time_limit_minutes || 5) // FIX
      .input('created_by', sql.Int, question.createdBy || question.created_by) // FIX: handle both cases
      .input('start_date', sql.DateTime, question.startDate || question.start_date || null) // FIX
      .input('end_date', sql.DateTime, question.endDate || question.end_date || null) // FIX
      .input('max_attempts', sql.Int, question.maxAttempts || question.max_attempts || 1) // FIX
      .query(`
        INSERT INTO questions (title, question_text, question_type, options, correct_answer, 
          points, time_limit_minutes, created_by, start_date, end_date, max_attempts)
        OUTPUT INSERTED.*
        VALUES (@title, @question_text, @question_type, @options, @correct_answer,
          @points, @time_limit_minutes, @created_by, @start_date, @end_date, @max_attempts)
      `);
    
    return result.recordset[0];
  }

  async update(id: number, question: Partial<Question>): Promise<void> {
    const pool = await getConnection();
    const request = pool.request().input('id', sql.Int, id);
    
    let setClauses = ['updated_at = GETDATE()'];
    
    if (question.title !== undefined) {
      request.input('title', sql.NVarChar, question.title);
      setClauses.push('title = @title');
    }
    if (question.questionText !== undefined) {
      request.input('questionText', sql.NVarChar, question.questionText);
      setClauses.push('question_text = @questionText');
    }
    if (question.options !== undefined) {
      request.input('options', sql.NVarChar, question.options);
      setClauses.push('options = @options');
    }
    if (question.correctAnswer !== undefined) {
      request.input('correctAnswer', sql.NVarChar, question.correctAnswer);
      setClauses.push('correct_answer = @correctAnswer');
    }
    if (question.points !== undefined) {
      request.input('points', sql.Int, question.points);
      setClauses.push('points = @points');
    }
    if (question.timeLimitMinutes !== undefined) {
      request.input('timeLimitMinutes', sql.Int, question.timeLimitMinutes);
      setClauses.push('time_limit_minutes = @timeLimitMinutes');
    }
    if (question.isActive !== undefined) {
      request.input('isActive', sql.Bit, question.isActive);
      setClauses.push('is_active = @isActive');
    }
    if (question.startDate !== undefined) {
      request.input('startDate', sql.DateTime, question.startDate);
      setClauses.push('start_date = @startDate');
    }
    if (question.endDate !== undefined) {
      request.input('endDate', sql.DateTime, question.endDate);
      setClauses.push('end_date = @endDate');
    }
    if (question.maxAttempts !== undefined) {
      request.input('maxAttempts', sql.Int, question.maxAttempts);
      setClauses.push('max_attempts = @maxAttempts');
    }
    
    await request.query(`UPDATE questions SET ${setClauses.join(', ')} WHERE id = @id`);
  }

  async delete(id: number): Promise<void> {
    const pool = await getConnection();
    await pool
      .request()
      .input('id', sql.Int, id)
      .query('DELETE FROM questions WHERE id = @id');
  }

  // ─── User Answers ────────────────────────────────────────────────────────

  async getAvailableQuestions(userId: number): Promise<Question[]> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT q.*, 
          (SELECT COUNT(*) FROM user_answers ua 
           WHERE ua.question_id = q.id AND ua.user_id = @userId) as attempts_count
        FROM questions q
        WHERE q.is_active = 1
          AND (q.start_date IS NULL OR q.start_date <= GETDATE())
          AND (q.end_date IS NULL OR q.end_date >= GETDATE())
          AND (SELECT COUNT(*) FROM user_answers ua 
               WHERE ua.question_id = q.id AND ua.user_id = @userId) < q.max_attempts
        ORDER BY q.created_at DESC
      `);
    
    return result.recordset;
  }

  async submitAnswer(answer: Partial<UserAnswer>): Promise<UserAnswer> {
    const pool = await getConnection();
    
    // Get question details
    const question = await this.findById(answer.questionId!);
    if (!question) throw new Error('Question not found');
    
    // Check answer
    let isCorrect = false;
    let pointsEarned = 0;
    
    if (question.questionType === 'multiple_choice' || question.questionType === 'true_false') {
      isCorrect = answer.answerText?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
    } else if (question.questionType === 'short_answer') {
      // Simple string matching (bisa ditingkatkan dengan NLP)
      isCorrect = answer.answerText?.toLowerCase().trim().includes(question.correctAnswer.toLowerCase().trim());
    }
    
    pointsEarned = isCorrect ? question.points : 0;
    
    // Get attempt number
    const attemptResult = await pool
      .request()
      .input('userId', sql.Int, answer.userId)
      .input('questionId', sql.Int, answer.questionId)
      .query(`
        SELECT ISNULL(MAX(attempt_number), 0) + 1 as next_attempt
        FROM user_answers
        WHERE user_id = @userId AND question_id = @questionId
      `);
    
    const attemptNumber = attemptResult.recordset[0].next_attempt;
    
    const result = await pool
      .request()
      .input('userId', sql.Int, answer.userId)
      .input('questionId', sql.Int, answer.questionId)
      .input('answerText', sql.NVarChar, answer.answerText)
      .input('isCorrect', sql.Bit, isCorrect)
      .input('pointsEarned', sql.Int, pointsEarned)
      .input('timeSpentSeconds', sql.Int, answer.timeSpentSeconds || null)
      .input('attemptNumber', sql.Int, attemptNumber)
      .query(`
        INSERT INTO user_answers (user_id, question_id, answer_text, is_correct, points_earned, time_spent_seconds, attempt_number)
        OUTPUT INSERTED.*
        VALUES (@userId, @questionId, @answerText, @isCorrect, @pointsEarned, @timeSpentSeconds, @attemptNumber)
      `);
    
    return result.recordset[0];
  }

  async getUserPoints(userId: number): Promise<UserPoints | null> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT * FROM user_points WHERE user_id = @userId
      `);
    
    return result.recordset[0] || {
      userId,
      totalPoints: 0,
      questionsAnswered: 0,
      correctAnswers: 0,
      streakCount: 0,
      lastAnsweredAt: null
    };
  }

  async getLeaderboard(limit: number = 10): Promise<any[]> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('limit', sql.Int, limit)
      .query(`
        SELECT TOP (@limit) 
          up.*, 
          u.full_name, 
          u.member_id,
          u.division,
          u.avatar_url
        FROM user_points up
        JOIN users u ON up.user_id = u.id
        WHERE u.is_active = 1
        ORDER BY up.total_points DESC
      `);
    
    return result.recordset;
  }
}