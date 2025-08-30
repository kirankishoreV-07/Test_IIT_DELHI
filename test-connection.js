// Test script to verify Supabase connection and API endpoints
const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

// Sample test data
const testUsers = [
  {
    fullName: 'John Citizen',
    email: 'john.citizen@example.com',
    phoneNumber: '+91-9876543210',
    password: 'password123',
    userType: 'citizen',
    address: '123 Main Street, New Delhi'
  },
  {
    fullName: 'Admin User',
    email: 'admin@civic.gov',
    phoneNumber: '+91-9876543211',
    password: 'admin123',
    userType: 'admin',
    address: 'Municipal Corporation Office, Delhi'
  }
];

async function testSignup(userData) {
  try {
    console.log(`\n🔄 Testing signup for: ${userData.email}`);
    const response = await axios.post(`${API_BASE_URL}/auth/signup`, userData);
    
    if (response.data.success) {
      console.log('✅ Signup successful!');
      console.log('📄 User data:', {
        id: response.data.data.user.id,
        email: response.data.data.user.email,
        userType: response.data.data.user.userType
      });
      console.log('🔑 Token received:', response.data.data.token ? 'Yes' : 'No');
      return response.data.data;
    }
  } catch (error) {
    if (error.response?.data?.message === 'User already exists with this email') {
      console.log('ℹ️  User already exists, trying login instead...');
      return await testLogin({ email: userData.email, password: userData.password });
    } else {
      console.log('❌ Signup failed:', error.response?.data?.message || error.message);
      return null;
    }
  }
}

async function testLogin(credentials) {
  try {
    console.log(`\n🔄 Testing login for: ${credentials.email}`);
    const response = await axios.post(`${API_BASE_URL}/auth/login`, credentials);
    
    if (response.data.success) {
      console.log('✅ Login successful!');
      console.log('📄 User data:', {
        id: response.data.data.user.id,
        email: response.data.data.user.email,
        userType: response.data.data.user.userType
      });
      console.log('🔑 Token received:', response.data.data.token ? 'Yes' : 'No');
      return response.data.data;
    }
  } catch (error) {
    console.log('❌ Login failed:', error.response?.data?.message || error.message);
    return null;
  }
}

async function testProfile(token) {
  try {
    console.log('\n🔄 Testing profile endpoint...');
    const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.data.success) {
      console.log('✅ Profile fetch successful!');
      console.log('📄 Profile data:', response.data.data.user);
      return true;
    }
  } catch (error) {
    console.log('❌ Profile fetch failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testComplaints() {
  try {
    console.log('\n🔄 Testing complaints endpoint...');
    const response = await axios.get(`${API_BASE_URL}/complaints/all`);
    
    if (response.data.success) {
      console.log('✅ Complaints fetch successful!');
      console.log(`📄 Found ${response.data.data.length} complaints`);
      return true;
    }
  } catch (error) {
    console.log('❌ Complaints fetch failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function testAdminDashboard() {
  try {
    console.log('\n🔄 Testing admin dashboard endpoint...');
    const response = await axios.get(`${API_BASE_URL}/admin/dashboard`);
    
    if (response.data.success) {
      console.log('✅ Admin dashboard fetch successful!');
      console.log('📄 Dashboard data:', response.data.data);
      return true;
    }
  } catch (error) {
    console.log('❌ Admin dashboard fetch failed:', error.response?.data?.message || error.message);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting CivicStack API Tests...');
  console.log('=' .repeat(50));
  
  let citizenData = null;
  let adminData = null;
  
  // Test signup/login for citizen
  citizenData = await testSignup(testUsers[0]);
  
  // Test signup/login for admin
  adminData = await testSignup(testUsers[1]);
  
  // Test profile endpoints
  if (citizenData?.token) {
    await testProfile(citizenData.token);
  }
  
  if (adminData?.token) {
    await testProfile(adminData.token);
  }
  
  // Test other endpoints
  await testComplaints();
  await testAdminDashboard();
  
  console.log('\n' + '=' .repeat(50));
  console.log('🎯 Test Summary:');
  console.log('✅ If you see green checkmarks above, Supabase connection is working!');
  console.log('❌ If you see red X marks, there might be connection issues.');
  console.log('\n💡 Next steps:');
  console.log('1. Run the database schema in your Supabase SQL Editor');
  console.log('2. Check your Supabase project URL and API key');
  console.log('3. Ensure RLS policies are configured correctly');
}

// Run the tests
runTests().catch(console.error);
