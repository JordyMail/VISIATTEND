import { getConnection } from './config.js';

async function fixPointLogsTypeConstraint() {
  const pool = await getConnection();

  console.log('🔧 Fixing CHECK constraint on point_logs.type...');

  // Drop old constraint first
  await pool.request().query(`
    IF EXISTS (
      SELECT 1 FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID('point_logs')
        AND name LIKE '%type%'
    )
    BEGIN
      DECLARE @constraintName NVARCHAR(200);
      SELECT @constraintName = name
      FROM sys.check_constraints
      WHERE parent_object_id = OBJECT_ID('point_logs')
        AND name LIKE '%type%';
      EXEC('ALTER TABLE point_logs DROP CONSTRAINT [' + @constraintName + ']');
    END
  `);

  console.log('✅ Old constraint dropped.');

  // Add new constraint that includes 'question'
  await pool.request().query(`
    ALTER TABLE point_logs
    ADD CONSTRAINT CK_point_logs_type
    CHECK ([type] IN ('attendance', 'quiz', 'question'));
  `);

  console.log('✅ New constraint added: attendance | quiz | question');

  // Verify
  const result = await pool.request().query(`
    SELECT cc.name, cc.definition
    FROM sys.check_constraints cc
    INNER JOIN sys.tables t ON t.object_id = cc.parent_object_id
    WHERE t.name = 'point_logs'
  `);
  console.log('Current constraints:', result.recordset);

  process.exit(0);
}

fixPointLogsTypeConstraint().catch(e => {
  console.error('❌ Failed:', e.message);
  process.exit(1);
});
