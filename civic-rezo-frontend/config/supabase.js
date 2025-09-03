import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://edragfuoklcgdgtospuq.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkcmFnZnVva2xjZ2RndG9zcHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NDE3MjMsImV4cCI6MjA3MjExNzcyM30.A58Ms03zTZC6J5OuhQbkkZQy-5uTxgu4vlLilrjPEwo';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Dynamic API URL configuration for any device/network
const getApiBaseUrl = () => {
  // Backend default port (matches backend/server.js)
  const PORT = Number(process.env.EXPO_PUBLIC_API_PORT || 3001);
  
  if (!__DEV__) {
    // Production mode - use environment variable or fallback
    return process.env.EXPO_PUBLIC_API_URL 
      ? `${process.env.EXPO_PUBLIC_API_URL}/api`
      : 'https://your-production-api.com/api';
  }

  // Development mode - auto-detect the best URL based on platform
  if (Platform.OS === 'web') {
    // Web platform - use localhost
    return `http://localhost:${PORT}/api`;
  }

  // Mobile platforms (iOS/Android)
  let hostUrl;
  
  // Try to get the development server URL from Expo
  const manifest = Constants.expoConfig || Constants.manifest; // support older/newer Expo
  const debuggerHost = manifest?.hostUri || manifest?.developer?.hostUri;
  
  if (debuggerHost) {
    // Extract IP from debuggerHost (format: "192.168.x.x:19000")
    const host = debuggerHost.split(':')[0];
    hostUrl = `http://${host}:${PORT}/api`;
  } else {
    // Fallback IPs for common network configurations
    const fallbackIPs = [
      // Put your LAN IP first if you know it; we'll try a common private range as a sensible default
      '192.168.1.100',
      '192.168.1.1',    // Common router IP
      '192.168.0.1',    // Alternative router IP
      '10.0.0.1',       // Corporate network
      'localhost'       // Last resort
    ];
    
    // Use the first IP as primary (your current network)
    hostUrl = `http://${fallbackIPs[0]}:${PORT}/api`;
  }
  
  return hostUrl;
};

// API configuration - Works on any device
export const API_BASE_URL = getApiBaseUrl();

console.log('🔗 API_BASE_URL configured as:', API_BASE_URL);
console.log('📱 Platform:', Platform.OS);
console.log('🔧 Development mode:', __DEV__);

export const apiClient = {
  // Auth endpoints
  auth: {
    login: `${API_BASE_URL}/auth/login`,
    signup: `${API_BASE_URL}/auth/signup`,
    profile: `${API_BASE_URL}/auth/profile`,
  },
  // Complaint endpoints
  complaints: {
    all: `${API_BASE_URL}/complaints/all`,
    create: `${API_BASE_URL}/complaints/create`,
  },
  // Admin endpoints
  admin: {
    dashboard: `${API_BASE_URL}/admin/dashboard`,
  },
};

// Enhanced API call function with auto-discovery
export const makeApiCall = async (url, options = {}) => {
  try {
    console.log('📡 Making API call to:', url);
    
    const token = await AsyncStorage.getItem('authToken');
    
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    };

    const mergedOptions = {
      ...defaultOptions,
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...options.headers,
      },
    };

    console.log('📤 Request details:', {
      url,
      method: mergedOptions.method || 'GET',
      headers: mergedOptions.headers,
      body: mergedOptions.body ? 'DATA_PRESENT' : 'NO_BODY'
    });

    const response = await fetch(url, mergedOptions);
    console.log('📥 Response status:', response.status);
    
    const data = await response.json();
    console.log('📋 Response data:', data);

    if (!response.ok) {
      console.error('❌ API Error:', data);
      throw new Error(data.message || `HTTP ${response.status}: API call failed`);
    }

    return data;
  } catch (error) {
    console.error('🚨 API call error details:', {
      message: error.message,
      url,
      stack: error.stack
    });
    
    // Provide more specific error messages
    if (error.message.includes('Network request failed')) {
      throw new Error('Cannot connect to server. Make sure the backend is running and accessible.');
    }
    
    throw error;
  }
};
