# Complaint Updates and Votes Integration

This implementation extends the complaint submission process to automatically:
1. Create an entry in the `complaint_updates` table to track the initial status
2. Create an entry in the `complaint_votes` table with a vote_count of 1 for the new complaint

## Implementation Details

### 1. Complaint Updates

When a complaint is submitted, we automatically create an entry in the `complaint_updates` table with:
- `complaint_id`: The ID of the newly created complaint
- `updated_by_id`: The ID of the user who submitted the complaint
- `old_status`: null (as it's a new complaint)
- `new_status`: "pending" (the initial status)
- `update_notes`: "Complaint submitted"
- `created_at`: Current timestamp

This provides a history of the complaint from the moment it was created. When an admin later updates the complaint status, a new entry will be created in this table with the old status, new status, and any notes.

### 2. Complaint Votes

We also automatically create an entry in the `complaint_votes` table with:
- `complaint_id`: The ID of the newly created complaint
- `user_id`: The ID of the user who submitted the complaint
- `vote_type`: "upvote" (the creator automatically upvotes their own complaint)
- `vote_count`: 1 (starting vote count)
- `created_at`: Current timestamp

If the `vote_count` column doesn't exist in your database, we've included an SQL script to add it.

## Added Files

1. **add-vote-count-column.sql**: SQL script to add the vote_count column to the complaint_votes table
2. **deploy-vote-count-column.js**: Script to deploy the SQL to Supabase
3. **test-complaint-updates-votes.js**: Test script to verify the integration

## How to Deploy

1. First, add the vote_count column to your database:
   ```
   node deploy-vote-count-column.js
   ```

2. Test the integration:
   ```
   node test-complaint-updates-votes.js
   ```

3. Start the server normally:
   ```
   npm start
   ```

## Testing the Integration

You can test this integration by:
1. Submitting a new complaint through the app
2. Checking the backend logs to confirm updates and votes are being created
3. Querying the database to verify the entries:

```sql
-- Check complaint updates
SELECT * FROM complaint_updates WHERE complaint_id = 'your-complaint-id';

-- Check complaint votes
SELECT * FROM complaint_votes WHERE complaint_id = 'your-complaint-id';
```

## Admin Dashboard Integration

When an admin updates a complaint status in the admin dashboard, a new entry should be created in the `complaint_updates` table with:
- `old_status`: The previous status
- `new_status`: The new status
- `update_notes`: Any notes provided by the admin
- `updated_by_id`: The admin's user ID

This provides a complete history of all status changes for audit and transparency purposes.
