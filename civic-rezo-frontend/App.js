import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

// Import screens
import WelcomeScreen from './src/screens/auth/WelcomeScreen';
import CitizenAuthScreen from './src/screens/auth/CitizenAuthScreen';
import AdminAuthScreen from './src/screens/auth/AdminAuthScreen';
import CitizenLoginScreen from './src/screens/auth/CitizenLoginScreen';
import AdminLoginScreen from './src/screens/auth/AdminLoginScreen';
import CitizenSignupScreen from './src/screens/auth/CitizenSignupScreen';
import AdminSignupScreen from './src/screens/auth/AdminSignupScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import CitizenDashboard from './src/screens/citizen/CitizenDashboard';
import AdminDashboard from './src/screens/admin/AdminDashboard';
import SubmitComplaintScreen from './src/screens/complaint/SubmitComplaintScreen';
import ComplaintMapScreen from './src/screens/citizen/ComplaintMapScreen';

const Stack = createStackNavigator();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userType, setUserType] = useState(null);

  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      const token = await AsyncStorage.getItem('authToken');
      const userData = await AsyncStorage.getItem('userData');
      
      if (token && userData) {
        const user = JSON.parse(userData);
        setIsAuthenticated(true);
        setUserType(user.userType);
      }
    } catch (error) {
      console.error('Error checking auth state:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2E7D32" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
        }}
        initialRouteName={
          isAuthenticated 
            ? userType === 'admin' 
              ? 'AdminDashboard' 
              : 'CitizenDashboard'
            : 'Welcome'
        }
      >
        {/* Welcome & Auth Selection Screens */}
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="CitizenAuth" component={CitizenAuthScreen} />
        <Stack.Screen name="AdminAuth" component={AdminAuthScreen} />
        
        {/* Citizen Auth Screens */}
        <Stack.Screen name="CitizenLogin" component={CitizenLoginScreen} />
        <Stack.Screen name="CitizenSignup" component={CitizenSignupScreen} />
        
        {/* Admin Auth Screens */}
        <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
        <Stack.Screen name="AdminSignup" component={AdminSignupScreen} />
        
        {/* Legacy Auth Screens (for backward compatibility) */}
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Signup" component={SignupScreen} />
        
        {/* Citizen Screens */}
        <Stack.Screen name="CitizenDashboard" component={CitizenDashboard} />
        <Stack.Screen name="SubmitComplaint" component={SubmitComplaintScreen} />
        <Stack.Screen name="ComplaintMap" component={ComplaintMapScreen} />
        
        {/* Admin Screens */}
        <Stack.Screen name="AdminDashboard" component={AdminDashboard} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
