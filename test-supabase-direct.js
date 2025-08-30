// Direct Supabase connection test
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://edragfuoklcgdgtospuq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkcmFnZnVva2xjZ2RndG9zcHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NDE3MjMsImV4cCI6MjA3MjExNzcyM30.A58Ms03zTZC6J5OuhQbkkZQy-5uTxgu4vlLilrjPEwo';

async function testSupabaseConnection() {
  console.log('🔍 Testing direct Supabase connection...');
  console.log('📍 URL:', supabaseUrl);
  console.log('🔑 Key:', supabaseKey.substring(0, 20) + '...');
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Test 1: Check if we can connect to Supabase
    console.log('\n1️⃣ Testing basic connection...');
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (error) {
      if (error.message.includes('relation "users" does not exist')) {
        console.log('❌ Tables do not exist yet');
        console.log('🔧 Solution: You need to run the database schema first!');
        console.log('\n📋 Steps to fix:');
        console.log('1. Go to your Supabase project dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Copy and paste the contents of database-schema.sql');
        console.log('4. Run the SQL commands');
        return false;
      } else {
        console.log('❌ Connection error:', error.message);
        return false;
      }
    } else {
      console.log('✅ Connection successful!');
      console.log('📊 Current user count:', data || 0);
    }
    
    // Test 2: Check available tables
    console.log('\n2️⃣ Checking available tables...');
    const { data: tables, error: tablesError } = await supabase
      .rpc('get_schema_tables');
    
    if (tablesError) {
      console.log('ℹ️  Could not fetch table list (this is normal if tables don\'t exist yet)');
    } else {
      console.log('📋 Available tables:', tables);
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ Unexpected error:', error.message);
    return false;
  }
}

async function testAuth() {
  console.log('\n3️⃣ Testing Supabase Auth...');
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Test Supabase built-in auth
    const { data, error } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'password123'
    });
    
    if (error) {
      console.log('ℹ️  Auth test info:', error.message);
    } else {
      console.log('✅ Supabase Auth is working');
      console.log('👤 Test user created:', data.user?.email);
    }
  } catch (error) {
    console.log('ℹ️  Auth test completed with info:', error.message);
  }
}

async function main() {
  console.log('🚀 CivicStack Supabase Connection Test');
  console.log('=' .repeat(50));
  
  const connectionOk = await testSupabaseConnection();
  await testAuth();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🎯 Summary:');
  if (connectionOk) {
    console.log('✅ Supabase connection is working!');
    console.log('✅ Your credentials are correct');
    console.log('📋 Next: Run the database schema to create tables');
  } else {
    console.log('❌ Supabase connection issues detected');
    console.log('🔧 Please check your credentials and run the database schema');
  }
  
  console.log('\n💡 To set up the database:');
  console.log('1. Open https://edragfuoklcgdgtospuq.supabase.co');
  console.log('2. Go to SQL Editor');
  console.log('3. Run the contents of database-schema.sql');
  console.log('4. Then run this test again');
}

main().catch(console.error);
