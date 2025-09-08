// Load environment variables from the project .env (no hardcoded absolute paths)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createClient } = require('@supabase/supabase-js');

// Debug environment variables
console.log('🔧 Environment Debug:', {
    ROBOFLOW_API_KEY: process.env.ROBOFLOW_API_KEY ? 'SET' : 'NOT SET',
    ROBOFLOW_WORKSPACE: process.env.ROBOFLOW_WORKSPACE,
    ROBOFLOW_WORKFLOW: process.env.ROBOFLOW_WORKFLOW,
    ROBOFLOW_API_URL: process.env.ROBOFLOW_API_URL,
    PORT: process.env.PORT
});

// Ensure JWT secret exists in dev to avoid crashes
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'dev-secret-change-me';
}

const app = express();
const PORT = process.env.PORT || 3001;

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://edragfuoklcgdgtospuq.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkcmFnZnVva2xjZ2RndG9zcHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NDE3MjMsImV4cCI6MjA3MjExNzcyM30.A58Ms03zTZC6J5OuhQbkkZQy-5uTxgu4vlLilrjPEwo';

const supabase = createClient(supabaseUrl, supabaseKey);

// Make supabase available to routes
app.set('supabase', supabase);

// Middleware
app.use(helmet());
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/image-analysis', require('./routes/imageAnalysis'));
app.use('/cloudinary', require('./routes/cloudinary'));
app.use('/api/location-priority', require('./routes/locationPriority'));
app.use('/api/heat-map', require('./routes/heatMap'));
app.use('/transcribe', require('./routes/transcription'));
app.use('/api/transcribe', require('./routes/transcribe'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'CivicStack Backend Server is running',
    timestamp: new Date().toISOString()
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to CivicStack API',
    version: '1.0.0',
    endpoints: [
      '/api/auth - Authentication routes',
      '/api/complaints - Complaint management',
      '/api/admin - Admin dashboard',
      '/health - Health check'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
  error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 CivicStack Backend Server is running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📱 Mobile access: http://192.168.29.237:${PORT}/health`);
  console.log(`📱 API endpoints: http://192.168.29.237:${PORT}/api`);
});

module.exports = app;
