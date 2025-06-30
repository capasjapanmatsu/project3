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

// Sciener API configuration
const SCIENER_API_URL = Deno.env.get("SCIENER_API_URL") || "https://api.sciener.com";
const SCIENER_CLIENT_ID = Deno.env.get("SCIENER_CLIENT_ID") || "demo_client_id";
const SCIENER_CLIENT_SECRET = Deno.env.get("SCIENER_CLIENT_SECRET") || "demo_client_secret";

// Generate a PIN code for a smart lock
async function generatePinCode(
  userId: string,
  lockId: string,
  purpose: 'entry' | 'exit' = 'entry',
  expiryMinutes: number = 5,
  ticketType: string = 'subscription',
  reservationId: string | null = null
) {
  try {
    // Get the smart lock details
    const { data: lock, error: lockError } = await supabase
      .from("smart_locks")
      .select("*")
      .eq("lock_id", lockId)
      .single();
    
    if (lockError) throw lockError;
    
    if (!lock) {
      throw new Error("Smart lock not found");
    }
    
    // Check if PIN is enabled for this lock
    if (!lock.pin_enabled) {
      throw new Error("PIN access is not enabled for this lock");
    }
    
    // Check if user has access to this park (subscription, oneday, or reservation)
    const { data: accessData, error: accessError } = await supabase.rpc("check_user_park_access", {
      p_user_id: userId,
      p_lock_id: lockId
    });
    
    if (accessError) throw accessError;
    
    if (!accessData || !accessData.has_access) {
      throw new Error("You do not have access to this facility");
    }
    
    // Check for active entry (PIN reuse prevention)
    const { data: activeEntry, error: entryError } = await supabase
      .from("user_entry_exit_logs")
      .select("*")
      .eq("user_id", userId)
      .eq("lock_id", lockId)
      .eq("action", "entry")
      .is("exit_time", null)
      .order("pin_issued_at", { ascending: false })
      .limit(1);
    if (entryError) throw entryError;
    if (activeEntry && activeEntry.length > 0) {
      throw new Error("You already have an active PIN. Please exit before requesting a new one.");
    }
    
    // Generate a PIN using the database function (valid for 5 minutes)
    const { data: pinData, error: pinError } = await supabase.rpc("create_pin_for_lock", {
      p_lock_id: lockId,
      p_user_id: userId,
      p_purpose: purpose,
      p_expiry_minutes: expiryMinutes
    });
    
    if (pinError) throw pinError;
    
    // Get the PIN record
    const { data: pinRecord, error: recordError } = await supabase
      .from("smart_lock_pins")
      .select("*")
      .eq("lock_id", lockId)
      .eq("user_id", userId)
      .eq("purpose", purpose)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    
    if (recordError) throw recordError;
    
    // Log PIN issuance in user_entry_exit_logs
    const now = new Date();
    const expires = new Date(now.getTime() + expiryMinutes * 60000);
    await supabase.from("user_entry_exit_logs").insert({
      user_id: userId,
      park_id: lock.park_id,
      dog_ids: [], // fill as needed
      action: "entry",
      pin_code: pinRecord.pin_code,
      lock_id: lockId,
      pin_issued_at: now.toISOString(),
      pin_expires_at: expires.toISOString(),
      ticket_type: ticketType,
      reservation_id: reservationId
    });
    
    return {
      pin: pinRecord.pin_code,
      expires_at: pinRecord.expires_at,
      lock_id: lockId,
      purpose: purpose
    };
  } catch (error) {
    console.error("Error generating PIN code:", error);
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
    
    // Get the user ID from the authorization header
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "");
    
    // Verify the token and get the user
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error("Unauthorized");
    }
    
    // Extract parameters from the request
    const { lock_id, purpose = 'entry', expiry_minutes = 5, ticket_type = 'subscription', reservation_id = null } = requestData;
    
    // Validate required parameters
    if (!lock_id) {
      throw new Error("Missing required parameter: lock_id");
    }
    
    // Generate the PIN code (pass ticketType and reservationId)
    const result = await generatePinCode(user.id, lock_id, purpose, expiry_minutes, ticket_type, reservation_id);
    
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