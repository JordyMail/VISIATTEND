import { getConnection } from './config.js';

async function checkConstraint() {
  const pool = await getConnection();

  // Check CHECK constraints definition
  const checks = await pool.request().query(`
    SELECT cc.name AS constraint_name, cc.definition
    FROM sys.check_constraints cc
    INNER JOIN sys.tables t ON t.object_id = cc.parent_object_id
    WHERE t.name = 'point_logs'
  `);
  console.log('CHECK constraints on point_logs:');
  checks.recordset.forEach(r => {
    console.log('  Name:', r.constraint_name);
    console.log('  Definition:', r.definition);
  });

  process.exit(0);
}

checkConstraint().catch(e => { console.error(e); process.exit(1); });
