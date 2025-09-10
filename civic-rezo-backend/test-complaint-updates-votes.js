// Test script to verify the complaint submission flow with updates and votes
const { supabase } = require('./config/supabase');

async function testComplaintWithUpdatesAndVotes() {
  console.log('🧪 Testing complaint submission with updates and votes...');

  // Step 1: Create or get a test user
  console.log('\n1️⃣ Creating test user...');
  const testUserEmail = 'test-user@civicrezo.org';
  
  // Check if test user exists
  const { data: existingUser, error: findError } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', testUserEmail)
    .limit(1);
  
  let userId;
  
  if (existingUser && existingUser.length > 0) {
    userId = existingUser[0].id;
    console.log(`✅ Using existing test user: ${userId}`);
  } else {
    // Create a test user
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert([{
        email: testUserEmail,
        password: 'test-password-hash',
        full_name: 'Test User',
        phone_number: '1234567890',
        user_type: 'citizen',
        address: 'Test Address',
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();
    
    if (userError) {
      console.error('❌ Failed to create test user:', userError);
      return;
    }
    
    userId = newUser[0].id;
    console.log(`✅ Created new test user: ${userId}`);
  }
  
  // Step 2: Submit a test complaint
  console.log('\n2️⃣ Creating test complaint...');
  
  const { data: complaint, error: complaintError } = await supabase
    .from('complaints')
    .insert([{
      title: 'Test Complaint With Updates and Votes',
      description: 'This is a test complaint to verify updates and votes integration',
      category: 'garbage',
      status: 'pending',
      user_id: userId,
      location_latitude: 28.5456,
      location_longitude: 77.1926,
      location_address: 'Test Location',
      priority_score: 0.5,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select();
  
  if (complaintError) {
    console.error('❌ Failed to create test complaint:', complaintError);
    return;
  }
  
  const complaintId = complaint[0].id;
  console.log(`✅ Created test complaint: ${complaintId}`);
  
  // Step 3: Check if complaint_updates entry was created
  console.log('\n3️⃣ Checking complaint_updates entry...');
  
  const { data: updates, error: updatesError } = await supabase
    .from('complaint_updates')
    .select('*')
    .eq('complaint_id', complaintId);
  
  if (updatesError) {
    console.error('❌ Failed to retrieve complaint updates:', updatesError);
  } else if (updates && updates.length > 0) {
    console.log(`✅ Found ${updates.length} update entries:`, updates);
  } else {
    console.log('⚠️ No updates found. Creating manual update entry...');
    
    // Create a manual update entry
    const { data: newUpdate, error: newUpdateError } = await supabase
      .from('complaint_updates')
      .insert([{
        complaint_id: complaintId,
        updated_by_id: userId,
        old_status: null,
        new_status: 'pending',
        update_notes: 'Test update entry',
        created_at: new Date().toISOString()
      }]);
    
    if (newUpdateError) {
      console.error('❌ Failed to create manual update entry:', newUpdateError);
    } else {
      console.log('✅ Created manual update entry');
    }
  }
  
  // Step 4: Check if complaint_votes entry was created
  console.log('\n4️⃣ Checking complaint_votes entry...');
  
  const { data: votes, error: votesError } = await supabase
    .from('complaint_votes')
    .select('*')
    .eq('complaint_id', complaintId);
  
  if (votesError) {
    console.error('❌ Failed to retrieve complaint votes:', votesError);
  } else if (votes && votes.length > 0) {
    console.log(`✅ Found ${votes.length} vote entries:`, votes);
    
    // Check for vote_count column
    const hasVoteCount = votes[0].hasOwnProperty('vote_count');
    console.log(`ℹ️ vote_count column ${hasVoteCount ? 'exists' : 'does not exist'} in complaint_votes table`);
  } else {
    console.log('⚠️ No votes found. Creating manual vote entry...');
    
    try {
      // Try with vote_count
      const { data: newVote, error: newVoteError } = await supabase
        .from('complaint_votes')
        .insert([{
          complaint_id: complaintId,
          user_id: userId,
          vote_type: 'upvote',
          vote_count: 1,
          created_at: new Date().toISOString()
        }]);
      
      if (newVoteError) {
        if (newVoteError.message && newVoteError.message.includes('column "vote_count" of relation "complaint_votes" does not exist')) {
          console.log('⚠️ vote_count column does not exist. Trying without it...');
          
          // Try without vote_count
          const { data: retryVote, error: retryError } = await supabase
            .from('complaint_votes')
            .insert([{
              complaint_id: complaintId,
              user_id: userId,
              vote_type: 'upvote',
              created_at: new Date().toISOString()
            }]);
          
          if (retryError) {
            console.error('❌ Failed to create vote entry (retry):', retryError);
          } else {
            console.log('✅ Created vote entry without vote_count');
          }
        } else {
          console.error('❌ Failed to create vote entry:', newVoteError);
        }
      } else {
        console.log('✅ Created vote entry with vote_count=1');
      }
    } catch (e) {
      console.error('❌ Exception in vote creation:', e);
    }
  }
  
  console.log('\n🏁 Test completed!');
}

// Run the test
testComplaintWithUpdatesAndVotes()
  .then(() => console.log('✨ Test script execution completed'))
  .catch(err => console.error('❌ Uncaught error:', err));
