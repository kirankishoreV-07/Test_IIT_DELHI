-- SQL script to add vote_count column to complaint_votes table if it doesn't exist
-- This allows us to track how many people have upvoted a specific complaint

-- First check if the column already exists
DO $$
BEGIN
    -- Check if vote_count column exists in complaint_votes table
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'complaint_votes'
        AND column_name = 'vote_count'
    ) THEN
        -- Add the vote_count column
        ALTER TABLE complaint_votes
        ADD COLUMN vote_count INTEGER DEFAULT 1;
        
        RAISE NOTICE 'Added vote_count column to complaint_votes table';
    ELSE
        RAISE NOTICE 'vote_count column already exists in complaint_votes table';
    END IF;
END
$$;
