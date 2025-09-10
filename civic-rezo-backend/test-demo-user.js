// Test script for ensuring the demo user creation works properly
const { supabase } = require('./config/supabase');

async function testDemoUserCreation() {
  console.log('🧪 Testing demo user creation functionality...');

  // Step 1: Check if a demo user already exists
  console.log('\n1️⃣ Checking for existing demo user...');
  const { data: existingUser, error: findError } = await supabase
    .from('users')
    .select('id, email, full_name, user_type')
    .eq('email', 'demo@civicrezo.org')
    .limit(1);
  
  if (findError) {
    console.error('❌ Error checking for demo user:', findError);
    return false;
  }
  
  // If demo user exists, delete it for a clean test
  if (existingUser && existingUser.length > 0) {
    console.log('ℹ️ Found existing demo user:', existingUser[0]);
    console.log('🔄 Deleting existing demo user for clean test...');
    
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', existingUser[0].id);
    
    if (deleteError) {
      console.error('❌ Error deleting demo user:', deleteError);
      console.log('⚠️ Test will continue with existing user');
    } else {
      console.log('✅ Demo user deleted successfully');
    }
  } else {
    console.log('ℹ️ No existing demo user found');
  }
  
  // Step 2: Test the direct insert method
  console.log('\n2️⃣ Testing direct insert method...');
  
  const demoUuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
  
  const { data: insertedUser, error: insertError } = await supabase
    .from('users')
    .insert([{
      id: demoUuid,
      email: 'demo@civicrezo.org',
      password: 'test-password-hash',
      full_name: 'Demo User',
      phone_number: '1234567890',
      user_type: 'citizen',
      address: 'Demo Address',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }])
    .select();
  
  if (insertError) {
    console.error('❌ Direct insert failed:', insertError);
    console.log('⚠️ Moving to next method...');
  } else {
    console.log('✅ Direct insert successful:', insertedUser[0]);
    console.log('🔄 Deleting user for next test...');
    
    await supabase
      .from('users')
      .delete()
      .eq('id', insertedUser[0].id);
  }
  
  // Step 3: Test the RPC function method
  console.log('\n3️⃣ Testing RPC function method...');
  
  try {
    const { data: demoId, error: rpcError } = await supabase.rpc('create_demo_user');
    
    if (rpcError) {
      console.error('❌ RPC function call failed:', rpcError);
      console.log('⚠️ You may need to deploy the RPC function first using the deploy-function.js script');
    } else {
      console.log('✅ RPC function call successful:', demoId);
      
      // Verify the user exists
      const { data: createdUser } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('id', demoId)
        .single();
      
      if (createdUser) {
        console.log('✅ Verified user exists in database:', createdUser);
      }
    }
  } catch (e) {
    console.error('❌ RPC function test error:', e);
  }
  
  // Step 4: Test complaint submission with the demo user
  console.log('\n4️⃣ Testing complaint submission with demo user...');
  
  // Get the demo user (if it exists now)
  const { data: demoUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'demo@civicrezo.org')
    .limit(1);
  
  if (demoUser && demoUser.length > 0) {
    console.log('ℹ️ Using demo user ID:', demoUser[0].id);
    
    // Test complaint insertion
    const { data: complaint, error: complaintError } = await supabase
      .from('complaints')
      .insert([{
        title: 'Test Complaint',
        description: 'This is a test complaint from the demo user',
        category: 'garbage',
        status: 'pending',
        user_id: demoUser[0].id,
        location_latitude: 28.5456,
        location_longitude: 77.1926,
        location_address: 'Test Location',
        priority_score: 0.5,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select();
    
    if (complaintError) {
      console.error('❌ Complaint insertion failed:', complaintError);
    } else {
      console.log('✅ Complaint insertion successful:', complaint[0].id);
    }
  } else {
    console.log('❌ No demo user found for complaint test');
  }
  
  console.log('\n🏁 Test completed!');
}

// Run the test
testDemoUserCreation()
  .then(() => console.log('✨ Test script execution completed'))
  .catch(err => console.error('❌ Uncaught error:', err));
