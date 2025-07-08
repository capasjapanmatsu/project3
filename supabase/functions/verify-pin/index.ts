import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

// CORS headers for all responses
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Handle preflight OPTIONS request
function handleCors(req: Request) {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders,
      status: 200,
    });
  }
  return null;
}

// Create a Supabase client
const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Verify a PIN code for a smart lock
async function verifyPinCode(
  lockId: string,
  pin: string,
  purpose: 'entry' | 'exit' = 'entry'
) {
  try {
    // Verify the PIN using the database function
    const { data: isValid, error: verifyError } = await supabase.rpc("verify_pin", {
      p_lock_id: lockId,
      p_pin: pin,
      p_purpose: purpose
    });
    
    if (verifyError) throw verifyError;
    
    if (!isValid) {
      throw new Error("Invalid PIN code");
    }
    
    // Get PIN details to check user
    const { data: pinData, error: pinError } = await supabase
      .from("smart_lock_pins")
      .select("user_id")
      .eq("lock_id", lockId)
      .eq("pin_code", pin)
      .eq("is_used", false)
      .single();
    
    if (pinError) throw pinError;
    
    // For entry, verify user has approved vaccine certifications
    if (purpose === 'entry') {
      const { data: dogsData, error: dogsError } = await supabase
        .from("dogs")
        .select(`
          id,
          vaccine_certifications!inner (
            status,
            rabies_expiry_date,
            combo_expiry_date
          )
        `)
        .eq("owner_id", pinData.user_id);
      
      if (dogsError) throw dogsError;
      
      // Check if user has at least one dog with approved and valid vaccines
      const hasApprovedDogs = dogsData.some(dog => {
        const cert = dog.vaccine_certifications[0];
        if (!cert || cert.status !== 'approved') return false;
        
        // Check vaccine expiry dates
        const now = new Date();
        const rabiesExpiry = cert.rabies_expiry_date ? new Date(cert.rabies_expiry_date) : null;
        const comboExpiry = cert.combo_expiry_date ? new Date(cert.combo_expiry_date) : null;
        
        return (!rabiesExpiry || rabiesExpiry >= now) && (!comboExpiry || comboExpiry >= now);
      });
      
      if (!hasApprovedDogs) {
        throw new Error("ワクチン接種証明書が承認されたワンちゃんがいません。マイページから証明書をアップロードして承認を受けてください。");
      }
    }
    
    // Get the park ID for this lock
    const { data: lock, error: lockError } = await supabase
      .from("smart_locks")
      .select("park_id")
      .eq("lock_id", lockId)
      .single();
    
    if (lockError) throw lockError;
    
    // Get the park occupancy
    const { data: occupancyData, error: occupancyError } = await supabase.rpc("get_park_occupancy", {
      p_park_id: lock.park_id
    });
    
    if (occupancyError) throw occupancyError;
    
    return {
      success: true,
      message: purpose === 'entry' ? "入場が記録されました" : "退場が記録されました",
      park_id: lock.park_id,
      occupancy: occupancyData[0]
    };
  } catch (error) {
    console.error("Error verifying PIN code:", error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight request
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  
  try {
    // Get the request body
    const requestData = await req.json();
    
    // Extract parameters from the request
    const { lock_id, pin, purpose = 'entry' } = requestData;
    
    // Validate required parameters
    if (!lock_id || !pin) {
      throw new Error("Missing required parameters: lock_id and pin");
    }
    
    // Verify the PIN code
    const result = await verifyPinCode(lock_id, pin, purpose);
    
    // Return the result
    return new Response(
      JSON.stringify(result),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "An error occurred",
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      }
    );
  }
});