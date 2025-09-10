const { supabase } = require('./config/supabase');

async function testVoteTypes() {
  console.log('🧪 Testing vote_type case sensitivity issue...');
  
  try {
    // Get a complaint ID for testing
    const { data: complaints } = await supabase
      .from('complaints')
      .select('id')
      .limit(1);
      
    if (!complaints || complaints.length === 0) {
      console.log('❌ No complaints found for testing');
      return;
    }
    
    const complaintId = complaints[0].id;
    
    // Generate a test user ID with proper UUID format
    const generateUuid = () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    };
    
    const testUserId = generateUuid();
    
    console.log(`Testing with complaint ID: ${complaintId}`);
    console.log(`Using test user ID: ${testUserId}`);
    
    // Try different case variations of 'upvote'
    const testValues = [
      'upvote',        // lowercase
      'UPVOTE',        // uppercase
      'Upvote',        // title case
      'UpVote',        // camel case
      'up_vote',       // with underscore
      'up vote',       // with space
    ];
    
    // Try each value
    for (const value of testValues) {
      console.log(`\nTesting vote_type: "${value}"`);
      
      const { data, error } = await supabase
        .from('complaint_votes')
        .insert([{
          complaint_id: complaintId,
          user_id: testUserId,
          vote_type: value,
          vote_count: 1,
          created_at: new Date().toISOString()
        }])
        .select();
      
      if (error) {
        console.log(`❌ Failed with error: ${error.message}`);
        
        // Try without vote_count if that's causing issues
        if (error.message.includes('vote_count')) {
          console.log('   Trying without vote_count...');
          
          const { data: data2, error: error2 } = await supabase
            .from('complaint_votes')
            .insert([{
              complaint_id: complaintId,
              user_id: testUserId,
              vote_type: value,
              created_at: new Date().toISOString()
            }])
            .select();
            
          if (error2) {
            console.log(`   ❌ Still failed: ${error2.message}`);
          } else {
            console.log(`   ✅ Success without vote_count!`);
            
            // Clean up
            await supabase
              .from('complaint_votes')
              .delete()
              .eq('user_id', testUserId);
          }
        }
      } else {
        console.log(`✅ Success with "${value}"!`);
        
        // Clean up
        await supabase
          .from('complaint_votes')
          .delete()
          .eq('user_id', testUserId);
      }
    }
    
    // Try again with the same user ID to test unique constraint
    console.log('\nTesting for duplicate user/complaint combination...');
    
    // First insert with a working value
    await supabase
      .from('complaint_votes')
      .insert([{
        complaint_id: complaintId,
        user_id: testUserId,
        vote_type: 'upvote',
        vote_count: 1,
        created_at: new Date().toISOString()
      }]);
      
    // Then try again with the same user/complaint
    const { error: duplicateError } = await supabase
      .from('complaint_votes')
      .insert([{
        complaint_id: complaintId,
        user_id: testUserId,
        vote_type: 'upvote',
        vote_count: 1,
        created_at: new Date().toISOString()
      }]);
      
    if (duplicateError) {
      console.log(`✅ As expected, duplicate failed: ${duplicateError.message}`);
    } else {
      console.log(`❓ Unexpected: Duplicate insert succeeded!`);
    }
    
    // Clean up test data
    await supabase
      .from('complaint_votes')
      .delete()
      .eq('user_id', testUserId);
      
    console.log('\n✅ Test completed!');
  } catch (e) {
    console.error('❌ Unhandled error:', e);
  }
}

testVoteTypes().finally(() => process.exit());
