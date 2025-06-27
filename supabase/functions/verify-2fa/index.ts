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

// Verify 2FA code
async function verify2FA(userId: string, code: string) {
  try {
    // Get the 2FA code from the database
    const { data: twoFactorCode, error: codeError } = await supabase
      .from("two_factor_codes")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    
    if (codeError) throw codeError;
    
    if (!twoFactorCode) {
      throw new Error("2FA code not found");
    }
    
    // Check if the code has expired
    const expiresAt = new Date(twoFactorCode.expires_at);
    const now = new Date();
    
    if (now > expiresAt) {
      throw new Error("2FA code has expired");
    }
    
    // Check if the code has been used too many times
    if (twoFactorCode.attempts >= 3) {
      throw new Error("Too many attempts. Please request a new code.");
    }
    
    // Increment the attempts counter
    const { error: updateError } = await supabase
      .from("two_factor_codes")
      .update({ attempts: twoFactorCode.attempts + 1 })
      .eq("id", twoFactorCode.id);
    
    if (updateError) throw updateError;
    
    // Check if the code matches
    if (twoFactorCode.code !== code) {
      throw new Error("Invalid 2FA code");
    }
    
    // Create a trusted device token
    const token = crypto.randomUUID();
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30); // 30 days expiry
    
    const { error: deviceError } = await supabase
      .from("trusted_devices")
      .insert({
        user_id: userId,
        token,
        expires_at: expiryDate.toISOString(),
      });
    
    if (deviceError) throw deviceError;
    
    // Delete the used 2FA code
    await supabase
      .from("two_factor_codes")
      .delete()
      .eq("id", twoFactorCode.id);
    
    return {
      success: true,
      token,
    };
  } catch (error) {
    console.error("Error verifying 2FA:", error);
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
    const { userId, code } = requestData;
    
    // Validate required parameters
    if (!userId || !code) {
      throw new Error("Missing required parameters: userId and code");
    }
    
    // Verify that the user ID in the request matches the authenticated user
    if (userId !== user.id) {
      throw new Error("User ID mismatch");
    }
    
    // Verify the 2FA code
    const result = await verify2FA(userId, code);
    
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