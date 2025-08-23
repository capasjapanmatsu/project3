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
const supabaseUrl = Deno.env.get("SUPABASE_URL") || ""; // Reserved var is provided by platform
const supabaseServiceKey =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  Deno.env.get("SERVICE_ROLE_KEY") ||
  "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Environment variables
const FACILITY_AUTH_TOKEN = Deno.env.get("FACILITY_AUTH_TOKEN") || "demo_auth_token";

// Function to open a smart lock
async function openSmartLock(lockId: string, userId: string, authToken: string, inviteToken?: string) {
  try {
    // Validate the facility auth token
    if (authToken !== FACILITY_AUTH_TOKEN) {
      throw new Error("Invalid authentication token");
    }

    let hasAccess = false;

    // If invite token is provided, validate time window from reservation_invites
    if (inviteToken) {
      const { data: invite } = await supabase
        .from('reservation_invites')
        .select('park_id, start_time, end_time, revoked')
        .eq('token', inviteToken)
        .maybeSingle();
      if (invite && !invite.revoked) {
        const now = Date.now();
        const start = Date.parse(invite.start_time as any);
        const end = Date.parse(invite.end_time as any);
        hasAccess = now >= start && now <= end;
      }
    }

    if (!hasAccess) {
      // Fallback to normal access rules
      const { data: userAccess, error: accessError } = await supabase.rpc("check_user_park_access", {
        p_user_id: userId,
        p_lock_id: lockId
      });

      if (accessError) {
        console.error("Error checking user access:", accessError);
        throw new Error("Failed to verify user access");
      }

      hasAccess = !!(userAccess && (userAccess as any).has_access);
    }

    if (!hasAccess) {
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
      error_message: (error as any).message
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
    const { lock_id, user_id, auth_token, invite_token } = requestData;

    // Validate required parameters
    if (!lock_id || !user_id || !auth_token) {
      throw new Error("Missing required parameters: lock_id, user_id, and auth_token are required");
    }

    // Verify that the user_id in the request matches the authenticated user
    if (user_id !== user.id) {
      throw new Error("User ID mismatch");
    }

    // Open the smart lock
    const result = await openSmartLock(lock_id, user_id, auth_token, invite_token);

    // Best-effort log (minimal fields to avoid reference errors)
    try {
      await supabase
        .from('user_entry_exit_logs')
        .insert({
          user_id: user.id,
          lock_id: lock_id,
          action: 'entry',
          timestamp: new Date().toISOString()
        });
    } catch (logError) {
      console.error('Failed to log entry/exit action:', logError);
    }

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
        message: (error as any).message || "An error occurred",
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