import * as Location from 'expo-location';
import { Alert } from 'react-native';

/**
 * Enhanced Location Service with Privacy Levels
 * Supports exact coordinates and street-level accuracy
 */
class LocationService {
  constructor() {
    this.currentLocation = null;
    this.locationPermissionGranted = false;
    this.privacyLevels = {
      EXACT: 'exact',           // Level 1: Exact coordinates
      STREET: 'street',         // Level 2: Street-level accuracy
      AREA: 'area',             // Level 3: Neighborhood-level
      LANDMARK: 'landmark'      // Level 4: Landmark-based
    };
  }

  /**
   * Request location permissions with clear privacy explanation
   */
  async requestLocationPermission(urgencyLevel = 'general') {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        this.locationPermissionGranted = true;
        return true;
      } else {
        // Show privacy-aware explanation based on urgency
        const message = this.getPermissionMessage(urgencyLevel);
        Alert.alert('Location Permission', message);
        return false;
      }
    } catch (error) {
      console.error('Location permission error:', error);
      return false;
    }
  }

  /**
   * Get permission message based on complaint urgency
   */
  getPermissionMessage(urgencyLevel) {
    const messages = {
      'urgent': 'For urgent infrastructure issues (near hospitals/schools), we need exact location to prioritize emergency response.',
      'safety': 'For safety-related complaints, precise location helps connect you with the right emergency services.',
      'general': 'Location helps us route your complaint to the correct municipal office and calculate priority based on nearby facilities.',
      'privacy': 'We only use location to improve civic services. You can choose street-level accuracy instead of exact coordinates.'
    };
    
    return messages[urgencyLevel] || messages.general;
  }

  /**
   * Get location with specified privacy level
   */
  async getLocationWithPrivacy(privacyLevel = this.privacyLevels.STREET, complaintType = 'general') {
    try {
      const hasPermission = await this.requestLocationPermission(
        this.determineUrgencyLevel(complaintType)
      );
      
      if (!hasPermission) {
        throw new Error('Location permission required for complaint processing');
      }

      // Get high-accuracy location first
      const exactLocation = await this.getExactLocation();
      
      // Apply privacy level transformation
      const processedLocation = this.applyPrivacyLevel(exactLocation, privacyLevel);
      
      return processedLocation;
    } catch (error) {
      console.error('Location acquisition failed:', error);
      throw new Error(`Unable to get location: ${error.message}`);
    }
  }

  /**
   * Get exact GPS coordinates
   */
  async getExactLocation() {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
      maximumAge: 10000,
      timeout: 15000,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp,
      source: 'gps_exact',
      altitude: location.coords.altitude,
      heading: location.coords.heading,
      speed: location.coords.speed
    };
  }

  /**
   * Apply privacy level to exact coordinates
   */
  applyPrivacyLevel(exactLocation, privacyLevel) {
    const baseLocation = {
      ...exactLocation,
      privacyLevel,
      originalAccuracy: exactLocation.accuracy
    };

    switch (privacyLevel) {
      case this.privacyLevels.EXACT:
        // Level 1: Return exact coordinates (for urgent issues)
        return {
          ...baseLocation,
          precision: 'exact',
          radiusM: Math.round(exactLocation.accuracy || 5),
          description: 'Exact coordinates for urgent infrastructure issue'
        };

      case this.privacyLevels.STREET:
        // Level 2: Round to street-level accuracy (~10-50m)
        return {
          ...baseLocation,
          latitude: this.roundToStreetLevel(exactLocation.latitude),
          longitude: this.roundToStreetLevel(exactLocation.longitude),
          accuracy: 25, // Approximate street-level accuracy
          precision: 'street',
          radiusM: 25,
          description: 'Street-level accuracy for general complaints'
        };

      case this.privacyLevels.AREA:
        // Level 3: Round to neighborhood level (~100-200m)
        return {
          ...baseLocation,
          latitude: this.roundToAreaLevel(exactLocation.latitude),
          longitude: this.roundToAreaLevel(exactLocation.longitude),
          accuracy: 150,
          precision: 'area',
          radiusM: 150,
          description: 'Neighborhood-level for privacy protection'
        };

      default:
        return baseLocation;
    }
  }

  /**
   * Round coordinates to street-level precision
   */
  roundToStreetLevel(coordinate) {
    // Round to ~4 decimal places (about 10-25m accuracy)
    return Math.round(coordinate * 10000) / 10000;
  }

  /**
   * Round coordinates to area-level precision
   */
  roundToAreaLevel(coordinate) {
    // Round to ~3 decimal places (about 100-150m accuracy)
    return Math.round(coordinate * 1000) / 1000;
  }

  /**
   * Determine urgency level based on complaint type
   */
  determineUrgencyLevel(complaintType) {
    const urgentTypes = ['gas_leak', 'fire_hazard', 'electrical_danger', 'sewage_overflow'];
    const safetyTypes = ['pothole', 'broken_streetlight', 'traffic_signal'];
    
    if (urgentTypes.includes(complaintType)) {
      return 'urgent';
    } else if (safetyTypes.includes(complaintType)) {
      return 'safety';
    }
    return 'general';
  }

  /**
   * Get recommended privacy level for complaint type
   */
  getRecommendedPrivacyLevel(complaintType) {
    const exactCoordinateTypes = [
      'gas_leak', 'fire_hazard', 'electrical_danger', 'sewage_overflow',
      'water_main_break', 'structural_damage', 'hazardous_material'
    ];
    
    const streetLevelTypes = [
      'pothole', 'broken_streetlight', 'traffic_signal', 'road_damage',
      'garbage_collection', 'noise_complaint', 'illegal_parking'
    ];

    if (exactCoordinateTypes.includes(complaintType)) {
      return this.privacyLevels.EXACT;
    } else if (streetLevelTypes.includes(complaintType)) {
      return this.privacyLevels.STREET;
    }
    
    return this.privacyLevels.STREET; // Default to street level
  }

  /**
   * Validate location accuracy for complaint type
   */
  validateLocationAccuracy(location, complaintType) {
    const recommendedLevel = this.getRecommendedPrivacyLevel(complaintType);
    const maxAcceptableRadius = {
      [this.privacyLevels.EXACT]: 10,
      [this.privacyLevels.STREET]: 50,
      [this.privacyLevels.AREA]: 200
    };

    const isAccurate = location.radiusM <= maxAcceptableRadius[recommendedLevel];
    
    return {
      isValid: true,
      isAccurate,
      recommendedLevel,
      currentLevel: location.privacyLevel,
      message: isAccurate 
        ? 'Location accuracy is sufficient for this complaint type'
        : `Consider using ${recommendedLevel} precision for better service`
    };
  }

  /**
   * Get privacy level description for UI
   */
  getPrivacyLevelDescription(level) {
    const descriptions = {
      [this.privacyLevels.EXACT]: {
        title: 'Exact Location',
        description: 'Precise coordinates (±5-10m) for urgent infrastructure issues',
        icon: '📍',
        accuracy: 'Highest',
        usage: 'Emergency situations, critical infrastructure problems'
      },
      [this.privacyLevels.STREET]: {
        title: 'Street-Level',
        description: 'Street-level accuracy (±25m) for general civic complaints',
        icon: '🛣️',
        accuracy: 'High',
        usage: 'Most civic complaints, routine maintenance issues'
      },
      [this.privacyLevels.AREA]: {
        title: 'Neighborhood',
        description: 'Area-level location (±150m) for privacy protection',
        icon: '🏘️',
        accuracy: 'Medium',
        usage: 'Privacy-conscious reporting, general area issues'
      }
    };

    return descriptions[level] || descriptions[this.privacyLevels.STREET];
  }

  /**
   * Check if location is within service area (India)
   */
  isWithinServiceArea(location) {
    const indiaBounds = {
      north: 37.6,
      south: 6.4,
      east: 97.25,
      west: 68.1
    };

    return (
      location.latitude >= indiaBounds.south &&
      location.latitude <= indiaBounds.north &&
      location.longitude >= indiaBounds.west &&
      location.longitude <= indiaBounds.east
    );
  }
}

export default new LocationService();
