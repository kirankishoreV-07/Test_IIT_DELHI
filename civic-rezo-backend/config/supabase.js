const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL || 'https://edragfuoklcgdgtospuq.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkcmFnZnVva2xjZ2RndG9zcHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NDE3MjMsImV4cCI6MjA3MjExNzcyM30.A58Ms03zTZC6J5OuhQbkkZQy-5uTxgu4vlLilrjPEwo';

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = {
  supabase,
  supabaseUrl,
  supabaseKey
};
