// server/db/repositories/QuestionRepository.ts
import { getConnection, sql } from '../config';

export interface Question {
  id: number;
  title: string;
  questionText: string;
  questionType: string;
  correctAnswer: string;
  points: number;
  isActive: boolean;
  createdBy?: number;
  createdAt: string;
  updatedAt: string;
}

export interface UserAnswer {
  id: number;
  memberId?: string;
  questionId: number;
  answerText: string;
  isCorrect: boolean;
  pointsEarned: number | null;
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
      .input('question_text', sql.NVarChar, question.questionText || (question as any).question_text)
      .input('question_type', sql.NVarChar, question.questionType || (question as any).question_type || 'word_search')
      .input('correct_answer', sql.NVarChar, question.correctAnswer || (question as any).correct_answer)
      .input('points', sql.Int, question.points || 10)
      .input('created_by', sql.Int, question.createdBy || (question as any).created_by)
      .query(`
        INSERT INTO questions (title, question_text, question_type, correct_answer, points, created_by)
        OUTPUT INSERTED.*
        VALUES (@title, @question_text, @question_type, @correct_answer, @points, @created_by)
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
    if (question.correctAnswer !== undefined) {
      request.input('correctAnswer', sql.NVarChar, question.correctAnswer);
      setClauses.push('correct_answer = @correctAnswer');
    }
    if (question.points !== undefined) {
      request.input('points', sql.Int, question.points);
      setClauses.push('points = @points');
    }
    if (question.isActive !== undefined) {
      request.input('isActive', sql.Bit, question.isActive);
      setClauses.push('is_active = @isActive');
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
    const userRes = await pool.request()
      .input('userId', sql.Int, userId)
      .query('SELECT member_id FROM users WHERE id = @userId');
    const memberId = userRes.recordset[0]?.member_id || '';

    const result = await pool
      .request()
      .input('memberId', sql.NVarChar, memberId)
      .query(`
        SELECT q.id, q.question_text, q.question_type, q.correct_answer, q.points, q.is_active,
          (SELECT COUNT(*) FROM user_answers ua
           WHERE ua.question_id = q.id AND ua.member_id = @memberId) as attempts_count
        FROM questions q
        WHERE q.is_active = 1
          AND q.event_id IS NOT NULL
          AND (SELECT COUNT(*) FROM user_answers ua
               WHERE ua.question_id = q.id AND ua.member_id = @memberId) = 0
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
    let pointsEarned: number | null = null;
    
    if (question.questionType === 'multiple_choice' || question.questionType === 'true_false') {
      isCorrect = answer.answerText?.toLowerCase().trim() === question.correctAnswer.toLowerCase().trim();
    } else if (question.questionType === 'short_answer') {
      isCorrect = answer.answerText?.toLowerCase().trim().includes(question.correctAnswer.toLowerCase().trim());
    }
    
    pointsEarned = isCorrect ? 10 : null;
    
    // Resolve member_id from userId
    const userRes = await pool.request()
      .input('userId', sql.Int, (answer as any).userId ?? 0)
      .query('SELECT member_id FROM users WHERE id = @userId');
    const memberId = answer.memberId || userRes.recordset[0]?.member_id || '';

    const result = await pool
      .request()
      .input('memberId', sql.NVarChar, memberId)
      .input('questionId', sql.Int, answer.questionId)
      .input('answerText', sql.NVarChar, answer.answerText)
      .input('isCorrect', sql.Bit, isCorrect)
      .input('pointsEarned', sql.Int, pointsEarned)
      .query(`
        INSERT INTO user_answers (member_id, question_id, answer_text, is_correct, points_earned)
        VALUES (@memberId, @questionId, @answerText, @isCorrect, @pointsEarned);

        SELECT * FROM user_answers WHERE id = SCOPE_IDENTITY();
      `);
    
    return result.recordset[0];
  }

  async getUserPoints(userId: number): Promise<UserPoints | null> {
    const pool = await getConnection();
    const result = await pool
      .request()
      .input('userId', sql.Int, userId)
      .query(`
        SELECT 
          u.id as userId,
          COALESCE(mp.points, 0) as totalPoints,
          (SELECT COUNT(*) FROM user_answers ua WHERE ua.member_id = u.member_id) as questionsAnswered,
          (SELECT COUNT(*) FROM user_answers ua WHERE ua.member_id = u.member_id AND ua.is_correct = 1) as correctAnswers,
          0 as streakCount,
          (SELECT MAX(answered_at) FROM user_answers ua WHERE ua.member_id = u.member_id) as lastAnsweredAt
        FROM users u
        LEFT JOIN member_point mp ON u.member_id = mp.member_id
        WHERE u.id = @userId
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
          mp.points as total_points,
          (SELECT COUNT(*) FROM user_answers ua WHERE ua.member_id = u.member_id) as questions_answered,
          (SELECT COUNT(*) FROM user_answers ua WHERE ua.member_id = u.member_id AND ua.is_correct = 1) as correct_answers,
          0 as streak_count,
          u.id as user_id,
          u.full_name, 
          u.member_id,
          u.division,
          u.avatar_url
        FROM member_point mp
        JOIN users u ON mp.member_id = u.member_id
        WHERE u.is_active = 1
        ORDER BY mp.points DESC
      `);
    
    return result.recordset;
  }
}