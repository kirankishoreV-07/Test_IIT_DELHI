const axios = require('axios');
require('dotenv').config();

/**
 * Location Priority Service for CivicStack
 * Calculates priority scores based on proximity to critical infrastructure
 */
class LocationPriorityService {
  constructor() {
    this.apiKey = process.env.GOOGLE_PLACES_API_KEY;
    this.baseUrl = 'https://maps.googleapis.com/maps/api/place';
    
    if (!this.apiKey) {
      console.warn('⚠️ Google Places API key not found in environment variables');
    }
    
    // Critical facility types with weights and dynamic search radius
    this.facilityConfig = {
      hospital: { 
        weight: 0.9, 
        radius: 3000, // Max 3km for medical emergencies (will be adjusted by area type)
        searchTypes: ['hospital', 'doctor'],
        excludeKeywords: ['store', 'shop', 'mart', 'pharmacy', 'medical_store', 'transport', 'logistics', 'cargo', 'travel', 'bus'],
        includeKeywords: ['hospital', 'clinic', 'medical', 'health', 'emergency'],
        description: 'Medical facilities'
      },
      school: { 
        weight: 0.8, 
        radius: 2500, // Max 2.5km for educational areas
        searchTypes: ['school', 'university', 'primary_school'],
        excludeKeywords: ['store', 'shop'],
        includeKeywords: ['school', 'college', 'university', 'education'],
        description: 'Educational institutions'
      },
      police: { 
        weight: 0.85, 
        radius: 3000, // Max 3km for police response
        searchTypes: ['police'],
        excludeKeywords: [],
        includeKeywords: ['police', 'station', 'law'],
        description: 'Law enforcement'
      },
      fire_station: { 
        weight: 0.9, 
        radius: 3000, // Max 3km for emergency response
        searchTypes: ['fire_station'],
        excludeKeywords: [],
        includeKeywords: ['fire', 'emergency'],
        description: 'Emergency services'
      },
      transit_station: { 
        weight: 0.7, 
        radius: 2000, // Max 2km for public transport
        searchTypes: ['transit_station', 'bus_station', 'subway_station'],
        excludeKeywords: [],
        includeKeywords: ['station', 'bus', 'metro', 'transport'],
        description: 'Public transport'
      },
      government: { 
        weight: 0.75, 
        radius: 3000, // Max 3km for municipal services
        searchTypes: ['local_government_office', 'city_hall'],
        description: 'Government offices'
      },
      bank: { 
        weight: 0.6, 
        radius: 1000, // 1km - local banking services
        searchTypes: ['bank', 'atm'],
        description: 'Financial services'
      },
      pharmacy: { 
        weight: 0.7, 
        radius: 1500, // 1.5km - medical supplies access
        searchTypes: ['pharmacy', 'drugstore'],
        description: 'Medical supplies'
      }
    };
  }

  /**
   * Calculate comprehensive location priority score with privacy level support
   * @param {number} latitude - Complaint location latitude
   * @param {number} longitude - Complaint location longitude
   * @param {string} complaintType - Type of civic complaint (optional)
   * @param {Object} locationMeta - Location metadata including privacy level
   * @returns {Promise<Object>} Priority analysis results
   */
  async calculateLocationPriority(latitude, longitude, complaintType = 'general', locationMeta = {}) {
    try {
      console.log(`🔍 Analyzing location priority for: ${latitude}, ${longitude}`);
      console.log(`📊 Privacy Level: ${locationMeta.privacyLevel || 'not specified'}`);
      console.log(`📏 Location Accuracy: ±${locationMeta.radiusM || 'unknown'}m`);
      
      // Validate coordinates
      if (!this.isValidCoordinates(latitude, longitude)) {
        throw new Error('Invalid coordinates provided');
      }

      // Dynamic search radius based on area type detection
      const radiusInfo = await this.calculateSearchRadius(latitude, longitude, locationMeta);
      
      console.log(`🔍 Dynamic search radius calculated: ${radiusInfo.radius}m for area type: ${radiusInfo.areaType}`);
      console.log(`📊 Facility density probe found: ${radiusInfo.facilityDensity} facilities in 1km`);
      
      const facilityAnalysis = await this.analyzeFacilities(latitude, longitude, radiusInfo.radius);
      const densityBonus = this.calculateDensityBonus(facilityAnalysis);
      const proximityScore = this.calculateProximityScore(facilityAnalysis);
      const complaintMultiplier = this.getComplaintTypeMultiplier(complaintType, facilityAnalysis);
      const privacyAdjustment = this.getPrivacyLevelAdjustment(locationMeta.privacyLevel);
      
      const finalScore = Math.min(1.0, (proximityScore + densityBonus) * complaintMultiplier * privacyAdjustment);
      
      return {
        priorityScore: Math.round(finalScore * 100) / 100,
        priorityLevel: this.getPriorityLevel(finalScore),
        facilityAnalysis,
        densityBonus,
        proximityScore,
        complaintMultiplier,
        privacyAdjustment,
        searchRadius: radiusInfo.radius,
        areaType: radiusInfo.areaType,
        facilityDensity: radiusInfo.facilityDensity,
        locationMeta: {
          privacyLevel: locationMeta.privacyLevel || 'unknown',
          accuracy: locationMeta.radiusM || 'unknown',
          precision: locationMeta.precision || 'unknown'
        },
        criticalFacilities: this.extractCriticalFacilities(facilityAnalysis),
        recommendationReason: this.generateReasoningText(facilityAnalysis, finalScore, complaintType, locationMeta),
        coordinates: { latitude, longitude },
        complaintType
      };
    } catch (error) {
      console.error('❌ Location priority calculation failed:', error);
      return {
        priorityScore: 0.5,
        priorityLevel: 'MEDIUM',
        error: 'Unable to calculate location priority',
        fallbackReason: error.message || 'API service unavailable',
        coordinates: { latitude, longitude }
      };
    }
  }

  /**
   * Validate coordinates
   */
  isValidCoordinates(latitude, longitude) {
    return (
      typeof latitude === 'number' &&
      typeof longitude === 'number' &&
      latitude >= -90 && latitude <= 90 &&
      longitude >= -180 && longitude <= 180
    );
  }

  /**
   * Calculate search radius based on area type detection and location density
   */
  async calculateSearchRadius(latitude, longitude, locationMeta) {
    console.log('🔍 Detecting area type for dynamic radius calculation...');
    
    // Step 1: Detect area type using initial small radius probe
    const areaType = await this.detectAreaType(latitude, longitude);
    console.log(`📍 Area Type Detected: ${areaType.type} (${areaType.description})`);
    
    // Step 2: Base radius by area type
    const baseRadiusByArea = {
      'dense_urban': {
        base: 800,    // 0.8km - very dense cities
        max: 1500,    // 1.5km max
        description: 'Dense urban - shorter radius due to high facility density'
      },
      'urban': {
        base: 1200,   // 1.2km - regular cities  
        max: 2000,    // 2km max
        description: 'Urban - standard radius for city areas'
      },
      'suburban': {
        base: 2000,   // 2km - suburban areas
        max: 3500,    // 3.5km max
        description: 'Suburban - larger radius due to spread out facilities'
      },
      'rural': {
        base: 3500,   // 3.5km - rural areas
        max: 5000,    // 5km max
        description: 'Rural - maximum radius due to sparse facilities'
      },
      'unknown': {
        base: 1500,   // 1.5km - default
        max: 2500,    // 2.5km max
        description: 'Unknown area type - moderate radius'
      }
    };

    const config = baseRadiusByArea[areaType.type] || baseRadiusByArea.unknown;
    let radius = config.base;
    
    // Step 3: Adjust based on facility density
    if (areaType.facilityDensity < 10) {
      radius = Math.min(radius * 1.5, config.max); // Increase radius for low density
      console.log(`📈 Increased radius to ${radius}m due to low facility density (${areaType.facilityDensity} facilities)`);
    } else if (areaType.facilityDensity > 50) {
      radius = Math.max(radius * 0.7, 500); // Decrease radius for high density
      console.log(`📉 Decreased radius to ${radius}m due to high facility density (${areaType.facilityDensity} facilities)`);
    }
    
    // Step 4: Adjust based on location accuracy
    const privacyLevel = locationMeta.privacyLevel || 'unknown';
    const accuracy = locationMeta.radiusM || 0;
    
    if (accuracy > 100) {
      radius += Math.min(accuracy * 0.5, 500); // Add up to 500m for poor accuracy
    }
    
    console.log(`🎯 Final Search Radius: ${radius}m for ${areaType.type} area`);
    console.log(`   📊 Config: ${config.description}`);
    
    return {
      radius: Math.round(radius),
      areaType: areaType.type,
      facilityDensity: areaType.facilityDensity,
      config: config
    };
  }

  /**
   * Detect area type based on facility density probe
   */
  async detectAreaType(latitude, longitude) {
    try {
      console.log('🔍 Probing area with 1km radius to detect type...');
      
      // Use a small 1km radius to detect area characteristics
      const probeRadius = 1000;
      let totalFacilities = 0;
      let businessTypes = new Set();
      
      // Quick probe with key facility types
      const probeTypes = ['establishment', 'point_of_interest', 'store'];
      
      for (const type of probeTypes) {
        try {
          const facilities = await this.queryGooglePlaces(latitude, longitude, type, probeRadius);
          totalFacilities += facilities.length;
          
          // Analyze business types
          facilities.forEach(facility => {
            if (facility.types) {
              facility.types.forEach(t => businessTypes.add(t));
            }
          });
          
          await this.delay(300); // Rate limiting
        } catch (error) {
          console.warn(`⚠️ Probe error for ${type}:`, error.message);
        }
      }
      
      console.log(`📊 Probe Results: ${totalFacilities} facilities, ${businessTypes.size} business types`);
      
      // Classify area type based on facility density
      let areaType;
      if (totalFacilities >= 80) {
        areaType = 'dense_urban';
      } else if (totalFacilities >= 40) {
        areaType = 'urban';
      } else if (totalFacilities >= 15) {
        areaType = 'suburban';
      } else {
        areaType = 'rural';
      }
      
      // Additional classification based on business types
      const urbanIndicators = ['shopping_mall', 'bank', 'atm', 'hospital', 'school', 'government'];
      const urbanCount = urbanIndicators.filter(indicator => businessTypes.has(indicator)).length;
      
      if (urbanCount >= 4 && areaType === 'suburban') {
        areaType = 'urban'; // Upgrade to urban if many urban indicators
      }
      
      return {
        type: areaType,
        facilityDensity: totalFacilities,
        businessTypes: Array.from(businessTypes),
        description: this.getAreaDescription(areaType, totalFacilities)
      };
      
    } catch (error) {
      console.error('⚠️ Area type detection failed:', error.message);
      return {
        type: 'unknown',
        facilityDensity: 0,
        businessTypes: [],
        description: 'Area type detection failed - using default settings'
      };
    }
  }

  /**
   * Get human-readable area description
   */
  getAreaDescription(areaType, facilityCount) {
    const descriptions = {
      'dense_urban': `Dense urban area with ${facilityCount} facilities nearby - likely city center`,
      'urban': `Urban area with ${facilityCount} facilities - regular city district`,
      'suburban': `Suburban area with ${facilityCount} facilities - residential/commercial mix`,
      'rural': `Rural area with ${facilityCount} facilities - sparse infrastructure`,
      'unknown': `Unknown area type with ${facilityCount} facilities detected`
    };
    
    return descriptions[areaType] || descriptions.unknown;
  }

  /**
   * Legacy method - now calls the new dynamic method
   */
  calculateSearchRadius(locationMeta) {
    // This is now handled by the async version above
    // Keeping for backward compatibility
    const baseRadius = {
      exact: 1000,    // Exact coordinates - 1km search radius
      street: 1500,   // Street level - 1.5km search radius  
      area: 2000,     // Area level - 2km search radius
      unknown: 1500   // Default to street level (1.5km)
    };

    const privacyLevel = locationMeta.privacyLevel || 'unknown';
    return baseRadius[privacyLevel] || baseRadius.unknown;
  }

  /**
   * Get privacy level adjustment factor for scoring
   */
  getPrivacyLevelAdjustment(privacyLevel) {
    const adjustments = {
      exact: 1.0,     // No adjustment for exact coordinates
      street: 0.95,   // Slight reduction for street-level
      area: 0.90,     // Moderate reduction for area-level
      unknown: 0.95   // Default to street-level adjustment
    };

    return adjustments[privacyLevel] || adjustments.unknown;
  }

  /**
   * Analyze all facility types around the complaint location with dynamic radius
   */
  async analyzeFacilities(latitude, longitude, searchRadius = 1500) {
    const results = {};
    
    console.log(`🔍 Starting facility analysis for ${latitude}, ${longitude} with ${searchRadius}m radius`);
    
    for (const [facilityType, config] of Object.entries(this.facilityConfig)) {
      try {
        // Use dynamic search radius, but respect facility-specific limits
        const effectiveRadius = Math.min(searchRadius, config.radius);
        
        console.log(`   🏢 Searching for ${facilityType} within ${effectiveRadius}m...`);
        
        const facilities = await this.searchFacilitiesWithRetry(
          latitude, 
          longitude, 
          config.searchTypes, 
          effectiveRadius
        );
        
        console.log(`   ✅ Found ${facilities.length} ${facilityType} facilities`);
        if (facilities.length > 0) {
          console.log(`      Nearest: ${facilities[0].name} at ${facilities[0].distance}m`);
        }
        
        results[facilityType] = {
          count: facilities.length,
          facilities: facilities.slice(0, 5), // Keep top 5 nearest
          nearestDistance: facilities[0]?.distance || Infinity,
          weight: config.weight,
          score: this.calculateFacilityScore(facilities, config),
          description: config.description,
          searchRadius: effectiveRadius
        };
        
        // Add delay to respect API rate limits
        await this.delay(200);
        
      } catch (error) {
        console.error(`⚠️ Error analyzing ${facilityType}:`, error.message);
        results[facilityType] = { 
          count: 0, 
          facilities: [], 
          score: 0, 
          weight: config.weight,
          error: error.message,
          description: config.description
        };
      }
    }
    
    console.log(`📊 Facility analysis complete. Total facility types processed: ${Object.keys(results).length}`);
    return results;
  }

  /**
   * Search for facilities with retry mechanism
   */
  async searchFacilitiesWithRetry(latitude, longitude, types, radius, maxRetries = 2) {
    let lastError;
    
    for (const searchType of types) {
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const facilities = await this.queryGooglePlaces(latitude, longitude, searchType, radius);
          if (facilities.length > 0) {
            return facilities;
          }
        } catch (error) {
          lastError = error;
          if (attempt < maxRetries) {
            await this.delay(1000 * (attempt + 1)); // Exponential backoff
          }
        }
      }
    }
    
    if (lastError) throw lastError;
    return [];
  }

  /**
   * Query Google Places API with enhanced filtering
   */
  async queryGooglePlaces(latitude, longitude, type, radius) {
    if (!this.apiKey) {
      throw new Error('Google Places API key not configured');
    }

    const response = await axios.get(`${this.baseUrl}/nearbysearch/json`, {
      params: {
        location: `${latitude},${longitude}`,
        radius: radius,
        type: type,
        key: this.apiKey
      },
      timeout: 10000
    });

    if (response.data.status === 'OVER_QUERY_LIMIT') {
      throw new Error('API quota exceeded');
    }
    
    if (response.data.status === 'REQUEST_DENIED') {
      throw new Error('API request denied - check API key restrictions');
    }

    if (!response.data.results) {
      return [];
    }

    // Enhanced filtering based on facility type
    const facilityType = this.getFacilityTypeFromSearchType(type);
    const config = this.facilityConfig[facilityType];
    
    const filteredResults = response.data.results.filter(place => {
      const name = place.name.toLowerCase();
      const types = place.types || [];
      
      // Apply exclude keywords if configured
      if (config && config.excludeKeywords) {
        // Check for explicitly excluded terms in the name
        const hasExcluded = config.excludeKeywords.some(keyword => 
          name.includes(keyword.toLowerCase())
        );
        if (hasExcluded) {
          const excludedKeyword = config.excludeKeywords.find(k => name.includes(k.toLowerCase()));
          console.log(`❌ Excluded ${place.name} (contains excluded keyword: ${excludedKeyword})`);
          return false;
        }
        
        // Additional check for misclassified transportation services
        if (facilityType === 'hospital' || facilityType === 'school' || facilityType === 'government') {
          const transportWords = ['transport', 'logistics', 'cargo', 'travel', 'bus', 'taxi', 'auto'];
          if (transportWords.some(word => name.includes(word))) {
            console.log(`❌ Excluded ${place.name} (likely a transportation service, not a ${facilityType})`);
            return false;
          }
        }
      }
      
      // Apply include keywords if configured
      if (config && config.includeKeywords && config.includeKeywords.length > 0) {
        const hasIncluded = config.includeKeywords.some(keyword => 
          name.includes(keyword.toLowerCase()) || 
          types.some(t => t.includes(keyword.toLowerCase()))
        );
        if (!hasIncluded) {
          console.log(`❌ Excluded ${place.name} (missing required keywords)`);
          return false;
        }
      }
      
      return true;
    });

    return filteredResults.map(place => ({
      name: place.name,
      place_id: place.place_id,
      distance: this.calculateDistance(
        latitude, longitude,
        place.geometry.location.lat, place.geometry.location.lng
      ),
      rating: place.rating || 0,
      types: place.types || [],
      vicinity: place.vicinity || ''
    })).sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get facility type from Google Places search type
   */
  getFacilityTypeFromSearchType(searchType) {
    const typeMapping = {
      'hospital': 'hospital',
      'doctor': 'hospital',
      'health': 'hospital',
      'school': 'school',
      'university': 'school',
      'primary_school': 'school',
      'police': 'police',
      'fire_station': 'fire_station',
      'transit_station': 'transit_station',
      'bus_station': 'transit_station',
      'subway_station': 'transit_station',
      'local_government_office': 'government',
      'city_hall': 'government'
    };
    
    return typeMapping[searchType] || 'unknown';
  }

  /**
   * Calculate distance using Haversine formula
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c;
  }

  /**
   * Calculate comprehensive facility-specific score based on real data
   */
  calculateFacilityScore(facilities, config) {
    if (facilities.length === 0) return 0;

    const nearest = facilities[0];
    const maxDistance = config.radius;
    
    // Base distance score (closer = higher score)
    const distanceScore = Math.max(0, 1 - (nearest.distance / maxDistance));
    
    // Facility density bonus (more facilities = higher score)
    const densityBonus = Math.min(0.3, facilities.length * 0.05);
    
    // Facility importance multiplier (based on ratings, size, etc.)
    const importanceMultiplier = (typeof nearest.importance === 'number' && nearest.importance > 0) ? nearest.importance : 1.0;
    
    // Operational status bonus (if facility is currently open)
    const operationalBonus = nearest.isOpen === true ? 0.1 : 0;
    
    const baseScore = distanceScore + densityBonus + operationalBonus;
    const finalScore = baseScore * importanceMultiplier;
    
    // Debug logging for troubleshooting
    if (isNaN(finalScore)) {
      console.error(`🚨 NaN score detected for facility:`, {
        nearestName: nearest.name,
        distance: nearest.distance,
        maxDistance,
        distanceScore,
        densityBonus,
        importance: nearest.importance,
        importanceMultiplier,
        operationalBonus,
        baseScore,
        finalScore
      });
      return 0; // Return 0 instead of NaN
    }
    
    return Math.min(1.0, finalScore);
  }

  /**
   * Enhanced proximity score calculation with real facility analysis
   */
  calculateProximityScore(facilityAnalysis) {
    let totalScore = 0;
    let weightSum = 0;
    const facilityTypes = Object.keys(facilityAnalysis);
    
    console.log('📊 Calculating proximity score from facility analysis...');
    
    for (const [facilityType, analysis] of Object.entries(facilityAnalysis)) {
      if (analysis.score > 0) {
        const weightedScore = analysis.score * analysis.weight;
        totalScore += weightedScore;
        weightSum += analysis.weight;
        
        console.log(`   ${facilityType}: ${analysis.count} facilities, score: ${analysis.score.toFixed(3)}, nearest: ${analysis.nearestDistance}m`);
      }
    }
    
    // Calculate weighted average, but ensure some base score even with limited facilities
    const averageScore = weightSum > 0 ? totalScore / weightSum : 0;
    
    // Apply facility diversity bonus (having multiple types of critical facilities nearby)
    const diversityBonus = this.calculateFacilityDiversityBonus(facilityAnalysis);
    
    const finalProximityScore = Math.min(1.0, averageScore + diversityBonus);
    
    console.log(`📏 Total proximity score: ${finalProximityScore.toFixed(3)} (base: ${averageScore.toFixed(3)}, diversity bonus: ${diversityBonus.toFixed(3)})`);
    
    return finalProximityScore;
  }

  /**
   * Calculate facility diversity bonus
   */
  calculateFacilityDiversityBonus(facilityAnalysis) {
    const facilitiesWithScore = Object.values(facilityAnalysis).filter(f => f.score > 0);
    const diversityCount = facilitiesWithScore.length;
    
    // Bonus for having multiple types of critical facilities
    if (diversityCount >= 4) return 0.15;      // Many facility types
    if (diversityCount >= 3) return 0.10;      // Good variety
    if (diversityCount >= 2) return 0.05;      // Some variety
    return 0;                                  // Limited variety
  }

  /**
   * Enhanced density bonus calculation
   */
  calculateDensityBonus(facilityAnalysis) {
    const totalFacilities = Object.values(facilityAnalysis)
      .reduce((sum, analysis) => sum + analysis.count, 0);
    
    console.log(`🏘️ Total facilities found: ${totalFacilities}`);
    
    // Progressive density bonus thresholds
    if (totalFacilities >= 50) return 0.25;      // Very high density
    if (totalFacilities >= 30) return 0.20;      // High density  
    if (totalFacilities >= 20) return 0.15;      // Good density
    if (totalFacilities >= 10) return 0.10;      // Moderate density
    if (totalFacilities >= 5) return 0.05;       // Low density
    return 0;                                     // Very low density
  }

  /**
   * Assess facility importance level
   */
  assessFacilityImportance(place) {
    const criticalTypes = ['hospital', 'fire_station', 'police', 'emergency'];
    const highTypes = ['school', 'university', 'government'];
    
    if (place.types.some(type => criticalTypes.includes(type))) {
      return 1.3; // Critical facilities get 30% importance bonus
    }
    if (place.types.some(type => highTypes.includes(type))) {
      return 1.1; // High importance facilities get 10% bonus
    }
    return 1.0; // Normal facilities have no bonus
  }

  /**
   * Get complaint type multiplier for specific facility combinations
   */
  getComplaintTypeMultiplier(complaintType, facilityAnalysis) {
    const multipliers = {
      'pothole': {
        hospital: 1.3,
        school: 1.2,
        transit_station: 1.4
      },
      'sewage_overflow': {
        hospital: 1.5,
        school: 1.4,
        pharmacy: 1.3
      },
      'streetlight': {
        school: 1.2,
        police: 1.3,
        transit_station: 1.2
      },
      'water_leakage': {
        hospital: 1.3,
        government: 1.2
      },
      'garbage_dump': {
        hospital: 1.4,
        school: 1.3,
        pharmacy: 1.2
      }
    };

    let maxMultiplier = 1.0;
    
    if (multipliers[complaintType]) {
      Object.entries(multipliers[complaintType]).forEach(([facilityType, multiplier]) => {
        if (facilityAnalysis[facilityType]?.score > 0.5) {
          maxMultiplier = Math.max(maxMultiplier, multiplier);
        }
      });
    }

    return maxMultiplier;
  }

  /**
   * Extract critical facilities for reporting
   */
  extractCriticalFacilities(facilityAnalysis) {
    const critical = [];
    
    Object.entries(facilityAnalysis).forEach(([type, analysis]) => {
      if (analysis.facilities && analysis.facilities.length > 0) {
        const nearest = analysis.facilities[0];
        critical.push({
          type,
          name: nearest.name,
          distance: nearest.distance,
          importance: analysis.weight,
          description: analysis.description
        });
      }
    });
    
    return critical
      .sort((a, b) => b.importance - a.importance)
      .slice(0, 5);
  }

  /**
   * Generate human-readable reasoning with privacy level context
   */
  generateReasoningText(facilityAnalysis, finalScore, complaintType, locationMeta = {}) {
    const nearbyFacilities = Object.entries(facilityAnalysis)
      .filter(([_, analysis]) => analysis.count > 0)
      .sort((a, b) => b[1].score - a[1].score);
    
    if (nearbyFacilities.length === 0) {
      return "Remote location with minimal nearby infrastructure";
    }
    
    const topFacility = nearbyFacilities[0];
    const [facilityType, analysis] = topFacility;
    const nearest = analysis.facilities[0];
    
    let reason = `Located ${nearest.distance}m from ${analysis.description.toLowerCase()} (${nearest.name})`;
    
    if (nearbyFacilities.length > 1) {
      reason += ` and ${nearbyFacilities.length - 1} other facility type(s)`;
    }

    // Add complaint-specific reasoning
    if (complaintType !== 'general') {
      reason += `. ${complaintType} issue near critical infrastructure`;
    }

    // Add privacy level context
    if (locationMeta.privacyLevel) {
      const privacyContext = {
        exact: 'Exact location provided for precise emergency response',
        street: 'Street-level accuracy sufficient for municipal routing',
        area: 'Area-level location used while protecting privacy'
      };
      reason += `. ${privacyContext[locationMeta.privacyLevel] || ''}`;
    }
    
    if (finalScore >= 0.8) {
      reason += ". HIGH PRIORITY due to proximity to critical infrastructure.";
    } else if (finalScore >= 0.6) {
      reason += ". Medium-high priority due to important nearby facilities.";
    } else if (finalScore >= 0.4) {
      reason += ". Medium priority with moderate infrastructure proximity.";
    } else {
      reason += ". Lower priority in area with limited infrastructure.";
    }
    
    return reason;
  }

  /**
   * Convert score to priority level
   */
  getPriorityLevel(score) {
    if (score >= 0.8) return 'CRITICAL';
    if (score >= 0.6) return 'HIGH';
    if (score >= 0.4) return 'MEDIUM';
    if (score >= 0.2) return 'LOW';
    return 'MINIMAL';
  }

  /**
   * Utility delay function
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

module.exports = LocationPriorityService;
