const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const googleMapsApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY;

if (!supabaseUrl || !supabaseServiceKey || !googleMapsApiKey) {
  console.error('Missing required environment variables');
  console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY), VITE_GOOGLE_MAPS_API_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function geocodeAddress(address) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${googleMapsApiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return {
        latitude: location.lat,
        longitude: location.lng,
        formatted_address: data.results[0].formatted_address
      };
    } else {
      console.error(`Geocoding failed for address: ${address}`, data.status);
      return null;
    }
  } catch (error) {
    console.error(`Error geocoding address: ${address}`, error);
    return null;
  }
}

async function geocodeDogParks() {
  const isTestMode = process.argv.includes('--test');
  
  console.log(`${isTestMode ? '[TEST MODE] ' : ''}Starting dog parks geocoding...`);
  
  // 座標がnullのdog_parksを取得
  const { data: parks, error } = await supabase
    .from('dog_parks')
    .select('id, name, address, latitude, longitude')
    .or('latitude.is.null,longitude.is.null');
  
  if (error) {
    console.error('Error fetching dog parks:', error);
    return;
  }
  
  console.log(`Found ${parks.length} dog parks without coordinates`);
  
  for (let i = 0; i < parks.length; i++) {
    const park = parks[i];
    console.log(`\nProcessing ${i + 1}/${parks.length}: ${park.name}`);
    console.log(`Address: ${park.address}`);
    
    if (!park.address) {
      console.log('  ⚠️  Skipping - no address');
      continue;
    }
    
    const coordinates = await geocodeAddress(park.address);
    
    if (coordinates) {
      console.log(`  ✅ Geocoded: ${coordinates.latitude}, ${coordinates.longitude}`);
      
      if (!isTestMode) {
        const { error: updateError } = await supabase
          .from('dog_parks')
          .update({
            latitude: coordinates.latitude,
            longitude: coordinates.longitude,
            updated_at: new Date().toISOString()
          })
          .eq('id', park.id);
        
        if (updateError) {
          console.error(`  ❌ Update failed:`, updateError);
        } else {
          console.log('  💾 Saved to database');
        }
      } else {
        console.log('  🧪 TEST MODE - not saving to database');
      }
    } else {
      console.log('  ❌ Geocoding failed');
    }
    
    // API制限を避けるため少し待機
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  
  console.log('\n✅ Geocoding complete!');
}

// スクリプト実行
geocodeDogParks().catch(console.error); 