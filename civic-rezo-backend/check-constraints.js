const { supabase } = require('./config/supabase');

async function run() {
  try {
    console.log('🔍 Checking schema constraints directly...');
    
    // Use RPC or direct SQL to check the constraint
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT
          conname AS constraint_name,
          pg_get_constraintdef(oid) AS constraint_definition
        FROM
          pg_constraint
        WHERE
          conrelid = 'complaint_votes'::regclass AND
          contype = 'c';
      `
    });
    
    if (error) {
      console.error('Error checking constraints:', error);
    } else {
      console.log('Check constraints on complaint_votes table:');
      console.log(data);
    }
    
    // Also check the column definitions
    const { data: columns, error: columnsError } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'complaint_votes';
      `
    });
    
    if (columnsError) {
      console.error('Error checking columns:', columnsError);
    } else {
      console.log('\nColumn definitions in complaint_votes table:');
      console.log(columns);
    }
    
    // Check for existing values
    const { data: votes, error: votesError } = await supabase
      .from('complaint_votes')
      .select('vote_type')
      .limit(10);
      
    if (votesError) {
      console.error('Error fetching votes:', votesError);
    } else {
      console.log('\nExisting vote_type values:');
      console.log(votes.map(v => v.vote_type));
    }
    
  } catch (e) {
    console.error('Error:', e);
  }
}

run();
