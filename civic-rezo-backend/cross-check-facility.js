/**
 * Cross-check facility classification
 * This script checks if a facility is classified under multiple categories
 */

const LocationPriorityService = require('./services/LocationPriorityService');

// Coordinates to test (11.0417482, 77.0427160)
const TEST_LATITUDE = 11.0417482;
const TEST_LONGITUDE = 77.0427160;
const FACILITY_NAME = 'Datta Krupa Transport';

async function crossCheckFacility() {
  try {
    console.log(`Cross-checking "${FACILITY_NAME}" across different facility types`);
    console.log('----------------------------------------------------------');
    
    // Initialize service
    const service = new LocationPriorityService();
    
    // Categories to check
    const categories = [
      'hospital', 
      'doctor', 
      'pharmacy',
      'school',
      'police',
      'transit_station',
      'bus_station', 
      'train_station',
      'taxi_stand',
      'car_rental',
      'travel_agency',
      'moving_company',
      'lodging',
      'store',
      'point_of_interest'
    ];
    
    // Check each category
    for (const category of categories) {
      console.log(`\nSearching "${category}" category...`);
      
      try {
        const facilities = await service.queryGooglePlaces(
          TEST_LATITUDE, 
          TEST_LONGITUDE, 
          category, 
          1500
        );
        
        // Check if our target facility is in this category
        const found = facilities.find(f => f.name === FACILITY_NAME);
        
        if (found) {
          console.log(`✅ FOUND in "${category}" category`);
          console.log(`   Distance: ${Math.round(found.distance)}m`);
          console.log(`   Address: ${found.vicinity || 'No address'}`);
          console.log(`   Types: ${found.types ? found.types.join(', ') : 'No types'}`);
        } else {
          console.log(`❌ NOT found in "${category}" category`);
        }
        
        // Short delay to prevent API rate limiting
        await new Promise(resolve => setTimeout(resolve, 300));
        
      } catch (error) {
        console.error(`Error searching ${category} category:`, error.message);
      }
    }
    
    console.log('\n----------------------------------------------------------');
    console.log('Recommendation: The facility "Datta Krupa Transport" appears to be');
    console.log('incorrectly classified as a hospital. This may be affecting priority');
    console.log('scoring since it places a transport service at the same importance');
    console.log('level as actual medical facilities.');
    console.log('----------------------------------------------------------');
    
  } catch (error) {
    console.error('Error in cross-checking facility:', error);
  }
}

// Run the cross-check
crossCheckFacility()
  .then(() => console.log('Cross-check complete'))
  .catch(console.error);
