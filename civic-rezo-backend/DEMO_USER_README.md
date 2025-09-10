# Demo User Creation System for Civic Rezo

This implementation addresses the foreign key constraint issue when submitting complaints by ensuring a valid demo user always exists in the database before complaint submission.

## Key Components

### 1. SQL Function for Demo User Creation

The `create_demo_user.sql` file contains a SQL function that can be deployed to Supabase to create a demo user with a valid UUID. This function:

- Generates a random UUID
- Creates a demo user with standardized fields
- Returns the UUID for reference
- Uses `SECURITY DEFINER` to ensure it runs with appropriate permissions

### 2. Updated Complaint Submission Logic

The `complaints.js` route handler has been enhanced with robust error handling and fallback mechanisms:

- First checks if a demo user exists
- If not, tries multiple methods to create one:
  1. Calls the `create_demo_user` RPC function (if available)
  2. Falls back to direct SQL execution
  3. As a last resort, uses the standard Supabase insert

### 3. Deployment Script

The `deploy-function.js` script helps deploy the SQL function to Supabase:

- Reads the SQL file content
- Attempts to execute it via Supabase RPC
- Falls back to alternative methods if needed
- Provides manual instructions if all automated methods fail

### 4. Testing Script

The `test-demo-user.js` script verifies that the demo user creation works:

- Tests direct insertion
- Tests the RPC function method
- Verifies a complaint can be submitted with the demo user
- Provides detailed logging for troubleshooting

## How to Use

1. **Deploy the SQL Function:**
   ```
   node deploy-function.js
   ```

2. **Test the Demo User Creation:**
   ```
   node test-demo-user.js
   ```

3. **Submit Complaints:**
   The complaint submission process will now automatically handle demo user creation if needed.

## Troubleshooting

If you encounter issues:

1. **Check Database Permissions:**
   Ensure your Supabase connection has permissions to create users and execute RPC functions.

2. **Manual Function Deployment:**
   If the automated deployment fails, copy the SQL from `create_demo_user.sql` and execute it directly in the Supabase SQL editor.

3. **Validate User Creation:**
   Run the test script to verify the demo user can be created successfully.

4. **Check Foreign Key Constraints:**
   Ensure the `complaints` table has a proper foreign key constraint to the `users` table.

## Implementation Details

- **Error Handling:** Multiple fallback mechanisms ensure complaints can be submitted even if one method fails.
- **Logging:** Comprehensive logging helps diagnose any issues.
- **UUID Generation:** Proper UUID generation ensures valid IDs for database constraints.
