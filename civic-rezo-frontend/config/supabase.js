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
  const PORT = Number(process.env.EXPO_PUBLIC_API_PORT || 3001);
  if (!__DEV__) {
    return process.env.EXPO_PUBLIC_API_URL 
      ? `${process.env.EXPO_PUBLIC_API_URL}`
      : 'https://your-production-api.com';
  }
  if (Platform.OS === 'web') {
    return `http://localhost:${PORT}`;
  }
  // Mobile platforms (iOS/Android)
  const manifest = Constants.expoConfig || Constants.manifest;
  const debuggerHost = manifest?.hostUri || manifest?.developer?.hostUri;
  if (debuggerHost) {
    const host = debuggerHost.split(':')[0];
    return `http://${host}:${PORT}`;
  } else {
    const fallbackIPs = [
      '192.168.1.100',
      '192.168.1.1',
      '192.168.0.1',
      '10.0.0.1',
      'localhost'
    ];
    return `http://${fallbackIPs[0]}:${PORT}`;
  }
};

export const API_BASE_URL = getApiBaseUrl();

// API endpoints
export const API_ENDPOINTS = {
  complaints: {
    all: `${API_BASE_URL}/complaints/all`,
    create: `${API_BASE_URL}/complaints/create`,
  },
  admin: {
    dashboard: `${API_BASE_URL}/admin/dashboard`,
  },
  transcribe: {
    audio: `${API_BASE_URL}/transcribe/audio`,
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
