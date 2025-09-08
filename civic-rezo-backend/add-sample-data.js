const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || 'https://edragfuoklcgdgtospuq.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVkcmFnZnVva2xjZ2RndG9zcHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NDE3MjMsImV4cCI6MjA3MjExNzcyM30.A58Ms03zTZC6J5OuhQbkkZQy-5uTxgu4vlLilrjPEwo';
const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to generate random coordinates near Coimbatore
function getRandomCoordinates() {
  // Coimbatore center: 11.0168, 76.9558
  const centerLat = 11.0168;
  const centerLng = 76.9558;
  // Generate random offset (±0.05 degrees, approximately 5km)
  const latOffset = (Math.random() - 0.5) * 0.1;
  const lngOffset = (Math.random() - 0.5) * 0.1;
  return {
    lat: parseFloat((centerLat + latOffset).toFixed(6)),
    lng: parseFloat((centerLng + lngOffset).toFixed(6))
  };
}

// Helper function to get a date N days ago
function getDaysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

// Helper function to get a random date between N and M days ago
function getRandomDate(minDaysAgo, maxDaysAgo) {
  const daysAgo = Math.floor(Math.random() * (maxDaysAgo - minDaysAgo + 1)) + minDaysAgo;
  return getDaysAgo(daysAgo);
}

// Sample areas in Coimbatore
const areas = [
  'RS Puram', 'Peelamedu', 'Gandhipuram', 'Saibaba Colony', 
  'Singanallur', 'Ukkadam', 'Ganapathy', 'Vadavalli',
  'Race Course', 'Town Hall', 'Hopes College', 'Ramanathapuram'
];

// Sample complaint categories
const complaintCategories = [
  'pothole', 'garbage_collection', 'broken_streetlight', 'water_leakage',
  'sewage_overflow', 'stray_dogs', 'illegal_construction', 'noise_complaint',
  'traffic_signal', 'public_toilet', 'tree_fallen', 'road_damage'
];

// Generate a realistic address
function getRandomAddress() {
  const streetTypes = ['Road', 'Street', 'Avenue', 'Junction', 'Circle', 'Main Road', 'Cross'];
  const streetNumber = Math.floor(Math.random() * 300) + 1;
  const streetType = streetTypes[Math.floor(Math.random() * streetTypes.length)];
  const area = areas[Math.floor(Math.random() * areas.length)];
  
  return `${streetNumber} ${area} ${streetType}, Coimbatore`;
}

// Generate 10 sample complaints with realistic data
async function addSampleData() {
  try {
    console.log('Adding 10 sample complaints to database...');
    
    // Clean existing data if needed (optional)
    // await supabase.from('complaints').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    
    const sampleComplaints = [];
    
    // Add pending complaints (4)
    for (let i = 0; i < 4; i++) {
      const coords = getRandomCoordinates();
      const category = complaintCategories[Math.floor(Math.random() * complaintCategories.length)];
      const priorityScore = Math.floor(Math.random() * 40) + 60; // 60-100
      const createdAt = getRandomDate(0, 7); // 0-7 days ago
      const address = getRandomAddress();
      
      sampleComplaints.push({
        title: `${category.replace('_', ' ')} issue reported`,
        description: `Citizen reported a ${category.replace('_', ' ')} problem that needs attention`,
        category: category,
        status: 'pending',
        priority_score: priorityScore,
        location_latitude: coords.lat,
        location_longitude: coords.lng,
        location_address: address,
        created_at: createdAt
      });
    }
    
    // Add in_progress complaints (3)
    for (let i = 0; i < 3; i++) {
      const coords = getRandomCoordinates();
      const category = complaintCategories[Math.floor(Math.random() * complaintCategories.length)];
      const priorityScore = Math.floor(Math.random() * 40) + 60; // 60-100
      const createdAt = getRandomDate(3, 14); // 3-14 days ago
      const address = getRandomAddress();
      
      sampleComplaints.push({
        title: `${category.replace('_', ' ')} issue being addressed`,
        description: `Maintenance team is working on this ${category.replace('_', ' ')} issue`,
        category: category,
        status: 'in_progress',
        priority_score: priorityScore,
        location_latitude: coords.lat,
        location_longitude: coords.lng,
        location_address: address,
        created_at: createdAt
      });
    }
    
    // Add resolved complaints (3)
    for (let i = 0; i < 3; i++) {
      const coords = getRandomCoordinates();
      const category = complaintCategories[Math.floor(Math.random() * complaintCategories.length)];
      const priorityScore = Math.floor(Math.random() * 40) + 60; // 60-100
      const createdAt = getRandomDate(10, 30); // 10-30 days ago
      const resolvedAt = getRandomDate(0, 7); // 0-7 days ago
      const address = getRandomAddress();
      
      sampleComplaints.push({
        title: `${category.replace('_', ' ')} issue resolved`,
        description: `This ${category.replace('_', ' ')} issue has been successfully resolved`,
        category: category,
        status: 'resolved',
        priority_score: priorityScore,
        location_latitude: coords.lat,
        location_longitude: coords.lng,
        location_address: address,
        created_at: createdAt,
        resolved_at: resolvedAt
      });
    }
    
    // Insert all complaints into database
    const { data, error } = await supabase
      .from('complaints')
      .insert(sampleComplaints)
      .select();
      
    if (error) {
      console.log('❌ Error inserting data:', error.message);
    } else {
      console.log(`✅ Successfully added ${data.length} sample complaints to database`);
      console.log('Sample complaint IDs:');
      data.forEach((complaint, index) => {
        console.log(`${index + 1}. ${complaint.id} - ${complaint.title} (${complaint.status})`);
      });
    }
  } catch (err) {
    console.log('❌ Error:', err.message);
  }
}

// Execute the function
addSampleData();
