# User Authentication Integration for Complaints

This implementation ensures that when a logged-in user submits a complaint, their user ID is properly used in the complaint record.

## Changes Made

### 1. Authentication Middleware

Created a new middleware in `middleware/auth.js` that:
- Extracts and validates JWT tokens from Authorization headers
- Verifies user existence in the database
- Attaches the authenticated user to the request object
- Allows requests to proceed even without authentication (for anonymous users)

### 2. Server Configuration

Updated `server.js` to:
- Import and register the authentication middleware
- Apply it globally to all routes

### 3. Complaint Submission Backend

Modified `routes/complaints.js` to:
- Check for the authenticated user from the middleware
- Use the authenticated user ID when available
- Fall back to the provided ID if it's a valid UUID
- Only create a demo user as a last resort

### 4. Frontend API Integration

Updated the frontend to:
- Use the `makeApiCall` utility that automatically includes auth tokens
- Remove hardcoded user IDs from submission data
- Let the backend determine the appropriate user ID

## How It Works

1. When a user logs in, their JWT token is stored in AsyncStorage
2. The `makeApiCall` function automatically includes this token in API requests
3. The backend middleware extracts and validates this token
4. The complaints endpoint uses the authenticated user's ID when creating complaints

## Testing

You can test this by:
1. Logging in as a user (e.g., arunnanthakumar5@gmail.com)
2. Submitting a complaint
3. Checking the backend logs to confirm the correct user ID is being used
4. Verifying in the database that the complaint is linked to your actual user account

## Benefits

- Complaints are now properly linked to the user who submitted them
- Users don't need to re-enter their information for each complaint
- The system still works for anonymous users via the demo user fallback
- Proper foreign key relationships are maintained in the database
