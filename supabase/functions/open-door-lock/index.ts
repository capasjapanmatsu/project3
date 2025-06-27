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

// Smart lock API configuration
const LOCK_API_ENDPOINT = Deno.env.get("LOCK_API_ENDPOINT") || "https://api.smartlock.example.com";
const LOCK_API_KEY = Deno.env.get("LOCK_API_KEY") || "demo_api_key";
const FACILITY_AUTH_TOKEN = Deno.env.get("FACILITY_AUTH_TOKEN") || "demo_auth_token";

// Function to open a smart lock
async function openSmartLock(lockId: string, userId: string, authToken: string) {
  try {
    // Validate the facility auth token
    if (authToken !== FACILITY_AUTH_TOKEN) {
      throw new Error("Invalid authentication token");
    }

    // Check if the user has an active reservation or subscription
    const { data: userAccess, error: accessError } = await supabase.rpc("check_user_park_access", {
      p_user_id: userId,
      p_lock_id: lockId
    });

    if (accessError) {
      console.error("Error checking user access:", accessError);
      throw new Error("Failed to verify user access");
    }

    if (!userAccess || !userAccess.has_access) {
      throw new Error("User does not have access to this facility");
    }

    // In a real implementation, this would call the actual smart lock API
    // For demo purposes, we'll simulate a successful response
    const responseData = {
      status: "success",
      lock_id: lockId,
      action: "unlock",
      timestamp: new Date().toISOString()
    };

    // Log the successful lock opening
    await supabase.from("lock_access_logs").insert({
      user_id: userId,
      lock_id: lockId,
      action: "unlock",
      status: "success",
      timestamp: new Date().toISOString(),
      response_data: responseData
    });

    return {
      status: "success",
      message: "Lock opened successfully",
      lock_id: lockId,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error opening smart lock:", error);

    // Log the failed attempt
    await supabase.from("lock_access_logs").insert({
      user_id: userId,
      lock_id: lockId,
      action: "unlock",
      status: "error",
      timestamp: new Date().toISOString(),
      error_message: error.message
    });

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
    const { lock_id, user_id, timestamp, auth_token } = requestData;

    // Validate required parameters
    if (!lock_id || !user_id || !auth_token) {
      throw new Error("Missing required parameters: lock_id, user_id, and auth_token are required");
    }

    // Verify that the user_id in the request matches the authenticated user
    if (user_id !== user.id) {
      throw new Error("User ID mismatch");
    }

    // Open the smart lock
    const result = await openSmartLock(lock_id, user_id, auth_token);

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
        status: "error",
        message: error.message || "An error occurred",
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