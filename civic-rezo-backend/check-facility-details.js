/**
 * Check facility classification details
 * This script checks detailed facility information for the given coordinates
 */

const LocationPriorityService = require('./services/LocationPriorityService');

// Coordinates to test (11.0417482, 77.0427160)
const TEST_LATITUDE = 11.0417482;
const TEST_LONGITUDE = 77.0427160;

async function checkFacilityDetails() {
  try {
    console.log('Checking facility details for coordinates:', TEST_LATITUDE, TEST_LONGITUDE);
    
    // Initialize service
    const service = new LocationPriorityService();
    
    // Search for hospital facilities
    console.log('\nSearching for facilities classified as hospitals/medical...');
    const facilities = await service.queryGooglePlaces(
      TEST_LATITUDE, 
      TEST_LONGITUDE, 
      'hospital', 
      1500
    );
    
    // Display full details of all facilities
    console.log('\nFacilities classified as hospitals/medical:');
    console.log('------------------------------------------');
    
    facilities.forEach((f, i) => {
      console.log(`${i + 1}. ${f.name}`);
      console.log(`   Distance: ${Math.round(f.distance)}m`);
      console.log(`   Address: ${f.vicinity || 'No address'}`);
      console.log(`   Types: ${f.types ? f.types.join(', ') : 'No types'}`);
      console.log('');
    });
    
    // Check specifically for "Datta Krupa Transport"
    const dattaKrupa = facilities.find(f => f.name === 'Datta Krupa Transport');
    
    if (dattaKrupa) {
      console.log('\n🔍 FOCUS FACILITY: Datta Krupa Transport');
      console.log('------------------------------------------');
      console.log('Name:', dattaKrupa.name);
      console.log('Distance:', Math.round(dattaKrupa.distance), 'm');
      console.log('Address:', dattaKrupa.vicinity || 'No address');
      console.log('Types:', dattaKrupa.types ? dattaKrupa.types.join(', ') : 'No types');
      console.log('\nThis facility has been classified as a hospital/medical facility, but its name suggests it may be a transport service.');
    } else {
      console.log('\nFacility "Datta Krupa Transport" not found in the hospital category.');
    }
    
  } catch (error) {
    console.error('Error checking facility details:', error);
  }
}

// Run the check
checkFacilityDetails()
  .then(() => console.log('Check complete'))
  .catch(console.error);
