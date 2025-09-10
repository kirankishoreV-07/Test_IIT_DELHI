const { supabase } = require('./config/supabase');

async function checkCheckConstraint() {
  try {
    console.log('🔎 Investigating the check constraint issue...');
    
    // 1. Let's try to directly query the check constraint definition
    const { data: checkConstraints, error: checkError } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT constraint_name, check_clause
        FROM information_schema.check_constraints
        WHERE constraint_name = 'complaint_votes_vote_type_check'
      `
    });
    
    if (checkError) {
      console.error('Error querying check constraint:', checkError);
    } else {
      console.log('Check constraint definition:', checkConstraints);
    }
    
    // 2. Let's check what values actually exist in the table
    const { data: existingVotes, error: votesError } = await supabase
      .from('complaint_votes')
      .select('vote_type')
      .limit(10);
      
    if (votesError) {
      console.error('Error querying existing votes:', votesError);
    } else {
      console.log('Existing vote_type values:', existingVotes.map(v => v.vote_type));
      
      // Count occurrences of each value
      const counts = {};
      existingVotes.forEach(vote => {
        counts[vote.vote_type] = (counts[vote.vote_type] || 0) + 1;
      });
      console.log('Vote type counts:', counts);
    }
    
    // 3. Let's try to get the check constraint via SQL using pg_get_constraintdef
    const { data: pgConstraint, error: pgError } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT con.conname AS constraint_name, 
               pg_get_constraintdef(con.oid) AS constraint_definition
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = 'complaint_votes'
          AND con.contype = 'c'
      `
    });
    
    if (pgError) {
      console.error('Error querying pg_constraint:', pgError);
    } else {
      console.log('Constraint definition from pg_get_constraintdef:', pgConstraint);
    }
    
    // 4. Try to extract all column information for this table
    const { data: columnInfo, error: columnError } = await supabase.rpc('execute_sql', {
      sql_query: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'complaint_votes'
        ORDER BY ordinal_position
      `
    });
    
    if (columnError) {
      console.error('Error querying column info:', columnError);
    } else {
      console.log('Column information:');
      columnInfo.forEach(col => {
        console.log(`- ${col.column_name}: ${col.data_type} ${col.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'} ${col.column_default ? 'DEFAULT ' + col.column_default : ''}`);
      });
    }
    
    // 5. Test inserting a simple vote to see what happens
    try {
      console.log('\n🧪 Testing insert with simple values...');
      
      // Get a test complaint ID
      const { data: complaints, error: complaintError } = await supabase
        .from('complaints')
        .select('id')
        .limit(1);
        
      if (complaintError || !complaints || complaints.length === 0) {
        console.error('Could not get a test complaint:', complaintError);
        return;
      }
      
      const complaintId = complaints[0].id;
      const testUserId = 'test-' + Date.now();
      
      console.log(`Using complaint ID: ${complaintId}`);
      console.log(`Using test user ID: ${testUserId}`);
      
      // Test with lowercase 'upvote'
      const { error: insertError } = await supabase
        .from('complaint_votes')
        .insert({
          complaint_id: complaintId,
          user_id: testUserId,
          vote_type: 'upvote'
        });
        
      if (insertError) {
        console.error('Insert failed with lowercase "upvote":', insertError);
      } else {
        console.log('✅ Insert succeeded with lowercase "upvote"!');
      }
      
      // Test with all arguments explicitly provided
      const { error: insertAllError } = await supabase
        .from('complaint_votes')
        .insert({
          id: '00000000-0000-0000-0000-000000000001',
          complaint_id: complaintId,
          user_id: testUserId + '-2',
          vote_type: 'upvote',
          created_at: new Date().toISOString()
        });
        
      if (insertAllError) {
        console.error('Insert failed with all fields:', insertAllError);
      } else {
        console.log('✅ Insert succeeded with all fields!');
      }
      
      // Clean up test data
      await supabase
        .from('complaint_votes')
        .delete()
        .eq('user_id', testUserId);
        
      await supabase
        .from('complaint_votes')
        .delete()
        .eq('user_id', testUserId + '-2');
    } catch (e) {
      console.error('Error in test insert:', e);
    }
  } catch (e) {
    console.error('Unhandled error:', e);
  }
}

checkCheckConstraint().finally(() => process.exit());
