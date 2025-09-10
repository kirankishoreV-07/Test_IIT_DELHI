# Civic Rezo Integration Testing Guide

This guide will help you test the integration of the complaint submission system with the demo user creation functionality.

## Prerequisites

Make sure you have the following set up:

1. Node.js installed
2. Supabase project with proper tables (`users` and `complaints`)
3. Backend dependencies installed (`npm install` in the civic-rezo-backend directory)

## Step 1: Deploy the SQL Function

First, deploy the SQL function that creates demo users:

```bash
cd civic-rezo-backend
node deploy-function.js
```

If the automated deployment succeeds, you'll see a success message. If it fails, the script will provide instructions for manual deployment.

## Step 2: Test Demo User Creation

Run the test script to verify that demo users can be created:

```bash
node test-demo-user.js
```

This script will:
- Check if a demo user already exists
- Test direct insertion of a demo user
- Test the RPC function for creating a demo user
- Test submitting a complaint with a demo user

Make sure all tests pass successfully.

## Step 3: Test Complaint Submission from Frontend

To test the complete integration from the frontend:

1. Start the backend server:
   ```bash
   node server.js
   ```

2. Start your frontend application (in a new terminal):
   ```bash
   cd ../civic-rezo-frontend
   npm start
   ```

3. Navigate to the complaint submission screen in your app

4. Submit a test complaint without logging in (this should use the demo user)

5. Check the backend logs to verify:
   - Demo user detection/creation is working
   - Complaint is successfully inserted
   - No foreign key errors occur

## Step 4: Verify Data in Supabase

After testing, check your Supabase dashboard:

1. Verify the demo user exists in the `users` table
2. Verify complaints are properly linked to the demo user
3. Check that all foreign key constraints are satisfied

## Troubleshooting

If you encounter issues:

### Foreign Key Constraint Errors

```
Error: insert or update on table 'complaints' violates foreign key constraint 'complaints_user_id_fkey'
```

This indicates the user_id doesn't exist in the users table. Possible causes:
- Demo user creation failed
- The SQL function isn't working properly
- Permissions issues with the Supabase connection

### Demo User Creation Failures

If demo user creation fails:
1. Check the Supabase permissions
2. Verify the users table schema matches the expected fields
3. Try running SQL queries directly in the Supabase SQL editor

### Missing RPC Function

If you see an error like:
```
function create_demo_user() does not exist
```

You need to deploy the SQL function manually:
1. Go to Supabase SQL Editor
2. Copy the content from `create_demo_user.sql`
3. Execute the SQL to create the function

## Conclusion

After completing these steps, your system should be able to:
1. Detect when a user is not logged in
2. Create or reuse a demo user
3. Submit complaints with valid user references
4. Avoid foreign key constraint errors

This ensures a smooth experience for users who want to submit complaints without creating an account.
