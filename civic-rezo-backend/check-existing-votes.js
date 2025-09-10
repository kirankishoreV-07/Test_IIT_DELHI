const { supabase } = require('./config/supabase');

async function getExistingVoteTypes() {
  try {
    console.log('🔍 Checking existing vote types in the database...');
    
    // Get a sample of existing vote records
    const { data, error } = await supabase
      .from('complaint_votes')
      .select('vote_type, vote_count')
      .limit(10);
      
    if (error) {
      console.error('❌ Error getting existing votes:', error);
      return;
    }
    
    console.log(`Found ${data.length} existing votes:`);
    data.forEach((vote, i) => {
      console.log(`${i+1}. vote_type: "${vote.vote_type}", vote_count: ${vote.vote_count}`);
    });
    
    // Now let's try to insert exactly what we see in existing records
    if (data.length > 0) {
      const existingType = data[0].vote_type;
      const existingCount = data[0].vote_count;
      
      console.log(`\n🧪 Testing insertion with exact existing values: vote_type="${existingType}", vote_count=${existingCount}`);
      
      // Get a test complaint ID
      const { data: complaints } = await supabase
        .from('complaints')
        .select('id')
        .limit(1);
        
      if (!complaints || complaints.length === 0) {
        console.log('❌ No complaints found for testing');
        return;
      }
      
      const complaintId = complaints[0].id;
      
      // Generate a test user ID
      const testUserId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
      
      // Try to insert with the existing type
      const { data: insertData, error: insertError } = await supabase
        .from('complaint_votes')
        .insert([{
          complaint_id: complaintId,
          user_id: testUserId,
          vote_type: existingType,
          vote_count: existingCount,
          created_at: new Date().toISOString()
        }])
        .select();
        
      if (insertError) {
        console.log(`❌ Insert failed: ${insertError.message}`);
      } else {
        console.log(`✅ Insert succeeded! New record:`, insertData[0]);
        
        // Clean up
        await supabase
          .from('complaint_votes')
          .delete()
          .eq('user_id', testUserId);
      }
    }
    
    // Now let's try to update an existing vote
    if (data.length > 0) {
      const existingId = data[0].id;
      
      console.log(`\n🧪 Testing update of existing vote (id: ${existingId})...`);
      console.log(`Original vote_type: "${data[0].vote_type}"`);
      
      // Try to update with a different vote_type
      const newType = data[0].vote_type === 'upvote' ? 'downvote' : 'upvote';
      
      console.log(`Attempting to change to: "${newType}"`);
      
      const { data: updateData, error: updateError } = await supabase
        .from('complaint_votes')
        .update({ vote_type: newType })
        .eq('id', existingId)
        .select();
        
      if (updateError) {
        console.log(`❌ Update failed: ${updateError.message}`);
      } else {
        console.log(`✅ Update succeeded!`, updateData[0]);
        
        // Revert change
        await supabase
          .from('complaint_votes')
          .update({ vote_type: data[0].vote_type })
          .eq('id', existingId);
      }
    }
    
    // Try to get the exact check constraint definition
    try {
      console.log('\n🔍 Trying to get constraint definition from pg_catalog...');
      
      const { data: pgData, error: pgError } = await supabase
        .from('pg_catalog')
        .select('*')
        .limit(1);
        
      if (pgError) {
        console.log(`❌ Cannot query pg_catalog: ${pgError.message}`);
      } else {
        console.log(`✅ pg_catalog query result:`, pgData);
      }
    } catch (e) {
      console.log(`❌ pg_catalog access error:`, e.message);
    }
    
  } catch (e) {
    console.error('❌ Unhandled error:', e);
  }
}

getExistingVoteTypes().finally(() => process.exit());
