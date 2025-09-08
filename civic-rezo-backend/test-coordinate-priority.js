/**
 * Priority Score Test for Coordinates
 * This script tests the priority scoring algorithm for a specific location
 * 
 * Usage: node test-coordinate-priority.js
 */

const LocationPriorityService = require('./services/LocationPriorityService');

// Coordinates to test (11.0417482, 77.0427160)
const TEST_LATITUDE = 11.0417482;
const TEST_LONGITUDE = 77.0427160;
const TEST_COMPLAINT_TYPE = 'general'; // can be changed to specific types like 'pothole', 'sewage_overflow', etc.

// Location metadata with privacy level
const locationData = {
  latitude: TEST_LATITUDE,
  longitude: TEST_LONGITUDE,
  radiusM: 50,           // 50 meter accuracy
  privacyLevel: 'exact', // exact location provided
  precision: 'high',     // high precision
  description: 'Coimbatore, Tamil Nadu'
};

async function runPriorityTest() {
  try {
    console.log('===============================');
    console.log('LOCATION PRIORITY SCORE TEST');
    console.log('===============================');
    console.log(`Testing coordinates: (${TEST_LATITUDE}, ${TEST_LONGITUDE})`);
    console.log(`Location description: ${locationData.description}`);
    console.log('---------------------------------------');

    // Initialize the location priority service
    const priorityService = new LocationPriorityService();

    console.log('Calculating priority score...');
    const result = await priorityService.calculateLocationPriority(
      TEST_LATITUDE,
      TEST_LONGITUDE,
      TEST_COMPLAINT_TYPE,
      locationData
    );

    // Display results
    console.log('\n🌟 PRIORITY SCORE RESULTS 🌟');
    console.log('---------------------------------------');
    console.log(`Priority Score: ${result.priorityScore * 100}/100`);
    console.log(`Priority Level: ${result.priorityLevel}`);
    console.log(`Area Type: ${result.areaType || 'Not detected'}`);
    console.log(`Facility Density: ${result.facilityDensity || 'Not analyzed'} facilities nearby`);
    console.log(`Search Radius: ${result.searchRadius || 'Not specified'}m`);

    // Display critical facilities nearby
    if (result.criticalFacilities && result.criticalFacilities.length > 0) {
      console.log('\n📍 CRITICAL FACILITIES NEARBY');
      console.log('---------------------------------------');
      result.criticalFacilities.forEach((facility, index) => {
        console.log(`${index + 1}. ${facility.name} (${facility.type})`);
        console.log(`   Distance: ${Math.round(facility.distance)}m`);
        console.log(`   Type: ${facility.description || facility.type}`);
      });
    }

    // Display score breakdown
    console.log('\n📊 SCORE BREAKDOWN');
    console.log('---------------------------------------');
    console.log(`Proximity Score: ${result.proximityScore?.toFixed(3) || 'N/A'}`);
    console.log(`Density Bonus: ${result.densityBonus?.toFixed(3) || 'N/A'}`);
    console.log(`Complaint Multiplier: ${result.complaintMultiplier?.toFixed(2) || 'N/A'}`);
    console.log(`Privacy Adjustment: ${result.privacyAdjustment?.toFixed(2) || 'N/A'}`);

    // Display reasoning
    console.log('\n💡 ANALYSIS REASONING');
    console.log('---------------------------------------');
    console.log(result.recommendationReason || result.reasoning || 'No reasoning provided');

    // Handle any errors
    if (result.error) {
      console.log('\n⚠️ ANALYSIS WARNINGS');
      console.log('---------------------------------------');
      console.log(`Error: ${result.error}`);
      console.log(`Reason: ${result.fallbackReason || 'Unknown'}`);
    }

    console.log('\n===============================');
    console.log('TEST COMPLETE');
    console.log('===============================');

  } catch (error) {
    console.error('❌ TEST FAILED');
    console.error(error);
  }
}

// Run the test
runPriorityTest()
  .catch(console.error);
