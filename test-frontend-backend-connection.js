#!/usr/bin/env node

/**
 * Test script to verify frontend-backend connection
 * This simulates API calls that the React Native app would make
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testConnection() {
    console.log('🔗 Testing Frontend-Backend Connection...\n');

    try {
        // Test 1: Health check
        console.log('1. Testing backend health...');
        const healthResponse = await axios.get('http://localhost:3001/health');
        console.log('✅ Backend is healthy:', healthResponse.data.message);

        // Test 2: Test signup endpoint
        console.log('\n2. Testing signup endpoint...');
        const signupData = {
            email: 'test.user@example.com',
            password: 'password123',
            fullName: 'Test User',
            phoneNumber: '+91-9876543210',
            userType: 'citizen',
            address: '123 Test Street, Test City'
        };

        try {
            const signupResponse = await axios.post(`${API_BASE_URL}/auth/signup`, signupData);
            console.log('✅ Signup successful:', signupResponse.data.message);
            
            // Test 3: Test login endpoint
            console.log('\n3. Testing login endpoint...');
            const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
                email: signupData.email,
                password: signupData.password
            });
            console.log('✅ Login successful:', loginResponse.data.message);

            const token = loginResponse.data.token;

            // Test 4: Test authenticated endpoint
            console.log('\n4. Testing authenticated profile endpoint...');
            const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('✅ Profile fetch successful:', profileResponse.data.user.email);

            // Test 5: Test complaints endpoint
            console.log('\n5. Testing complaints endpoint...');
            const complaintsResponse = await axios.get(`${API_BASE_URL}/complaints/all`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('✅ Complaints fetch successful:', `Found ${complaintsResponse.data.complaints.length} complaints`);

        } catch (error) {
            if (error.response && error.response.status === 400 && error.response.data.message.includes('already exists')) {
                console.log('ℹ️  User already exists, testing login...');
                
                const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
                    email: signupData.email,
                    password: signupData.password
                });
                console.log('✅ Login successful:', loginResponse.data.message);

                const token = loginResponse.data.token;

                // Test authenticated endpoints
                const profileResponse = await axios.get(`${API_BASE_URL}/auth/profile`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log('✅ Profile fetch successful:', profileResponse.data.user.email);

                const complaintsResponse = await axios.get(`${API_BASE_URL}/complaints/all`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                console.log('✅ Complaints fetch successful:', `Found ${complaintsResponse.data.complaints.length} complaints`);
            } else {
                throw error;
            }
        }

        console.log('\n🎉 All tests passed! Frontend-Backend connection is working perfectly.');
        console.log('\n📱 Your React Native app should now be able to connect to the backend.');
        console.log('🔗 Backend running on: http://localhost:3001');
        console.log('📱 Frontend running on: exp://192.168.29.212:8082');

    } catch (error) {
        console.error('❌ Connection test failed:', error.response?.data || error.message);
        process.exit(1);
    }
}

// Run the test
testConnection();
