// Script to deploy the create_demo_user function to Supabase
const fs = require('fs');
const path = require('path');
const { supabase } = require('./config/supabase');

async function deployFunction() {
  try {
    console.log('📦 Deploying SQL function to Supabase...');
    
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'create_demo_user.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Execute the SQL via RPC
    const { data, error } = await supabase.rpc('execute_sql', {
      sql_query: sqlContent
    });
    
    if (error) {
      console.error('❌ Error deploying function:', error);
      
      // Try alternative approach with raw SQL
      console.log('⚠️ Attempting direct SQL execution...');
      try {
        // Direct SQL execution
        const { data: result, error: sqlError } = await supabase.auth.admin.executeRawSQL(sqlContent);
        
        if (sqlError) {
          throw new Error(`SQL execution error: ${sqlError.message}`);
        }
        
        console.log('✅ Function deployed successfully using direct SQL!');
        return true;
      } catch (sqlExecError) {
        console.error('❌ Direct SQL execution failed:', sqlExecError);
        
        // Final fallback - add instructions for manual execution
        console.log('\n🔧 MANUAL DEPLOYMENT REQUIRED 🔧');
        console.log('Please execute the following SQL in the Supabase SQL Editor:');
        console.log('-----------------------------------------------------------');
        console.log(sqlContent);
        console.log('-----------------------------------------------------------');
        return false;
      }
    }
    
    console.log('✅ Function deployed successfully!', data);
    return true;
  } catch (err) {
    console.error('❌ Deployment failed:', err);
    return false;
  }
}

// Execute the deployment
deployFunction().then(success => {
  if (success) {
    console.log('✨ SQL function deployment complete!');
  } else {
    console.log('⚠️ SQL function deployment was not successful.');
    console.log('Please check the logs above for manual deployment instructions.');
  }
});
