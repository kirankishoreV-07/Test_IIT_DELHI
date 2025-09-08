const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');
const LocationPriorityService = require('../services/LocationPriorityService');

// Initialize services
const locationPriorityService = new LocationPriorityService();

/**
 * Submit a new complaint with automatic location processing
 * POST /api/complaints/submit
 */
router.post('/submit', async (req, res) => {
  try {
    console.log('📝 New complaint submission:', req.body);
    
    const {
      title,
      description,
      category,
      imageUrl,
      imageValidation,
      locationData,
      userId = 'anonymous',
      userType = 'citizen'
    } = req.body;
    
    // Input validation
    if (!title || !description || !category || !locationData) {
      return res.status(400).json({
        success: false,
        error: 'Title, description, category, and location are required',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }
    
    // Calculate comprehensive priority score
    const priorityAnalysis = await calculateComprehensivePriority({
      imageValidation,
      locationData,
      category,
      description
    });
    
    // Create complaint record (simplified for demo - no database)
    const complaint = {
      id: `complaint_${Date.now()}`,
      title: title.trim(),
      description: description.trim(),
      category,
      status: 'submitted',
      priority_level: priorityAnalysis.priorityLevel,
      priority_score: priorityAnalysis.totalScore,
      
      // Location information
      latitude: locationData.latitude,
      longitude: locationData.longitude,
      location_accuracy: locationData.radiusM,
      privacy_level: locationData.privacyLevel,
      location_description: locationData.description,
      
      // Image information
      image_url: imageUrl,
      image_validated: imageValidation?.allowUpload || false,
      image_confidence: imageValidation?.confidence || 0,
      
      // Priority analysis
      location_priority_score: priorityAnalysis.locationScore,
      image_priority_score: priorityAnalysis.imageScore,
      total_priority_score: priorityAnalysis.totalScore,
      
      // User information
      user_id: userId,
      user_type: userType,
      
      // Metadata
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      processing_time_ms: priorityAnalysis.processingTime,
      facilities_nearby: priorityAnalysis.facilitiesCount || 0
    };
    
    console.log('✅ Complaint processed successfully:', complaint.id);
    
    // Prepare response
    const response = {
      success: true,
      complaint: {
        id: complaint.id,
        title: complaint.title,
        category: complaint.category,
        priorityLevel: complaint.priority_level,
        priorityScore: Math.round(complaint.total_priority_score * 100),
        status: complaint.status,
        submittedAt: complaint.created_at
      },
      priorityAnalysis: {
        totalScore: priorityAnalysis.totalScore,
        priorityLevel: priorityAnalysis.priorityLevel,
        breakdown: {
          locationScore: priorityAnalysis.locationScore,
          imageScore: priorityAnalysis.imageScore,
          facilitiesNearby: priorityAnalysis.facilitiesCount
        },
        reasoning: priorityAnalysis.reasoning
      },
      location: {
        privacyLevel: locationData.privacyLevel,
        accuracy: `±${locationData.radiusM}m`,
        description: locationData.description
      },
      nextSteps: generateNextSteps(priorityAnalysis.priorityLevel, complaint.category),
      metadata: {
        processingTime: priorityAnalysis.processingTime,
        timestamp: new Date().toISOString(),
        version: '2.1.0'
      }
    };
    
    res.status(201).json(response);
    
  } catch (error) {
    console.error('❌ Complaint submission error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit complaint',
      code: 'SUBMISSION_ERROR',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

/**
 * Calculate comprehensive priority score combining image and location analysis
 */
async function calculateComprehensivePriority({ imageValidation, locationData, category, description }) {
  const startTime = Date.now();
  
  try {
    // 1. Location-based priority (60% weight)
    let locationPriority = null;
    let locationScore = 0;
    
    if (locationData) {
      locationPriority = await locationPriorityService.calculateLocationPriority(
        locationData.latitude,
        locationData.longitude,
        category,
        {
          privacyLevel: locationData.privacyLevel,
          radiusM: locationData.radiusM,
          precision: locationData.precision,
          description: locationData.description
        }
      );
      locationScore = locationPriority.priorityScore || 0;
    }
    
    // 2. Image-based priority (40% weight)
    const imageScore = imageValidation?.data?.priorityScore || 0;
    
    // 3. Calculate weighted total score
    const totalScore = (locationScore * 0.6) + (imageScore * 0.4);
    
    // 4. Determine priority level
    let priorityLevel = 'LOW';
    if (totalScore >= 0.8) priorityLevel = 'CRITICAL';
    else if (totalScore >= 0.6) priorityLevel = 'HIGH';
    else if (totalScore >= 0.4) priorityLevel = 'MEDIUM';
    
    // 5. Generate reasoning
    const reasoning = generatePriorityReasoning({
      locationScore,
      imageScore,
      totalScore,
      priorityLevel,
      category,
      locationPriority,
      imageValidation
    });
    
    const processingTime = Date.now() - startTime;
    
    return {
      totalScore,
      priorityLevel,
      locationScore,
      imageScore,
      reasoning,
      facilitiesCount: locationPriority?.totalFacilities || 0,
      processingTime
    };
    
  } catch (error) {
    console.error('❌ Priority calculation error:', error);
    
    // Fallback priority based on complaint category
    const fallbackScore = getFallbackPriority(category);
    
    return {
      totalScore: fallbackScore,
      priorityLevel: fallbackScore >= 0.6 ? 'HIGH' : 'MEDIUM',
      locationScore: 0,
      imageScore: imageValidation?.data?.priorityScore || 0,
      reasoning: `Priority assigned based on complaint type (${category}). Location analysis unavailable.`,
      facilitiesCount: 0,
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * Generate priority reasoning explanation
 */
function generatePriorityReasoning({ locationScore, imageScore, totalScore, priorityLevel, category, locationPriority, imageValidation }) {
  let reasoning = `${priorityLevel} priority assigned. `;
  
  // Location component
  if (locationScore > 0) {
    reasoning += `Location analysis: ${(locationScore * 100).toFixed(1)}% `;
    if (locationPriority?.reasoning) {
      reasoning += `(${locationPriority.reasoning.substring(0, 100)}...) `;
    }
  }
  
  // Image component
  if (imageScore > 0) {
    reasoning += `Image validation: ${(imageScore * 100).toFixed(1)}% `;
    if (imageValidation?.allowUpload) {
      reasoning += `(Valid civic issue detected) `;
    }
  }
  
  // Overall assessment
  reasoning += `Total score: ${(totalScore * 100).toFixed(1)}%. `;
  
  // Category-specific notes
  const urgentCategories = ['gas_leak', 'fire_hazard', 'electrical_danger'];
  if (urgentCategories.includes(category)) {
    reasoning += `Urgent complaint type (${category}) flagged for immediate attention.`;
  }
  
  return reasoning;
}

/**
 * Generate next steps based on priority level
 */
function generateNextSteps(priorityLevel, category) {
  const baseSteps = [
    'Your complaint has been logged in our system',
    'You will receive updates via notifications',
    'Track your complaint status in the app'
  ];
  
  switch (priorityLevel) {
    case 'CRITICAL':
      return [
        '🚨 Emergency response team has been notified',
        '📞 You may receive a call within 2 hours for urgent issues',
        '⚡ Expected response: Within 2-4 hours',
        ...baseSteps
      ];
      
    case 'HIGH':
      return [
        '⚠️ Your complaint has been prioritized',
        '📋 Assigned to the appropriate department',
        '⏰ Expected response: Within 24 hours',
        ...baseSteps
      ];
      
    case 'MEDIUM':
      return [
        '📝 Your complaint is being processed',
        '🏢 Routed to the municipal office',
        '📅 Expected response: Within 72 hours',
        ...baseSteps
      ];
      
    default:
      return [
        '📋 Your complaint has been received',
        '🔄 Added to the maintenance queue',
        '📅 Expected response: Within 1 week',
        ...baseSteps
      ];
  }
}

/**
 * Get fallback priority for complaint categories when location analysis fails
 */
function getFallbackPriority(category) {
  const urgentTypes = ['gas_leak', 'fire_hazard', 'electrical_danger', 'sewage_overflow'];
  const highTypes = ['pothole', 'broken_streetlight', 'traffic_signal'];
  
  if (urgentTypes.includes(category)) return 0.8;
  if (highTypes.includes(category)) return 0.6;
  return 0.4;
}

// Legacy routes for existing functionality
router.get('/all', async (req, res) => {
  try {
    const supabase = req.app.get('supabase');
    if (!supabase) {
      return res.json({
        success: true,
        data: [],
        message: 'Demo mode - no database configured'
      });
    }
    
    const { data: complaints, error } = await supabase
      .from('complaints')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch complaints'
      });
    }

    res.json({
      success: true,
      data: complaints || []
    });
  } catch (error) {
    console.error('Fetch complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error'
    });
  }
});

router.post('/create', async (req, res) => {
  res.json({
    success: true,
    message: 'Legacy endpoint - use /submit for new complaint submission'
  });
});

module.exports = router;
