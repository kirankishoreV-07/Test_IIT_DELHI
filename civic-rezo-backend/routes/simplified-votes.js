const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');

// Vote on a complaint (upvote only for now - we'll simplify)
router.post('/', async (req, res) => {
  try {
    console.log('Processing vote request:', req.body);
    
    // Check for authenticated user
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Authentication required to vote on complaints' 
      });
    }

    const { complaintId } = req.body;
    const userId = req.user.id;
    
    if (!complaintId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameter: complaintId' 
      });
    }

    // First check if the complaint exists
    const { data: complaint, error: complaintError } = await supabase
      .from('complaints')
      .select('*')
      .eq('id', complaintId)
      .single();

    if (complaintError || !complaint) {
      console.error('Complaint not found:', complaintError || 'No data returned');
      return res.status(404).json({ 
        success: false, 
        message: 'Complaint not found' 
      });
    }

    // Check if user already voted for this complaint
    const { data: existingVote, error: voteError } = await supabase
      .from('complaint_votes')
      .select('*')
      .eq('complaint_id', complaintId)
      .eq('user_id', userId)
      .single();

    if (voteError && voteError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error checking existing vote:', voteError);
      return res.status(500).json({ 
        success: false, 
        message: 'Error checking vote status' 
      });
    }

    let result;

    // If the user hasn't voted yet, add an upvote
    if (!existingVote) {
      // Insert new vote as an upvote
      const { data: newVote, error: insertError } = await supabase
        .from('complaint_votes')
        .insert([
          { 
            complaint_id: complaintId, 
            user_id: userId,
            vote_type: 'upvote', // Hardcoded to ensure it matches the constraint
            created_at: new Date().toISOString()
          }
        ])
        .select();

      if (insertError) {
        console.error('Error adding vote:', insertError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to add vote',
          details: insertError.message
        });
      }

      result = newVote;
      console.log('Vote added successfully');
      
    } else {
      // If user already voted, remove their vote by deleting the record
      const { error: deleteError } = await supabase
        .from('complaint_votes')
        .delete()
        .eq('complaint_id', complaintId)
        .eq('user_id', userId);

      if (deleteError) {
        console.error('Error removing vote:', deleteError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to remove vote' 
        });
      }

      result = { removed: true };
      console.log('Vote removed successfully');
    }

    // Get updated vote count for the complaint
    const { data: voteData, error: countError } = await supabase
      .from('complaint_votes')
      .select('*')
      .eq('complaint_id', complaintId);

    const voteCount = countError ? 0 : voteData.length;

    // Return the updated vote information
    return res.status(200).json({
      success: true,
      message: existingVote ? 'Vote removed successfully' : 'Vote added successfully',
      data: {
        ...result,
        voteCount: voteCount
      }
    });
    
  } catch (error) {
    console.error('Vote processing error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while processing vote'
    });
  }
});

module.exports = router;
